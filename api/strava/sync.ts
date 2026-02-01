import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless functions can access env vars with or without VITE_ prefix
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaClientSecret) {
  console.error('Missing required environment variables in sync');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface StravaActivity {
  id: number;
  type: string;
  name: string;
  start_date: string;
  timezone?: string;
  moving_time: number;
  elapsed_time: number;
  distance?: number;
  calories?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  max_speed?: number;
  total_elevation_gain?: number;
  [key: string]: any;
}

/**
 * Get valid Strava access token, refreshing if needed
 */
async function getValidStravaAccessToken(userId: string): Promise<string> {
  // Load connection
  const { data: connection, error: fetchError } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError || !connection) {
    throw new Error('Strava not connected');
  }

  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = 300; // Refresh if expires within 5 minutes

  // Check if token needs refresh
  if (connection.expires_at < (now + bufferSeconds)) {
    // Refresh token
    const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Token refresh error:', errorText);
      throw new Error('Failed to refresh Strava token');
    }

    const refreshData = await refreshResponse.json();
    const {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt,
    } = refreshData;

    // Update connection
    const { error: updateError } = await supabase
      .from('strava_connections')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
      throw new Error('Failed to update Strava connection');
    }

    return newAccessToken;
  }

  return connection.access_token;
}

/**
 * Fetch activities from Strava with pagination
 */
async function fetchStravaActivities(
  accessToken: string,
  after?: number
): Promise<StravaActivity[]> {
  const perPage = 50;
  const maxActivities = 200;
  const activities: StravaActivity[] = [];
  let page = 1;

  while (activities.length < maxActivities) {
    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString(),
    });
    if (after) {
      params.append('after', after.toString());
    }

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Strava API error:', errorText);
      throw new Error(`Strava API error: ${response.status}`);
    }

    const pageActivities: StravaActivity[] = await response.json();
    
    if (pageActivities.length === 0) {
      break;
    }

    activities.push(...pageActivities);
    page++;

    // If we got fewer than per_page, we're done
    if (pageActivities.length < perPage) {
      break;
    }
  }

  return activities.slice(0, maxActivities);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaClientSecret || !supabase) {
    console.error('Strava sync: Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Get auth token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get valid access token (refresh if needed)
    let accessToken: string;
    try {
      accessToken = await getValidStravaAccessToken(user.id);
    } catch (error: any) {
      if (error.message === 'Strava not connected') {
        return res.status(400).json({ error: 'Strava not connected' });
      }
      throw error;
    }

    // Get last sync time
    const { data: connection } = await supabase
      .from('strava_connections')
      .select('last_sync_at')
      .eq('user_id', user.id)
      .single();

    // Determine after timestamp (epoch seconds)
    let after: number | undefined;
    if (connection?.last_sync_at) {
      after = Math.floor(new Date(connection.last_sync_at).getTime() / 1000);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      after = Math.floor(thirtyDaysAgo.getTime() / 1000);
    }

    // Fetch activities
    let activities: StravaActivity[];
    try {
      activities = await fetchStravaActivities(accessToken, after);
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        return res.status(429).json({ 
          error: 'Rate limit reached',
          message: 'Strava rate limit reached. Please try again later.',
        });
      }
      throw error;
    }

    // Upsert activities
    let importedCount = 0;
    let updatedCount = 0;

    for (const activity of activities) {
      const activityData = {
        id: activity.id,
        user_id: user.id,
        type: activity.type,
        name: activity.name || activity.type,
        start_date: new Date(activity.start_date).toISOString(),
        timezone: activity.timezone || null,
        moving_time: activity.moving_time,
        elapsed_time: activity.elapsed_time,
        distance_m: activity.distance || null,
        calories: activity.calories || null,
        average_heartrate: activity.average_heartrate || null,
        max_heartrate: activity.max_heartrate || null,
        average_speed: activity.average_speed || null,
        max_speed: activity.max_speed || null,
        total_elevation_gain: activity.total_elevation_gain || null,
        source: 'strava',
        raw: activity,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('strava_activities')
        .select('id')
        .eq('id', activity.id)
        .single();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('strava_activities')
          .update(activityData)
          .eq('id', activity.id);

        if (!updateError) {
          updatedCount++;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('strava_activities')
          .insert(activityData);

        if (!insertError) {
          importedCount++;
        }
      }
    }

    // Update last_sync_at
    await supabase
      .from('strava_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return res.status(200).json({
      success: true,
      importedCount,
      updatedCount,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Strava sync error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to sync Strava activities',
    });
  }
}
