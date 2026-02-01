# Strava Integration Setup Guide

This document outlines the steps to complete the Strava integration setup.

## 1. Supabase Database Migration

Run the SQL migration in Supabase:

1. Go to your Supabase Dashboard → SQL Editor
2. Open `supabase/strava-migration.sql`
3. Copy and paste the entire contents
4. Run the migration

This creates:
- `strava_connections` table (stores OAuth tokens and connection info)
- `strava_activities` table (stores imported activities)
- RLS policies for security

## 2. Strava App Registration

1. Go to https://www.strava.com/settings/api
2. Click "Create App"
3. Fill in:
   - **Application Name**: Your app name
   - **Category**: Training
   - **Website**: Your app URL (e.g., https://your-app.vercel.app)
   - **Authorization Callback Domain**: `your-app.vercel.app` (without https://)
4. Save and note:
   - **Client ID**
   - **Client Secret**

## 3. Vercel Environment Variables

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

### Required Variables:

1. **STRAVA_CLIENT_ID**
   - Value: Your Strava Client ID
   - Environments: Production, Preview, Development

2. **STRAVA_CLIENT_SECRET**
   - Value: Your Strava Client Secret
   - Environments: Production, Preview, Development

3. **STRAVA_REDIRECT_URI**
   - Value: `https://your-app.vercel.app/api/strava/callback`
   - Environments: Production, Preview, Development
   - **Important**: Must match exactly what you set in Strava app settings

4. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service role key (from Supabase Dashboard → Settings → API)
   - Environments: Production, Preview, Development
   - **Important**: This is different from the anon key - it's the service role key that bypasses RLS

5. **VITE_APP_URL** (optional, for local dev)
   - Value: `http://localhost:3000` (for local) or your production URL
   - Environments: Development

### Existing Variables (should already be set):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4. API Routes

The following API routes are created in `/api/strava/`:

- **GET `/api/strava/connect`**: Initiates OAuth flow
- **GET `/api/strava/callback`**: Handles OAuth callback
- **POST `/api/strava/sync`**: Syncs activities from Strava

## 5. Features Implemented

### Profile Tab
- **Connect Strava** button (when not connected)
- **Connected state** showing athlete name and last sync time
- **Sync now** button to manually trigger sync
- **Disconnect** button (keeps imported activities)

### Journal Integration
- Strava activities appear in:
  - **All** tab (all activities)
  - **Running** tab (Run activities)
  - **Cardio** tab (Workout, Ride, Rowing, etc.)
- Activities show:
  - Activity name or type
  - Date and time
  - Distance/pace for runs
  - Calories/time for cardio

### Overview Totals
- Workouts count includes Strava activities
- Time includes Strava `moving_time`
- Active calories includes Strava calories

## 6. Type Mapping

Strava activity types are mapped to journal categories:

**Running:**
- `Run`

**Cardio:**
- `Workout`, `Crossfit`, `Rowing`, `Ride`, `Bike`, `Cycling`
- `Elliptical`, `StairStepper`, `WeightTraining`
- `Swim`, `Hike`, `Walk`, `VirtualRide`, `EBikeRide`
- All other types default to Cardio

## 7. Testing

1. **Connect Flow:**
   - Go to Profile tab
   - Click "Connect Strava"
   - Authorize in Strava
   - Should redirect back to Profile with success

2. **Sync Flow:**
   - Click "Sync now"
   - Should import activities
   - Check Journal → All to see imported activities

3. **Disconnect:**
   - Click "Disconnect"
   - Connection removed but activities remain

## 8. Troubleshooting

### "Unauthorized" errors
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify user is logged in

### "Strava not connected" errors
- Check that connection was saved in `strava_connections` table
- Verify RLS policies allow user to read their own connection

### Activities not appearing
- Check `strava_activities` table for imported data
- Verify RLS policies allow user to read their own activities
- Check browser console for errors

### Rate limiting
- Strava has rate limits (600 requests per 15 minutes)
- If you hit limits, wait and try again
- The sync function handles 429 errors gracefully

## 9. Security Notes

- All OAuth tokens are stored server-side only
- Tokens are encrypted in Supabase
- RLS policies ensure users can only access their own data
- Service role key should NEVER be exposed to client
- Token refresh happens automatically when needed

## 10. Next Steps (Optional Enhancements)

- Add toast notifications for sync success/failure
- Add activity detail view when clicking Strava activities
- Add automatic background sync
- Add sync history/log
- Add activity filtering/search
