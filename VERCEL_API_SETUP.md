# Vercel API Routes Setup

## Structure

The Strava API routes are located at:
- `/api/strava/connect.ts` - OAuth initiation
- `/api/strava/callback.ts` - OAuth callback handler  
- `/api/strava/sync.ts` - Activity sync endpoint

## Deployment

Vercel automatically detects and deploys serverless functions in the `/api` directory. No additional configuration is needed.

## Environment Variables Required

Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

1. **VITE_SUPABASE_URL** or **SUPABASE_URL**
   - Your Supabase project URL

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Service role key (bypasses RLS)
   - Get from Supabase Dashboard → Settings → API

3. **STRAVA_CLIENT_ID**
   - From Strava app settings

4. **STRAVA_CLIENT_SECRET**
   - From Strava app settings

5. **STRAVA_REDIRECT_URI**
   - Must match exactly: `https://your-app.vercel.app/api/strava/callback`
   - Also set this in Strava app settings

## Testing

After deployment, test the endpoints:

1. **Connect endpoint:**
   ```
   GET /api/strava/connect?token=<user_access_token>
   ```
   Should redirect to Strava authorization page

2. **Callback endpoint:**
   ```
   GET /api/strava/callback?code=<code>&state=<state>
   ```
   Called automatically by Strava after authorization

3. **Sync endpoint:**
   ```
   POST /api/strava/sync
   Authorization: Bearer <user_access_token>
   ```
   Should return sync results

## Troubleshooting

### 404 Errors

If you get 404 errors:
1. Verify files are in `/api/strava/` at repository root
2. Check that `@vercel/node` is in `package.json` dependencies
3. Redeploy on Vercel after adding files
4. Check Vercel function logs for errors

### Environment Variable Issues

If functions fail with "Missing environment variables":
1. Verify all env vars are set in Vercel
2. Make sure they're set for the correct environment (Production/Preview/Development)
3. Redeploy after adding env vars

### Type Errors

If TypeScript errors occur:
1. Ensure `@vercel/node` is installed: `npm install @vercel/node`
2. Functions use `import type { VercelRequest, VercelResponse } from '@vercel/node'`
3. Each function exports `export default async function handler(...)`

## Function Structure

Each function follows this pattern:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handler logic
}
```

## Notes

- Functions run in Node.js runtime (not browser)
- Cannot import client-side code from `src/`
- Environment variables are available via `process.env`
- Functions have access to full Node.js APIs (crypto, fetch, etc.)
