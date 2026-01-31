# Vercel Environment Variables Setup

## Issue
The app is showing an error about "Supabase publishable key detected" because the environment variables are either:
1. Not set in Vercel
2. Set incorrectly (using publishable key instead of anon key)

## Solution

### Step 1: Get Your Supabase Credentials
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Under **Project API keys**, find:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public** key (starts with `eyJ...` - this is a JWT token)

### Step 2: Add Environment Variables in Vercel
1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: Your Supabase Project URL (from Step 1)
   - Environment: Production, Preview, Development (select all)
   - Click **Save**

   **Variable 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Your Supabase anon/public key (from Step 1)
   - Environment: Production, Preview, Development (select all)
   - Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the **three dots** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (1-2 minutes)

## Important Notes

- **DO NOT** use the "publishable" key (starts with `sb_publishable_`)
- **DO** use the "anon/public" key (starts with `eyJ...`)
- Make sure both variables are set for **all environments** (Production, Preview, Development)
- After adding variables, you **must redeploy** for them to take effect

## Verification

After redeploying, the error should be gone and you should be able to:
- Create new accounts
- Log in with existing accounts
- See proper error messages (not the publishable key error)
