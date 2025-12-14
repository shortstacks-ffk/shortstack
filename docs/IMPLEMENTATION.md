# Implementation Checklist

## Phase 1: Neon Database Setup ⏱️ 2-3 hours

- [ ] Install Neon CLI
  ```bash
  npm install -g neonctl
  ```

- [ ] Login to Neon
  ```bash
  neonctl auth
  ```

- [ ] Create staging branch
  ```bash
  neonctl branches create --name staging --parent main
  ```

- [ ] Get staging connection string
  ```bash
  neonctl connection-string staging
  ```

- [ ] Save connection string securely
  - Add to password manager
  - Do NOT commit to Git

- [ ] Test staging database connection
  ```bash
  # Update .env.local with staging DATABASE_URL temporarily
  npx prisma studio
  # Verify you can connect
  # Revert .env.local
  ```

## Phase 2: Vercel Configuration ⏱️ 2-3 hours

### Step 1: Vercel Project Setup

- [ ] Login to Vercel dashboard
- [ ] Select ShortStack project
- [ ] Go to Settings → Git
- [ ] Configure branches:
  - [ ] Production branch: `main`
  - [ ] Enable preview deployments for `staging`

### Step 2: Production Environment Variables

Go to: Settings → Environment Variables → Production

- [ ] `DATABASE_URL` = [Neon production connection string]
- [ ] `NEXTAUTH_URL` = https://shortstack.vercel.app
- [ ] `NEXTAUTH_SECRET` = [Generate new: `openssl rand -base64 32`]
- [ ] `GOOGLE_CLIENT_ID` = [From Google Cloud Console]
- [ ] `GOOGLE_CLIENT_SECRET` = [From Google Cloud Console]
- [ ] `GOOGLE_DRIVE_CLIENT_ID` = [Your Drive client ID]
- [ ] `GOOGLE_DRIVE_CLIENT_SECRET` = [Your Drive secret]
- [ ] `GOOGLE_DRIVE_REDIRECT_URI` = https://shortstack.vercel.app/api/auth/callback/google
- [ ] `GOOGLE_DRIVE_REFRESH_TOKEN` = [Your refresh token]
- [ ] `GOOGLE_DRIVE_FOLDER_ID` = [Your folder ID]
- [ ] `NODE_ENV` = production

### Step 3: Preview Environment Variables

Go to: Settings → Environment Variables → Preview

- [ ] `DATABASE_URL` = [Neon staging connection string from Phase 1]
- [ ] `NEXTAUTH_URL` = [Leave empty for now, will update after first deploy]
- [ ] `NEXTAUTH_SECRET` = [Generate new: `openssl rand -base64 32`]
- [ ] `GOOGLE_CLIENT_ID` = [Same as production]
- [ ] `GOOGLE_CLIENT_SECRET` = [Same as production]
- [ ] `GOOGLE_DRIVE_CLIENT_ID` = [Same as production]
- [ ] `GOOGLE_DRIVE_CLIENT_SECRET` = [Same as production]
- [ ] `GOOGLE_DRIVE_REDIRECT_URI` = [Leave empty for now]
- [ ] `GOOGLE_DRIVE_REFRESH_TOKEN` = [Same as production or separate staging token]
- [ ] `GOOGLE_DRIVE_FOLDER_ID` = [Same as production or separate staging folder]
- [ ] `NODE_ENV` = production

### Step 4: First Staging Deployment

- [ ] Push to staging branch
  ```bash
  git checkout staging
  git push origin staging
  ```

- [ ] Wait for Vercel deployment (check dashboard)
- [ ] Copy staging URL from Vercel
  - Format: `https://shortstack-git-staging-[team-name].vercel.app`
- [ ] Update Preview environment variables:
  - [ ] `NEXTAUTH_URL` = [Your staging URL]
  - [ ] `GOOGLE_DRIVE_REDIRECT_URI` = [Your staging URL]/api/auth/callback/google

- [ ] Trigger redeploy to apply new env vars
  - Go to Deployments tab
  - Find latest staging deployment
  - Click three dots → Redeploy

## Phase 3: Google OAuth Configuration ⏱️ 30 minutes

- [ ] Go to Google Cloud Console
- [ ] Navigate to APIs & Services → Credentials
- [ ] Select your OAuth 2.0 Client ID
- [ ] Add Authorized JavaScript origins:
  - [ ] `https://shortstack.vercel.app`
  - [ ] `https://shortstack-git-staging-[your-team].vercel.app`

- [ ] Add Authorized redirect URIs:
  - [ ] `https://shortstack.vercel.app/api/auth/callback/google`
  - [ ] `https://shortstack-git-staging-[your-team].vercel.app/api/auth/callback/google`

- [ ] Click Save
- [ ] Wait 5 minutes for changes to propagate

## Phase 4: Testing ⏱️ 1-2 hours

### Test Staging Environment

- [ ] Visit staging URL
- [ ] Test Google OAuth login
- [ ] Verify database operations work
- [ ] Check file uploads
- [ ] Test critical user flows:
  - [ ] Login/logout
  - [ ] Student dashboard
  - [ ] Banking operations
  - [ ] Statement generation

### Test Production Environment (if applicable)

- [ ] Visit production URL
- [ ] Test Google OAuth login
- [ ] Verify all functionality
- [ ] Check performance

## Phase 5: Documentation ⏱️ 2-3 hours

- [ ] Copy all documentation files to repository:
  - [ ] WORKFLOW.md
  - [ ] QUICK_REFERENCE.md
  - [ ] VERCEL_SETUP.md (from docs/)
  - [ ] IMPLEMENTATION.md (this file)

- [ ] Copy script files:
  - [ ] scripts/db-sync-staging.ts
  - [ ] scripts/db-reset-staging.ts
  - [ ] scripts/setup-neon.ps1

- [ ] Update package.json scripts (if not done)

- [ ] Update README.md with links:
  ```markdown
  ## Documentation

  - [Development Workflow](./WORKFLOW.md)
  - [Quick Reference](./QUICK_REFERENCE.md)
  - [Vercel Setup Guide](./docs/VERCEL_SETUP.md)
  ```

- [ ] Commit all documentation
  ```bash
  git add .
  git commit -m "docs: add comprehensive workflow documentation"
  git push origin staging
  ```

## Phase 6: Team Onboarding ⏱️ 2-3 hours

### Step 1: Notify Team

- [ ] Send message to team channel:
  ```
  📢 New Development Workflow Available!

  We've implemented a new CI/CD pipeline with:
  - Staging environment for testing
  - Automated deployments via Vercel
  - Neon database branching
  - Comprehensive documentation

  Please read:
  - WORKFLOW.md for complete guide
  - QUICK_REFERENCE.md for daily commands

  Training session: [Date/Time]
  ```

### Step 2: Training Session

- [ ] Schedule 1-hour team meeting
- [ ] Demo the new workflow:
  - [ ] Creating feature branch
  - [ ] Making changes
  - [ ] Creating PR to staging
  - [ ] Testing on staging
  - [ ] Deploying to production

- [ ] Answer questions
- [ ] Have each developer create a test PR

### Step 3: Practice Run

- [ ] Each developer:
  - [ ] Creates a test feature branch
  - [ ] Makes a small change
  - [ ] Creates PR to staging
  - [ ] Tests on staging URL
  - [ ] Merges to staging

- [ ] Verify everyone understands the process

## Phase 7: Go Live ⏱️ 1 day

### Day 1: Soft Launch

- [ ] Announce workflow is now official
- [ ] Monitor for issues
- [ ] Be available for questions
- [ ] Document any problems

### Day 2-7: Adjustment Period

- [ ] Collect feedback from team
- [ ] Address issues as they arise
- [ ] Update documentation based on feedback
- [ ] Refine processes

### Week 2: Review

- [ ] Team retrospective meeting
- [ ] Discuss what's working
- [ ] Address pain points
- [ ] Make adjustments to workflow/documentation

## Maintenance

### Monthly Tasks

- [ ] Review and update documentation
- [ ] Check for outdated dependencies
- [ ] Review Vercel usage and costs
- [ ] Review Neon database usage
- [ ] Clean up old feature branches

### Quarterly Tasks

- [ ] Full workflow review
- [ ] Team training refresh
- [ ] Update dependencies
- [ ] Security audit

---

## Troubleshooting During Implementation

### Issue: Can't connect to Neon staging database

**Check**:
- [ ] Connection string is correct
- [ ] Database is not paused (Neon auto-pauses)
- [ ] Includes `?sslmode=require` parameter

### Issue: Vercel deployment fails

**Check**:
- [ ] All environment variables are set
- [ ] Build command is correct in vercel.json
- [ ] Review build logs in Vercel dashboard

### Issue: Google OAuth doesn't work on staging

**Check**:
- [ ] Staging URL is added to authorized redirect URIs
- [ ] URLs match exactly (no trailing slashes)
- [ ] Waited 5 minutes after saving in Google Console

### Issue: Team members can't access staging

**Check**:
- [ ] They have Vercel account access
- [ ] Preview deployments are enabled
- [ ] They're using correct URL

---

## Success Criteria

- [ ] Staging environment fully functional
- [ ] Production environment stable
- [ ] All team members trained
- [ ] Documentation complete and accessible
- [ ] First feature successfully deployed through pipeline
- [ ] No major issues for 1 week

---

**Estimated Total Time**: 12-16 hours  
**Recommended Timeline**: 5-7 days  
**Team Involvement Required**: All developers