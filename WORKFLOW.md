# Development Workflow Guide

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Branch Strategy](#branch-strategy)
3. [Feature Development](#feature-development)
4. [Deployment Process](#deployment-process)
5. [Database Management](#database-management)

## Environment Setup

### Prerequisites
- Node.js 20+
- Git
- Access to project repositories and services

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shortstack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your local credentials
   ```

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## Branch Strategy

We follow a three-tier branch strategy:

- **`main`** - Production environment (auto-deploys to Vercel production)
- **`staging`** - Staging environment (auto-deploys to Vercel preview)
- **`feature/*`** - Feature branches (for development)

### Branch Naming Convention
- Feature: `feature/add-user-profile`
- Bug fix: `fix/upload-error`
- Hotfix: `hotfix/security-patch`
- Chore: `chore/update-dependencies`

## Feature Development

### 1. Create a Feature Branch

Always branch from `staging`:

```bash
# Update staging first
git checkout staging
git pull origin staging

# Create your feature branch
git checkout -b feature/your-feature-name
```

### 2. Develop Your Feature

- Make small, focused commits
- Write descriptive commit messages
- Test locally before pushing

```bash
# Make changes
git add .
git commit -m "feat: add user profile component"
```

### 3. Push and Create PR

```bash
# Push your branch
git push origin feature/your-feature-name
```

Create a Pull Request (PR) targeting **`staging`**, not `main`:
- Add a clear description
- Link related issues
- Request reviews from team members

### 4. Code Review Process

- Address review comments
- Push additional commits if needed
- Ensure CI checks pass (TypeScript, build)

### 5. Merge to Staging

Once approved:
1. Merge PR to `staging`
2. Automatic deployment to Vercel staging environment
3. Test on staging URL

## Deployment Process

### Staging Deployment (Automatic)

When code is pushed/merged to `staging`:
1. GitHub Actions runs CI checks
2. Vercel deploys to staging environment
3. Test at: `https://your-project-staging.vercel.app`

**Staging Environment:**
- Database: Neon serverless (staging database)
- Auth callbacks: Staging URL
- Environment: Preview mode

### Production Deployment (Manual)

Production deployment happens when `staging` is promoted to `main`:

```bash
# Only after thorough testing on staging
git checkout main
git pull origin main
git merge staging
git push origin main
```

**When to promote to production:**
- ✅ All features tested on staging
- ✅ No critical bugs
- ✅ Stakeholder approval
- ✅ End of sprint/milestone
- ✅ Emergency hotfixes (immediately after fix)

**Production Environment:**
- Database: Neon serverless (production database)
- Auth callbacks: Production URL
- Environment: Production mode

## Database Management

### Neon Database Setup

#### Staging Database
1. Create a new Neon project: `shortstack-staging`
2. Copy connection string
3. Add to Vercel staging environment variables:
   ```
   DATABASE_URL=postgresql://user:pass@staging-host.neon.tech/database
   ```

#### Production Database
1. Create a new Neon project: `shortstack-production`
2. Copy connection string
3. Add to Vercel production environment variables

### Running Migrations

**Local:**
```bash
npx prisma migrate dev --name your_migration_name
```

**Staging/Production:**
Migrations run automatically on Vercel deployment via build command:
```bash
prisma generate && npx prisma migrate deploy && next build
```

### Schema Changes

1. Update `schema.prisma`
2. Create migration locally: `npx prisma migrate dev`
3. Commit migration files
4. Push to feature branch → staging
5. Test on staging
6. Promote to production when ready

## Vercel Configuration

### Required Environment Variables

Set these in Vercel dashboard for both staging and production:

**Database:**
- `DATABASE_URL` - Neon connection string

**Auth:**
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your deployment URL
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Google Drive:**
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI` - Match your deployment URL
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_FOLDER_ID`

### Google OAuth Setup

**For Staging:**
1. Go to Google Cloud Console
2. Add authorized redirect URI: `https://your-staging.vercel.app/api/auth/callback/google`
3. Add authorized JavaScript origin: `https://your-staging.vercel.app`

**For Production:**
1. Add: `https://your-production.vercel.app/api/auth/callback/google`
2. Add: `https://your-production.vercel.app`

## Common Tasks

### Update Dependencies
```bash
npm update
npm audit fix
```

### Check Type Safety
```bash
npx tsc --noEmit
```

### Database Studio
```bash
npx prisma studio
```

### Reset Local Database
```bash
npx prisma migrate reset
```

## Troubleshooting

### Build Fails on Vercel

1. Check environment variables are set
2. Verify `DATABASE_URL` is accessible
3. Check build logs for specific errors
4. Ensure `NEXTAUTH_URL` matches deployment URL

### Authentication Issues

1. Verify OAuth redirect URIs match exactly
2. Check `NEXTAUTH_SECRET` is set
3. Confirm `NEXTAUTH_URL` is correct

### Database Connection Issues

1. Verify Neon database is running
2. Check connection string format
3. Ensure IP allowlist includes Vercel IPs (or set to 0.0.0.0/0 for serverless)

## CI/CD Pipeline

### GitHub Actions Workflow

1. **Push to feature branch** → No automated deployment
2. **Merge to staging** → 
   - Run CI checks (TypeScript, build validation)
   - Deploy to Vercel staging
3. **Merge to main** → Deploy to Vercel production

### What CI Checks

- TypeScript compilation (`tsc --noEmit`)
- Prisma schema validation (`prisma generate`)
- Build succeeds (Vercel handles this)

## Best Practices

1. **Never commit directly to `main` or `staging`**
2. **Always create PRs for code review**
3. **Test locally before pushing**
4. **Keep feature branches short-lived (< 1 week)**
5. **Write descriptive commit messages**
6. **Update documentation with your changes**
7. **Test on staging before promoting to production**
8. **Communicate with team before production deployments**

## Getting Help

- Check this documentation first
- Review closed PRs for similar issues
- Ask in team chat
- Create an issue with detailed information