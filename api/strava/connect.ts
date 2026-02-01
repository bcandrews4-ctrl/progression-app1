import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';

// Vercel serverless functions can access env vars with or without VITE_ prefix
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaRedirectUri = process.env.STRAVA_REDIRECT_URI;

// APP_BASE_URL is the single source of truth for post-auth redirects
const appBaseUrl = process.env.APP_BASE_URL || 'https://hybrid-house-journal.tech';

if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaRedirectUri) {
  console.error('Missing required environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseServiceKey: !!supabaseServiceKey,
    stravaClientId: !!stravaClientId,
    stravaRedirectUri: !!stravaRedirectUri,
  });
}

console.log('Strava connect: Using redirect_uri from env:', stravaRedirectUri);
console.log('Strava connect: Using appBaseUrl for post-auth redirects:', appBaseUrl);

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey || !stravaClientId || !stravaRedirectUri || !supabase) {
    console.error('Strava connect: Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Get auth token from query param or Authorization header
    let token = req.query.token as string | undefined;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
      }
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate secure state token (CSRF protection)
    const state = randomBytes(32).toString('hex');
    
    // Store state in a short-lived way (we'll verify it in callback)
    // For simplicity, we'll encode user_id in state and verify in callback
    // In production, you might want to use Redis or similar
    const stateWithUserId = `${user.id}:${state}`;
    const encodedState = Buffer.from(stateWithUserId).toString('base64url');

    // Build Strava authorization URL
    // Use STRAVA_REDIRECT_URI from env only - do not derive from request
    const params = new URLSearchParams({
      client_id: stravaClientId!,
      redirect_uri: stravaRedirectUri!,
      response_type: 'code',
      scope: 'read,activity:read',
      state: encodedState,
      approval_prompt: 'force',
    });

    const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    
    console.log('Strava connect: Redirecting to Strava with redirect_uri:', stravaRedirectUri);

    return res.redirect(302, authUrl);
  } catch (error: any) {
    console.error('Strava connect error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
