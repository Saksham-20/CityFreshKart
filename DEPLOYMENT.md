# 🚀 CityFreshKart - Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Lighthouse audit score 95+
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Images optimized and CDN configured
- [ ] Service worker updated for production
- [ ] SSL/TLS certificate installed
- [ ] API rate limiting enabled
- [ ] Error logging configured
- [ ] Backups automated

---

## Environment (generated secrets)

From the repo root, after `npm install` (and `cd server && npm install` if you want VAPID keys generated):

```bash
npm run setup:env:dry       # preview only
npm run setup:env           # writes .env and client/.env.production (fails if they exist)
npm run setup:env:force     # overwrite existing
npm run setup:env:testing   # weak fixed secrets for smoke tests; overwrites .env files
```

Then edit **`.env`**: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and your public URLs. Delete **`scripts/.setup-env-report.txt`** after saving secrets elsewhere.

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Client CDN    │  (CloudFlare / AWS CloudFront)
│  (Static assets)│
└────────┬────────┘
         │
┌────────▼────────┐
│  Frontend App   │  (Vercel / Netlify)
│  (React SPA)    │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │  (Load balancing)
└────────┬────────┘
         │
┌────────▼────────┐
│  Backend API    │  (Node.js / Express)
│  (Multiple)     │
└────────┬────────┘
         │
┌────────▼────────┐
│   PostgreSQL    │  (Managed database)
│   (Primary)     │
└─────────────────┘
```

---

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# Set environment variables
vercel env add REACT_APP_API_URL
vercel env add REACT_APP_ENV production

# Deploy
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/build",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.cityfreshkart.com/:path*"
    }
  ]
}
```

### Option 2: Netlify

```bash
# Deploy directory
netlify deploy --prod --dir=client/build

# Environment variables via UI
```

### Option 3: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync client/build s3://cityfreshkart.com

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

---

## 🖥️ Backend Deployment

### Option 1: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Create app
heroku create cityfreshkart-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# Configure env
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

### Option 2: DigitalOcean App Platform

```bash
# Create app.yaml
name: cityfreshkart-api
services:
  - name: api
    github:
      repo: your-org/cityfreshkart
      branch: main
    build_command: npm install
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: postgresql://...
```

### Option 3: Docker + AWS ECS / Kubernetes

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy app code
COPY server/ ./server/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start
CMD ["node", "server/index.js"]
```

**Deploy to AWS ECS:**
```bash
# Build image
docker build -t cityfreshkart-api:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag cityfreshkart-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/cityfreshkart-api:latest

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/cityfreshkart-api:latest
```

---

## 🗄️ Database Setup

### PostgreSQL on AWS RDS

```bash
# Create RDS instance via AWS Console
# Get connection string:
postgresql://username:password@host:port/dbname

# Set in .env
DATABASE_URL="postgresql://user:pass@rds-instance.aws.amazon.com:5432/cityfreshkart"

# Run migrations
npx prisma migrate deploy

# Seed data (if needed)
npx prisma db seed
```

### Database Backup Strategy

```bash
# Daily automated backup
* 2 * * * /home/user/scripts/backup-db.sh

# Backup script
#!/bin/bash
pg_dump $DATABASE_URL | gzip > backups/db-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backups/db-*.sql.gz s3://cityfreshkart-backups/

# Keep 30 days
find backups/ -mtime +30 -delete
```

---

## 📱 PWA Production Setup

### Service Worker Update

**Update `/public/sw.js`:**
```javascript
const CACHE_VERSION = 'v1-prod';
const CACHE_NAME = `cityfreshkart-${CACHE_VERSION}`;

// Production URLs
const API_URL = 'https://api.cityfreshkart.com';
const CDN_URL = 'https://cdn.cityfreshkart.com';
```

### Manifest Update

**Update `/public/manifest.json`:**
```json
{
  "start_url": "https://cityfreshkart.com",
  "scope": "https://cityfreshkart.com",
  "icons": [
    {
      "src": "https://cdn.cityfreshkart.com/icons/icon-192x192.png",
      "sizes": "192x192"
    }
  ]
}
```

---

## 🔐 Security in Production

### 1. SSL/TLS Certificate

```bash
# Use Let's Encrypt (free)
sudo apt-get install certbot

certbot certonly --standalone -d cityfreshkart.com -d api.cityfreshkart.com

# Auto-renew
certbot renew --quiet --no-self-upgrade
```

### Nginx in front of Node (VPS)

For file uploads (admin product images), set a body size limit **above** your `MAX_FILE_SIZE` (default 5MB):

```nginx
client_max_body_size 10M;
```

For a React SPA, always fall back to `index.html` so deep links like `/admin/products` work after refresh:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

If the browser loads the app from `www` but API calls go to `api.*`, set `CSP_CONNECT_SRC` in `.env` to include both origins (see `server/utils/cspOrigins.js`).

### 2. Environment Variables

**.env.production:**
```
NODE_ENV=production
PORT=5000
JWT_SECRET=<very-long-random-string>
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=<production-key>
CORS_ORIGIN=https://cityfreshkart.com
CSP_CONNECT_SRC=https://cityfreshkart.com,https://api.cityfreshkart.com
```

### 3. Rate Limiting

**Production rates:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // increase for production
  trustProxy: true, // if behind reverse proxy
});
```

### 4. Helmet Headers

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'https://cdn.cityfreshkart.com'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
```

---

## 📊 Monitoring & Logging

### 1. Error Tracking (Sentry)

```bash
npm install @sentry/node

# In your app:
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://...@sentry.io/...' });
```

### 2. Application Metrics (Prometheus)

```bash
npm install prom-client

# Track requests, errors, response time
```

### 3. Logs (ELK Stack or CloudWatch)

```javascript
// Use structured logging
const logger = require('winston');

logger.info('Order created', {
  orderId: '123',
  userId: 'user-456',
  total: 250
});
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: vercel deploy --prod --token $VERCEL_TOKEN
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: git push heroku main
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
      - run: heroku run npm prisma migrate deploy
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
```

---

## 📈 Performance Optimization

### 1. Image Optimization

```bash
# Use Next.js Image or similar
# Automatically optimizes on build
npm run build

# Or manually with ImageMagick
convert input.jpg -resize 1200 -quality 85 output-1200.jpg
```

### 2. Code Splitting

```javascript
// Already configured with React.lazy in App.js
const HomePage = lazy(() => import('./pages/HomePage'));
```

### 3. Caching Headers

```javascript
app.use((req, res, next) => {
  // Cache static assets for 1 year
  if (req.path.startsWith('/public')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache API responses for 5 minutes
  else if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  next();
});
```

---

## 🧪 Post-Deployment Testing

```bash
# Health check
curl https://cityfreshkart.com/health

# API test
curl https://api.cityfreshkart.com/api/products

# Lighthouse test
lighthouse https://cityfreshkart.com

# Load testing
npm install -g artillery
artillery quick --count 100 --num 1000 https://api.cityfreshkart.com/api/products
```

---

## 🔄 Rollback Procedure

```bash
# Vercel
vercel rollback

# Heroku
heroku releases
heroku rollback v123

# Manual
git push heroku previous-commit:main --force
heroku run npx prisma migrate deploy
```

---

## 💰 Cost Estimation

**Monthly Costs (approx):**
- Frontend (Vercel): $0-20
- Backend (Heroku): $7-25
- Database (RDS): $15-50
- CDN (CloudFlare): $0-20
- Monitoring: $0-15
- **Total**: $22-130/month

---

## ✅ Final Deployment Checklist

- [ ] All tests passing
- [ ] Lighthouse 95+ score
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Error logging configured
- [ ] Backups automated
- [ ] CDN configured
- [ ] DNS propagated
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Monitoring alerts set up
- [ ] Team trained on rollback

---

**Ready to launch! 🎉**

For support: support@cityfreshkart.com
