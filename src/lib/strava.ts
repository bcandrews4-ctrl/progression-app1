import { supabase } from './supabase';

export interface StravaConnection {
  user_id: string;
  athlete_id: number;
  athlete_name: string | null;
  last_sync_at: string | null;
  connected_at: string;
}

export interface StravaActivity {
  id: number;
  type: string;
  name: string | null;
  start_date: string;
  timezone: string | null;
  moving_time: number;
  elapsed_time: number;
  distance_m: number | null;
  calories: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_speed: number | null;
  max_speed: number | null;
  total_elevation_gain: number | null;
  source: string;
  raw: any;
}

/**
 * Map Strava activity type to our journal categories
 */
export function mapStravaTypeToCategory(type: string): 'Running' | 'Cardio' | null {
  const normalizedType = type.toLowerCase();
  
  // Running activities
  if (normalizedType === 'run') {
    return 'Running';
  }
  
  // Cardio activities
  const cardioTypes = [
    'workout',
    'crossfit',
    'rowing',
    'ride',
    'bike',
    'cycling',
    'elliptical',
    'stairstepper',
    'weighttraining',
    'swim',
    'hike',
    'walk',
    'virtualride',
    'ebikeride',
  ];
  
  if (cardioTypes.includes(normalizedType)) {
    return 'Cardio';
  }
  
  // Default to Cardio for unknown types
  return 'Cardio';
}

/**
 * Fetch Strava connection status
 */
export async function fetchStravaConnection(): Promise<StravaConnection | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('strava_connections')
    .select('user_id, athlete_id, athlete_name, last_sync_at, connected_at')
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Connect to Strava (redirects to OAuth)
 */
export async function connectStrava(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const token = session.access_token;
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const connectUrl = `${apiUrl}/api/strava/connect?token=${encodeURIComponent(token)}`;

  // Redirect to connect endpoint
  window.location.href = connectUrl;
}

/**
 * Sync Strava activities
 */
export async function syncStrava(): Promise<{ importedCount: number; updatedCount: number; lastSyncAt: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const token = session.access_token;
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const syncUrl = `${apiUrl}/api/strava/sync`;

  const response = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to sync Strava activities');
  }

  return await response.json();
}

/**
 * Disconnect Strava
 */
export async function disconnectStrava(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('strava_connections')
    .delete()
    .eq('user_id', session.user.id);

  if (error) throw error;
}

/**
 * Fetch Strava activities for user
 */
export async function fetchStravaActivities(): Promise<StravaActivity[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('strava_activities')
    .select('*')
    .eq('user_id', session.user.id)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching Strava activities:', error);
    return [];
  }

  return data || [];
}
