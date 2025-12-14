# ShortStack Development Workflow> Complete guide for developers working on the ShortStack project## Table of Contents1. [Overview](#overview)2. [Environment Setup](#environment-setup)3. [Branch Strategy](#branch-strategy)4. [Development Workflow](#development-workflow)5. [Pull Request Process](#pull-request-process)6. [Deployment Process](#deployment-process)7. [Database Management](#database-management)8. [Troubleshooting](#troubleshooting)9. [Best Practices](#best-practices)---## Overview### Architecture```┌──────────────────────────────────────────────────┐│  Local Development (feature branches)            ││  • Local database or Neon dev branch             ││  • npm run dev                                   ││  • Rapid iteration                               │└──────────────────────────────────────────────────┘                      ↓                  (Push & PR)                      ↓┌──────────────────────────────────────────────────┐│  CI Pipeline (GitHub Actions)                    ││  • TypeScript type checking                      ││  • ESLint                                        ││  • Build validation                              ││  • Automated checks                              │└──────────────────────────────────────────────────┘                      ↓                (Merge to staging)                      ↓┌──────────────────────────────────────────────────┐│  Staging Environment                             ││  • Vercel Preview Deployment                     ││  • Neon Staging Database                         ││  • QA & Testing                                  ││  • Stakeholder Review                            ││  • URL: shortstack-git-staging-*.vercel.app      │└──────────────────────────────────────────────────┘                      ↓            (Approval & Merge to main)                      ↓┌──────────────────────────────────────────────────┐│  Production Environment                          ││  • Vercel Production Deployment                  ││  • Neon Production Database                      ││  • Live for end users                            ││  • URL: shortstack.vercel.app                    │└──────────────────────────────────────────────────┘```### Technology Stack- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS- **Backend**: Next.js API Routes, NextAuth.js- **Database**: PostgreSQL (Neon Serverless)- **ORM**: Prisma- **Deployment**: Vercel- **CI/CD**: GitHub Actions---## Environment Setup### Prerequisites- Node.js 20+ installed- Git installed- VS Code (recommended) with extensions:  - Prisma  - ESLint  - Tailwind CSS IntelliSense- Access to GitHub repository- Vercel account (for deployment access)- Neon account (for database access)### Initial Setup1. **Clone the repository**```bashgit clone https://github.com/shortstacks-ffk/shortstack.gitcd shortstack```2. **Install dependencies**```bashnpm install```3. **Set up environment variables**```bash# Copy example environment filecp .env.example .env.local# Edit .env.local with your credentialscode .env.local```**.env.local example:**```env# Database - Use local or Neon dev branchDATABASE_URL="postgresql://user:password@localhost:5432/shortstack_dev"# NextAuthNEXTAUTH_URL="http://localhost:3000"NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"# Google OAuth (get from team lead)GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"GOOGLE_CLIENT_SECRET="your-client-secret"# Google DriveGOOGLE_DRIVE_CLIENT_ID="your-drive-client-id"GOOGLE_DRIVE_CLIENT_SECRET="your-drive-secret"GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"GOOGLE_DRIVE_REFRESH_TOKEN="your-refresh-token"GOOGLE_DRIVE_FOLDER_ID="your-folder-id"```4. **Generate Prisma Client**```bashnpx prisma generate```5. **Run database migrations**```bashnpx prisma migrate dev```6. **Seed database (optional)**```bashnpx prisma db seed```7. **Start development server**```bashnpm run dev```8. **Open browser**Navigate to: http://localhost:3000---## Branch Strategy### Branch Types| Branch Type | Naming Convention | Purpose | Lifetime ||------------|-------------------|---------|----------|| **main** | `main` | Production-ready code | Permanent || **staging** | `staging` | Pre-production testing | Permanent || **feature** | `feature/description` | New features | Short-lived || **fix** | `fix/description` | Bug fixes | Short-lived || **hotfix** | `hotfix/description` | Urgent production fixes | Very short-lived || **chore** | `chore/description` | Maintenance tasks | Short-lived || **docs** | `docs/description` | Documentation updates | Short-lived |### Branch Naming Examples✅ **Good**:- `feature/add-student-badges`- `fix/bank-statement-calculation-error`- `hotfix/login-redirect-loop`- `chore/update-dependencies`- `docs/add-api-documentation`❌ **Bad**:- `my-changes`- `update`- `fix-bug`- `new-feature`---## Development Workflow### Step 1: Start New WorkAlways branch from the latest `staging` (not `main`):```bash# Update staginggit checkout staginggit pull origin staging# Create feature branchgit checkout -b feature/add-student-badges```### Step 2: Make Changes```bash# Make your code changes# Test locally: npm run dev# Check types and lintnpm run type-checknpm run lint# Commit your changesgit add .git commit -m "feat: add badge system for student achievements"```### Commit Message ConventionFollow [Conventional Commits](https://www.conventionalcommits.org/):```<type>(<scope>): <description>[optional body][optional footer]```**Types**:- `feat`: New feature- `fix`: Bug fix- `docs`: Documentation only- `style`: Code style (formatting, missing semi-colons, etc.)- `refactor`: Code refactoring- `perf`: Performance improvement- `test`: Adding tests- `chore`: Maintenance tasks**Examples**:```bashgit commit -m "feat(student): add badge achievement system"git commit -m "fix(banking): correct interest calculation formula"git commit -m "docs(api): add endpoint documentation for /api/students"git commit -m "chore(deps): update next to 15.1.0"```### Step 3: Push Your Branch```bashgit push origin feature/add-student-badges```If branch doesn't exist remotely:```bashgit push -u origin feature/add-student-badges```---## Pull Request Process### Step 1: Create Pull Request1. Go to GitHub repository2. Click "Compare & pull request" button (appears after push)3. Or manually: Click "Pull requests" → "New pull request"### Step 2: Configure PR**Important**: Set base branch to `staging` (NOT `main`)```base: staging ← compare: feature/add-student-badges```### Step 3: Fill Out PR Template```markdown## DescriptionBrief description of what this PR does## Type of Change- [ ] 🎨 New feature- [ ] 🐛 Bug fix- [ ] 📝 Documentation update- [ ] 🔧 Chore/maintenance- [ ] ⚡ Performance improvement- [ ] ♻️ Refactoring## Changes Made- Added badge model to database schema- Created badge service for awarding badges- Implemented badge display on student dashboard- Added unit tests for badge logic

## How to Test
1. Log in as a student
2. Complete a lesson
3. Navigate to dashboard
4. Verify badge appears in achievements section

## Screenshots (if applicable)
[Add screenshots here]

## Database Changes
- [ ] New migration created
- [ ] Schema changes documented
- [ ] Seed data updated (if needed)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed code
- [ ] No console.log statements left in code
- [ ] Tested locally
- [ ] Documentation updated (if needed)
- [ ] Migration files included (if schema changed)
```

### Step 4: Wait for CI Checks

GitHub Actions will automatically:
- ✅ Run TypeScript type checking
- ✅ Run ESLint
- ✅ Test production build
- ✅ Check for console.logs

If CI fails:
1. Check the error logs in the Actions tab
2. Fix the issues locally
3. Commit and push again
4. CI will automatically re-run

### Step 5: Code Review

- Request review from at least **1 team member**
- Address review comments by:
  - Making changes
  - Committing with descriptive message
  - Pushing to same branch
- Respond to comments in GitHub
- Once approved, proceed to merge

### Step 6: Merge to Staging

**Merge options**:

1. **Squash and Merge** (Recommended)
   - Combines all commits into one
   - Keeps history clean
   - Use for feature branches

2. **Create a Merge Commit**
   - Preserves all commits
   - Use for staging → main merges

3. **Rebase and Merge**
   - Linear history
   - Use rarely, only if you understand rebase

**After merge**:
- Delete feature branch (GitHub offers this automatically)
- Pull latest staging locally:
  ```bash
  git checkout staging
  git pull origin staging
  ```

---

## Deployment Process

### Staging Deployment (Automatic)

**Trigger**: Push or merge to `staging` branch

**What happens**:
1. GitHub Actions runs CI checks
2. Vercel detects push to staging
3. Vercel builds and deploys to preview URL
4. Deployment URL: `https://shortstack-git-staging-[team].vercel.app`

**Access staging**:
- Check Vercel dashboard for exact URL
- Or look for Vercel bot comment on GitHub PR
- Or check GitHub Actions summary

**Testing on staging**:
```bash
# Staging environment uses:
# - Neon staging database (safe to test)
# - Google OAuth with staging callback
# - All production-like settings
```

### Production Deployment (Manual Approval)

**When to deploy to production**:

| Scenario | Timeline | Approval Required |
|----------|----------|-------------------|
| Regular sprint releases | End of sprint (weekly/bi-weekly) | Product owner + Tech lead |
| Bug fixes (non-critical) | 1-2 days after staging verification | Tech lead |
| Hotfixes (critical) | ASAP after staging smoke test | Any senior developer |
| Major features | 3-5 days after thorough QA | Full team + stakeholders |

**Deployment checklist**:
- [ ] All features tested on staging
- [ ] No known critical bugs
- [ ] Stakeholder approval received
- [ ] Database migrations tested
- [ ] Team notified of deployment
- [ ] Rollback plan prepared

**Steps**:

1. **Create release PR**

```bash
git checkout staging
git pull origin staging

# Go to GitHub and create PR:
# base: main ← compare: staging
```

2. **Fill out release notes**

```markdown
## Release Notes - Sprint 5 (December 15, 2025)

### 🎨 New Features
- Student badge achievement system (#45)
- Enhanced bank statement export (#47)
- Teacher dashboard analytics (#48)

### 🐛 Bug Fixes
- Fixed interest calculation rounding error (#43)
- Resolved login redirect loop (#46)

### 🗄️ Database Changes
- Added `Badge` model
- Added `StudentAchievement` model
- Migration: `20251215_add_badges`

### ⚡ Performance Improvements
- Optimized student query performance (#49)

### 📝 Documentation
- Updated API documentation (#50)

### Breaking Changes
None

### Deployment Notes
- Run migrations automatically on deploy
- No manual intervention required
```

3. **Get approval from lead developer**

4. **Merge to main**

5. **Monitor deployment**

```bash
# Check Vercel dashboard
# Monitor logs for errors
# Test critical paths:
#   - Login
#   - Dashboard load
#   - Bank statements
#   - Student operations
```

6. **Post-deployment verification**

```bash
# Test production site
curl https://shortstack.vercel.app/api/health

# Verify critical functionality
# - User login
# - Database operations
# - API endpoints
# - File uploads
```

7. **If issues occur**

**Option 1: Quick fix**
```bash
git checkout main
git checkout -b hotfix/critical-issue
# Make fix
git push origin hotfix/critical-issue
# Create PR: hotfix → staging → main (expedited)
```

**Option 2: Rollback**
```
1. Go to Vercel dashboard
2. Deployments tab
3. Find previous working deployment
4. Click "Promote to Production"
```

---

## Database Management

### Local Database

**Using local PostgreSQL**:

```bash
# Start PostgreSQL
# Create database
createdb shortstack_dev

# Update .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/shortstack_dev"

# Run migrations
npx prisma migrate dev

# View data
npx prisma studio
```

### Neon Database Branches

**Structure**:
- **main**: Production database
- **staging**: Staging database (branch of main)
- **dev**: Optional development branch

**Common commands**:

```bash
# List branches
npm run neon:branches

# Get staging connection string
npm run neon:staging:connection

# Sync staging with latest migrations
npm run db:sync:staging

# Reset staging to match production
npm run db:reset:staging
```

### Creating Database Migrations

**When schema changes**:

```bash
# 1. Update prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_badge_model

# This creates:
# - Migration SQL file in prisma/migrations/
# - Updates Prisma Client
# - Applies to your local database

# 3. Test migration
npm run dev

# 4. Commit migration files
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat(db): add badge model migration"
```

**Migration best practices**:
- Always test migrations locally first
- Include descriptive migration names
- Document breaking changes
- Test rollback if possible
- Never edit existing migrations

### Database Seeds

**Create seed file**:

```typescript
// filepath: prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const teacher = await prisma.user.create({
    data: {
      name: 'Test Teacher',
      email: 'teacher@test.com',
      role: 'TEACHER',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'student@test.com',
      role: 'STUDENT',
    },
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run seed**:

```bash
npx prisma db seed
```

---

## Troubleshooting

### Common Issues

#### Issue: CI Build Fails with "Invalid URL"

**Error**:
```
TypeError: Invalid URL
    at instantiateModule
```

**Solution**:
```bash
# Check that NEXTAUTH_URL is set in CI workflow
# See .github/workflows/ci.yml env section
# Ensure it's a valid URL format (http://localhost:3000)
```

#### Issue: Local Build Fails

**Error**:
```
Error: Environment variable not found: DATABASE_URL
```

**Solution**:
```bash
# 1. Check .env.local exists
ls -la .env.local

# 2. Verify DATABASE_URL is set
cat .env.local | grep DATABASE_URL

# 3. Restart dev server
npm run dev
```

#### Issue: Database Connection Fails

**Error**:
```
Can't reach database server
```

**Solution**:
```bash
# For local PostgreSQL:
# 1. Check PostgreSQL is running
pg_isready

# 2. Verify connection string
# 3. Check database exists

# For Neon:
# 1. Verify connection string is correct
# 2. Check database is not paused (Neon auto-pauses after inactivity)
# 3. Ensure ?sslmode=require is in connection string
```

#### Issue: Prisma Client Out of Sync

**Error**:
```
Prisma Client could not find Prisma Schema
```

**Solution**:
```bash
# Regenerate Prisma Client
npx prisma generate

# If still fails, try:
rm -rf node_modules/.prisma
npm run postinstall
```

#### Issue: Google OAuth Not Working Locally

**Error**:
```
redirect_uri_mismatch
```

**Solution**:
```bash
# 1. Go to Google Cloud Console
# 2. Check Authorized redirect URIs includes:
#    http://localhost:3000/api/auth/callback/google
# 3. Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
# 4. Restart dev server
```

#### Issue: Merge Conflicts

**Solution**:
```bash
# 1. Update your branch with latest staging
git checkout feature/my-feature
git fetch origin
git merge origin/staging

# 2. Resolve conflicts in your editor
# 3. After resolving, commit
git add .
git commit -m "chore: resolve merge conflicts"

# 4. Push
git push origin feature/my-feature
```

#### Issue: Deployment Fails on Vercel

**Check**:
1. Vercel build logs for specific error
2. Environment variables are set correctly
3. DATABASE_URL is accessible from Vercel
4. Build command is correct in vercel.json

**Common fixes**:
```bash
# Ensure vercel.json has correct build command
"buildCommand": "prisma generate && npx prisma migrate deploy && next build"

# Check environment variables in Vercel dashboard
# Verify they're set for correct environment (Production/Preview)
```

---

## Best Practices

### ✅ DO

**Code Quality**:
- Write TypeScript types for all functions
- Use Prisma for all database operations
- Follow Next.js 15 conventions (app router, server components)
- Write descriptive variable and function names
- Add comments for complex logic

**Git Workflow**:
- Commit frequently with clear messages
- Keep branches short-lived (< 1 week)
- Pull latest staging before creating feature branches
- Test locally before pushing

**Pull Requests**:
- Keep PRs small and focused (< 500 lines changed)
- Write clear PR descriptions
- Self-review before requesting review
- Respond promptly to review comments
- Update documentation with code changes

**Testing**:
- Test all changes locally
- Test on staging before merging to main
- Verify database migrations work
- Check mobile responsiveness
- Test authentication flows

**Communication**:
- Update team in Slack about major changes
- Document breaking changes clearly
- Ask for help when stuck
- Review others' PRs promptly
- Share knowledge and learnings

### ❌ DON'T

**Code**:
- Don't commit console.log statements
- Don't commit commented-out code
- Don't commit .env files or secrets
- Don't bypass TypeScript type checking
- Don't ignore ESLint warnings

**Git**:
- Don't push directly to main or staging
- Don't force push to shared branches
- Don't merge your own PRs without review
- Don't leave branches unmerged for long periods
- Don't delete remote branches that others might need

**Process**:
- Don't skip testing on staging
- Don't deploy to production on Fridays (unless critical)
- Don't make database schema changes without migrations
- Don't merge breaking changes without team discussion
- Don't ignore CI failures

**Deployment**:
- Don't deploy untested code to production
- Don't skip database migration testing
- Don't deploy without checking Vercel logs
- Don't ignore deployment failures
- Don't deploy during peak usage hours (unless necessary)

---

## Quick Reference

### Daily Commands

```bash
# Start development
npm run dev

# Run all checks before pushing
npm run type-check && npm run lint && npm run build

# Create feature branch
git checkout -b feature/my-feature

# View database
npx prisma studio

# Run migrations
npx prisma migrate dev --name my_migration

# Deploy migrations
npm run db:migrate:deploy
```

### Branch Flow

```
feature/my-feature → staging → main
       ↓              ↓         ↓
   (develop)      (testing)  (production)
```

### PR Checklist

- [ ] Base branch is `staging` (not `main`)
- [ ] Descriptive title and description
- [ ] Code tested locally
- [ ] Type check passes (`npm run type-check`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console.logs in code
- [ ] Documentation updated (if needed)
- [ ] Migration files committed (if schema changed)
- [ ] CI checks pass
- [ ] At least 1 approval received

### Important URLs

- **Local**: http://localhost:3000
- **Staging**: https://shortstack-git-staging-*.vercel.app
- **Production**: https://shortstack.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech
- **GitHub Repo**: https://github.com/shortstacks-ffk/shortstack
- **Google Cloud Console**: https://console.cloud.google.com

### Contact

- **Tech Lead**: [Name]
- **Product Owner**: [Name]
- **Slack Channel**: #dev-shortstack
- **Team Email**: dev@shortstacks.com

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)

---

**Last Updated**: December 14, 2025  
**Version**: 1.0  
**Maintainers**: Development Team