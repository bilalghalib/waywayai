# ⚡ Quick Start - Get Your App Live in 30 Minutes!

Ready to deploy WayWay AI to production? Follow this guide step-by-step.

---

## 🎯 Goal

By the end of this guide, you'll have:
- ✅ Live app at `https://your-app.vercel.app`
- ✅ Supabase database with all tables
- ✅ Ready to add features and scale

**Time Required:** ~30 minutes

---

## 📋 What You Need

- GitHub account
- Vercel account (free) - [Sign up](https://vercel.com/signup)
- Supabase account (free) - [Sign up](https://supabase.com)
- 30 minutes of time

---

## Step 1: Supabase Setup (10 min)

### 1.1 Create Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - Name: `waywayai`
   - Database Password: *Create a strong password* (save it!)
   - Region: *Choose closest to you*
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### 1.2 Run Database Migration

Open terminal in your project:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
# Find YOUR_PROJECT_REF in Supabase dashboard URL

# Push the database schema
supabase db push
```

✅ **Done!** Your database now has:
- Artists table
- Drawing sessions table
- Reference images library
- Charades game tables
- And more!

### 1.3 Create Storage Buckets

In Supabase dashboard:

1. Click **Storage** (left sidebar)
2. Click **"New bucket"** and create these:

| Name | Public? | Max Size |
|------|---------|----------|
| drawings | No | 5 MB |
| reference-images | Yes | 10 MB |
| avatars | Yes | 2 MB |
| gifs | Yes | 20 MB |

### 1.4 Get Your API Keys

1. Supabase → **Settings** → **API**
2. Copy these 2 values:
   - `Project URL` (e.g., https://xyz.supabase.co)
   - `anon public` key (starts with `eyJ...`)

**Keep these for Step 2!**

---

## Step 2: Vercel Deployment (10 min)

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Deploy

```bash
# From your project directory
vercel

# Answer the prompts:
# - Set up and deploy? → Yes
# - Which scope? → Your account
# - Link to existing project? → No
# - Project name? → waywayai
# - Directory? → ./
# - Override settings? → No
```

Wait ~2 minutes for deployment...

🎉 **Your app is live!** (at a preview URL like `waywayai-abc123.vercel.app`)

### 2.3 Add Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `waywayai` project
3. Click **Settings** → **Environment Variables**
4. Add these (use your Supabase values from Step 1.4):

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://YOUR_PROJECT.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJ... (your anon key)

Name: NODE_ENV
Value: production
```

5. Click **"Save"** for each

### 2.4 Deploy to Production

```bash
# Deploy to production domain
vercel --prod
```

🚀 **Your app is now live at:**
`https://waywayai.vercel.app`

---

## Step 3: Test Everything (5 min)

### 3.1 Test Drawing

1. Visit your Vercel URL
2. Draw something on the canvas
3. Check browser console (F12) - should see no errors

### 3.2 Test Database (When auth is added)

Once you add authentication:
1. Sign up with email
2. Draw something
3. Click "Save"
4. Check Supabase → **Table Editor** → `drawing_sessions`
   - Should see your drawing!

---

## Step 4: What's Next? (5 min)

### Choose Your Path:

**🎮 Build a Game**
Start with **Drawing Charades** (easiest):
- Read `MORE_GAME_IDEAS.md` #6
- 2-3 weeks to build
- Real-time multiplayer
- Viral potential

**🎨 Add Features**
- Authentication (Google/GitHub)
- Reference image library
- User profiles
- Achievements

**📈 Go Viral**
- Build **Handwriting Personality Quiz**
- Super shareable
- Quick to build (1 week)
- Drives user acquisition

### Recommended Order:

1. **Week 1:** Add authentication
2. **Week 2:** Build Drawing Charades MVP
3. **Week 3:** Polish + launch
4. **Week 4:** Handwriting quiz for growth

---

## 🆘 Troubleshooting

### "Database connection failed"

```bash
# Check Supabase status
# Dashboard should show green circle

# Re-verify environment variables in Vercel
# Make sure they match Supabase values
```

### "Deployment failed"

```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing env vars
# - Syntax errors
```

### "Canvas not working"

- Check browser console for errors
- Try Chrome (best compatibility)
- Check if JavaScript is enabled

---

## 📚 Learn More

- **Full deployment guide:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Development guide:** [DEVELOPMENT.md](DEVELOPMENT.md)
- **Game ideas:** [MORE_GAME_IDEAS.md](MORE_GAME_IDEAS.md)
- **Strategy:** [STRATEGY.md](STRATEGY.md)

---

## ✅ Checklist

- [ ] Supabase project created
- [ ] Database migration run
- [ ] Storage buckets created
- [ ] Vercel account set up
- [ ] App deployed to Vercel
- [ ] Environment variables added
- [ ] Production deployment done
- [ ] Tested drawing functionality

**All done?** 🎉

Share your deployment:
```
I just deployed WayWay AI! 🎨
Check it out: https://your-app.vercel.app
```

---

**Need help?** Check the detailed guides:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [DEVELOPMENT.md](DEVELOPMENT.md) - Local development
- [STRATEGY.md](STRATEGY.md) - Product vision

Let's build something amazing! 🚀
