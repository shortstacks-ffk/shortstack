# ShortStack Quick Reference

> Fast reference for common tasks and commands

## 🚀 Getting Started

```bash
# Clone and setup
git clone https://github.com/shortstacks-ffk/shortstack.git
cd shortstack
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npx prisma generate
npx prisma migrate dev
npm run dev
```

## 🌳 Git Workflow

```bash
# Start new work
git checkout staging
git pull origin staging
git checkout -b feature/my-feature

# During development
git add .
git commit -m "feat: description of changes"
git push origin feature/my-feature

# After PR approval and merge
git checkout staging
git pull origin staging
git branch -d feature/my-feature
```

## 🔧 Development Commands

```bash
# Run development server
npm run dev                    # Start at localhost:3000

# Code quality checks
npm run type-check            # TypeScript type checking
npm run lint                  # ESLint
npm run build                 # Test production build

# Database operations
npx prisma studio             # Visual database editor
npx prisma migrate dev        # Create new migration
npx prisma migrate deploy     # Deploy migrations
npx prisma generate           # Regenerate Prisma Client
npm run db:sync:staging       # Sync staging DB
npm run db:reset:staging      # Reset staging DB
```

## 📦 Pull Request Template

```markdown
## Description
[Brief description]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation

## Changes Made
- 
- 
- 

## How to Test
1. 
2. 
3. 

## Checklist
- [ ] Tested locally
- [ ] Type check passes
- [ ] No console.logs
- [ ] Documentation updated
```

## 🗄️ Database Quick Commands

```bash
# Create migration
npx prisma migrate dev --name add_badges

# View current schema
npx prisma studio

# Reset local database
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Check migration status
npx prisma migrate status
```

## 🌐 Environment URLs

| Environment | URL | Database |
|------------|-----|----------|
| Local | http://localhost:3000 | Local/Neon dev |
| Staging | https://shortstack-git-staging-*.vercel.app | Neon staging |
| Production | https://shortstack.vercel.app | Neon production |

## 📋 Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/add-badges` |
| Fix | `fix/description` | `fix/login-error` |
| Hotfix | `hotfix/description` | `hotfix/security-patch` |
| Chore | `chore/description` | `chore/update-deps` |
| Docs | `docs/description` | `docs/add-api-guide` |

## 🎯 Commit Messages

```bash
# Format: <type>(<scope>): <description>

feat(student): add badge achievement system
fix(banking): correct interest calculation
docs(api): add endpoint documentation
chore(deps): update dependencies
refactor(auth): simplify login flow
```

## 🚨 Troubleshooting Quick Fixes

```bash
# CI build fails
Check .github/workflows/ci.yml env variables

# Database connection error
npx prisma generate
npm run dev

# Prisma Client out of sync
rm -rf node_modules/.prisma
npx prisma generate

# Merge conflicts
git merge origin/staging
# Resolve conflicts, then:
git add .
git commit

# OAuth not working locally
Check Google Cloud Console redirect URIs
Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
```

## 📞 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech
- **Google Cloud**: https://console.cloud.google.com
- **GitHub Repo**: https://github.com/shortstacks-ffk/shortstack
- **Full Workflow Guide**: See WORKFLOW.md

## 🔐 Environment Variables Template

```env
# .env.local
DATABASE_URL="postgresql://user:pass@host/db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-secret"
GOOGLE_DRIVE_CLIENT_ID="your-drive-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-drive-secret"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"
GOOGLE_DRIVE_REFRESH_TOKEN="your-token"
GOOGLE_DRIVE_FOLDER_ID="your-folder"
```

## ⚡ Production Deployment Checklist

- [ ] All features tested on staging
- [ ] No known critical bugs
- [ ] Stakeholder approval received
- [ ] Database migrations tested
- [ ] Team notified
- [ ] Rollback plan ready
- [ ] Monitoring tools active

---

**For detailed explanations, see [WORKFLOW.md](./WORKFLOW.md)**