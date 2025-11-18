# 🚀 Deployment Guide - WayWay AI

Complete guide to deploying WayWay AI to production using Vercel and Supabase.

---

## 📋 Prerequisites

- [Node.js 18+](https://nodejs.org/) installed
- [Git](https://git-scm.com/) installed
- [GitHub](https://github.com/) account
- [Vercel](https://vercel.com/) account (free tier is fine)
- [Supabase](https://supabase.com/) account (free tier is fine)

---

## 1️⃣ Supabase Setup (10 minutes)

### Create Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name:** waywayai
   - **Database Password:** (save this!)
   - **Region:** Choose closest to your users
4. Wait ~2 minutes for setup

### Run Database Migration

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-id
```

4. Run migration:
```bash
supabase db push
```

### Set Up Storage Buckets

1. In Supabase Dashboard → **Storage**
2. Create these buckets:

| Bucket Name | Public? | Max File Size |
|------------|---------|---------------|
| `drawings` | No | 5 MB |
| `reference-images` | Yes | 10 MB |
| `avatars` | Yes | 2 MB |
| `gifs` | Yes | 20 MB |

3. Set bucket policies (click each bucket → Policies):

**drawings bucket:**
```sql
-- Allow users to read their own drawings
CREATE POLICY "Users can view own drawings"
ON storage.objects FOR SELECT
USING (bucket_id = 'drawings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to upload drawings
CREATE POLICY "Users can upload drawings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'drawings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**reference-images bucket:**
```sql
-- Anyone can view
CREATE POLICY "Anyone can view references"
ON storage.objects FOR SELECT
USING (bucket_id = 'reference-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reference-images' AND auth.role() = 'authenticated');
```

### Get API Keys

1. In Supabase Dashboard → **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **KEEP SECRET!**

3. Save them for later

---

## 2️⃣ Vercel Setup (5 minutes)

### Install Vercel CLI

```bash
npm install -g vercel
```

### Login to Vercel

```bash
vercel login
```

### Deploy from Local

```bash
# First deployment
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - What's your project's name? waywayai
# - In which directory is your code? ./
# - Override settings? No
```

### Set Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ... (your anon key)
SUPABASE_SERVICE_ROLE_KEY = eyJ... (your service role key)
NODE_ENV = production
```

4. Click "Save"

### Deploy to Production

```bash
vercel --prod
```

🎉 Your app is now live at: `https://waywayai.vercel.app`

---

## 3️⃣ Configure Authentication (Optional)

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable OAuth
3. Create credentials → OAuth 2.0 Client ID
4. Add authorized redirect URI:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret

6. In Supabase Dashboard → **Authentication** → **Providers** → **Google**:
   - Enable Google
   - Paste Client ID and Secret
   - Save

### GitHub OAuth

1. Go to [GitHub Settings → Developer Settings](https://github.com/settings/developers)
2. New OAuth App
3. Fill in:
   - **Homepage URL:** `https://waywayai.vercel.app`
   - **Authorization callback URL:** `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret

5. In Supabase → **Authentication** → **Providers** → **GitHub**:
   - Enable GitHub
   - Paste Client ID and Secret
   - Save

---

## 4️⃣ Testing Your Deployment

### Test Database Connection

```bash
# Install dependencies
npm install

# Create test user
npx supabase db test
```

### Test Drawing Upload

1. Visit your Vercel URL
2. Sign up / log in
3. Draw something
4. Click "Save"
5. Check Supabase Dashboard → **Table Editor** → `drawing_sessions`
   - Should see your drawing data!

### Test Storage

1. After saving drawing, check Supabase → **Storage** → `drawings`
2. Should see uploaded files

---

## 5️⃣ Custom Domain (Optional)

### Add Domain to Vercel

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add domain: `waywayai.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (~5 minutes)

### Update Supabase Redirect URLs

1. Supabase → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `https://waywayai.com`
   - `https://www.waywayai.com`

---

## 6️⃣ Monitoring & Analytics

### Vercel Analytics

1. Vercel Dashboard → Your Project → **Analytics**
2. Enable Vercel Analytics (free tier: 100k events/month)

### Supabase Monitoring

1. Supabase → **Database** → **Logs**
2. Monitor queries, errors, performance

### Sentry (Error Tracking)

```bash
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Follow wizard, then add to Vercel env vars:
```
NEXT_PUBLIC_SENTRY_DSN = https://...
SENTRY_AUTH_TOKEN = ...
```

---

## 7️⃣ CI/CD Pipeline

### Automatic Deployments

Vercel automatically deploys on every git push!

**main branch** → Production
**feature branches** → Preview deployments

### GitHub Actions (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx supabase db test
```

---

## 8️⃣ Performance Optimization

### Enable Vercel Edge Functions

Move API routes to edge for 10x faster response:

```javascript
// app/api/drawings/route.ts
export const runtime = 'edge';
```

### Supabase Connection Pooling

For high traffic, enable Supavisor pooling:

1. Supabase → **Settings** → **Database**
2. Enable "Connection Pooling"
3. Use pooled connection string in env vars

### CDN for Static Assets

Vercel automatically handles this! Your JS/CSS/images are globally distributed.

---

## 9️⃣ Backup & Security

### Database Backups

Supabase automatically backs up daily (free tier: 7 days retention)

Manual backup:
```bash
supabase db dump > backup.sql
```

### Secrets Management

**NEVER commit .env files!**

Use Vercel's environment variables for all secrets.

### Rate Limiting

Add to Vercel edge function:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

---

## 🔟 Cost Estimates

### Free Tier Limits

**Vercel Free:**
- 100 GB bandwidth/month
- 100 GB-hours serverless function execution
- Unlimited projects & deployments

**Supabase Free:**
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 2 GB bandwidth

### When to Upgrade

Upgrade when you hit:
- 10,000+ monthly users → Vercel Pro ($20/month)
- 1GB+ database → Supabase Pro ($25/month)

---

## 🚨 Troubleshooting

### "Database connection failed"

- Check Supabase is running (green status in dashboard)
- Verify env vars are set in Vercel
- Confirm IP allowlist (should be 0.0.0.0/0 for public access)

### "CORS errors"

Add to Supabase → **Settings** → **API** → **CORS**:
```
https://waywayai.vercel.app
https://waywayai.com
```

### "Build fails on Vercel"

Check build logs:
1. Vercel Dashboard → Deployments → Click failed build
2. View logs
3. Common issues:
   - Missing env vars
   - TypeScript errors
   - Missing dependencies

---

## 📚 Next Steps

- [ ] Set up custom domain
- [ ] Enable analytics
- [ ] Configure OAuth providers
- [ ] Add error monitoring (Sentry)
- [ ] Set up staging environment
- [ ] Create backup schedule

---

## 🆘 Support

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Community Discord:** [Join WayWay AI Discord](#)

---

**Deployed successfully?** Share your project:
```
My WayWay AI is live! 🎨
https://waywayai.vercel.app
```

Happy deploying! 🚀
