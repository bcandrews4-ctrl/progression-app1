import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless functions can access env vars with or without VITE_ prefix
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
const stravaRedirectUri = process.env.STRAVA_REDIRECT_URI;

// APP_BASE_URL is the single source of truth for post-auth redirects
// Always use production domain, never derive from VERCEL_URL or request headers
const appBaseUrl = process.env.APP_BASE_URL || 'https://hybrid-house-journal.tech';

if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaClientSecret || !stravaRedirectUri) {
  console.error('Missing required environment variables in callback');
}

console.log('Strava callback: Using appBaseUrl for redirects:', appBaseUrl);

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
    return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_config_error`);
  }

  try {
    const { code, state, error } = req.query;

    console.log('Strava callback: Received params', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error,
      appBaseUrl 
    });

    if (error) {
      console.log('Strava callback: OAuth error from Strava:', error);
      return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_denied`);
    }

    if (!code || !state) {
      console.log('Strava callback: Missing code or state param');
      return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_invalid`);
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const decodedState = Buffer.from(state as string, 'base64url').toString('utf-8');
      const [uid, ...rest] = decodedState.split(':');
      userId = uid;
      console.log('Strava callback: Decoded user_id from state');
    } catch (e) {
      console.error('Strava callback: Failed to decode state', e);
      return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_invalid_state`);
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
      console.error('Strava callback: Token exchange error:', errorData);
      return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_token_exchange`);
    }
    
    console.log('Strava callback: Token exchange successful');

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
      console.error('Strava callback: Database error:', dbError);
      return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_db_error`);
    }

    console.log('Strava callback: Connection saved successfully, redirecting to app');
    return res.redirect(`${appBaseUrl}/?tab=profile&connected=strava`);
  } catch (error: any) {
    console.error('Strava callback: Unexpected error:', error);
    return res.redirect(`${appBaseUrl}/?tab=profile&error=strava_callback_error`);
  }
}
