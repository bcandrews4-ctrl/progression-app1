import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless functions can access env vars with or without VITE_ prefix
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
const stravaRedirectUri = process.env.STRAVA_REDIRECT_URI;
// Get app base URL from Vercel env vars
const appBaseUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaClientSecret || !stravaRedirectUri) {
  console.error('Missing required environment variables in callback');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaClientSecret || !stravaRedirectUri || !supabase) {
    console.error('Strava callback: Missing environment variables');
    return res.redirect(`${appBaseUrl}/profile?error=strava_config_error`);
  }

  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${appBaseUrl}/profile?error=strava_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${appBaseUrl}/profile?error=strava_invalid`);
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const decodedState = Buffer.from(state as string, 'base64url').toString('utf-8');
      const [uid, ...rest] = decodedState.split(':');
      userId = uid;
    } catch (e) {
      return res.redirect(`${appBaseUrl}/profile?error=strava_invalid_state`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        code: code as string,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Strava token exchange error:', errorData);
      return res.redirect(`${appBaseUrl}/profile?error=strava_token_exchange`);
    }

    const tokenData = await tokenResponse.json();
    const {
      access_token,
      refresh_token,
      expires_at,
      athlete,
    } = tokenData;

    // Store connection in Supabase
    const { error: dbError } = await supabase
      .from('strava_connections')
      .upsert({
        user_id: userId,
        athlete_id: athlete.id,
        athlete_name: athlete.firstname && athlete.lastname 
          ? `${athlete.firstname} ${athlete.lastname}`.trim()
          : athlete.username || null,
        access_token,
        refresh_token,
        expires_at,
        scope: 'read,activity:read',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.redirect(`${appBaseUrl}/profile?error=strava_db_error`);
    }

    return res.redirect(`${appBaseUrl}/profile?connected=strava`);
  } catch (error: any) {
    console.error('Strava callback error:', error);
    return res.redirect(`${appBaseUrl}/profile?error=strava_callback_error`);
  }
}
