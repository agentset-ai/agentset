# Local Development Setup Guide

This guide will help you set up your local development environment for Agentset.

## Prerequisites

- Node.js (v22.12 or higher) - see `.nvmrc` for the exact version
- pnpm (package manager) - version 9.15.4 or higher
- Docker (for local database via Supavisor)
- PostgreSQL (or use Docker)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

### 3. Configure Required Environment Variables

Edit `.env` and fill in the required values. The `.env.example` file shows all available variables with example values.

**Important**: Most variables are required for the app to run. You can temporarily set `SKIP_ENV_VALIDATION=true` to bypass validation during initial setup, but you'll need to configure them eventually.

#### Quick Reference: Required vs Optional

**Required** (app won't start without these):

- `NEXT_PUBLIC_APP_DOMAIN` - App domain URL
- `DATABASE_URL` & `DIRECT_URL` - Database connection strings
- `BETTER_AUTH_SECRET` & `BETTER_AUTH_URL` - Authentication
- `RESEND_API_KEY` - Email service
- `QSTASH_*` - Queue service (4 variables)
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` - OAuth
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - OAuth
- `REDIS_URL` & `REDIS_TOKEN` - Redis cache
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (required)
- `DEFAULT_PINECONE_*` & `DEFAULT_TURBOPUFFER_API_KEY` - Vector stores
- `DEFAULT_AZURE_*` - Azure AI services (4 variables)
- `DEFAULT_COHERE_API_KEY` & `DEFAULT_ZEROENTROPY_API_KEY` - Re-ranking
- `PARTITION_API_URL` & `PARTITION_API_KEY` - Ingest service
- `S3_*` & `ASSETS_S3_*` - Storage (10 variables total)

**Optional** (can be omitted if you don't need those features):

- `SECONDARY_PINECONE_*` - Secondary vector store
- `AZURE_SEARCH_*` - Azure Search for hybrid search
- `VERCEL_*` - Vercel integration (for hosting features)
- `TRIGGER_SECRET_KEY` - Background jobs
- `DISCORD_HOOK_*` - Discord webhooks
- `STRIPE_API_KEY` & `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` - Stripe payments (required by stripe package, but only needed if using payment features)

#### Database

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/app.agentset.ai"
DIRECT_URL="postgresql://postgres:password@localhost:5432/app.agentset.ai"
```

**Note**: `DIRECT_URL` is required by Prisma for direct database connections (bypassing connection poolers). For local development, it's typically the same as `DATABASE_URL`. In production, `DATABASE_URL` goes through a connection pooler (like Supavisor) while `DIRECT_URL` connects directly to the database.

For local development with Supavisor (Docker), you'll also need to create `tooling/supavisor/.env`:

```env
POSTGRES_DB=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

TENANT_ID=dev_tenant
JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1MTkyODI0LCJleHAiOjE5NjA3Njg4MjR9.M9jrxyvPLkUxWgOYSf5dNdJ8v_eRrq810ShFRT8N-6M
```

#### App Domain

```env
NEXT_PUBLIC_APP_DOMAIN="http://localhost:3000"
```

#### Authentication

```env
BETTER_AUTH_SECRET="your-secret-key-here"  # Generate a random string (use a secure random value)
BETTER_AUTH_URL="http://localhost:3000"
```

#### OAuth Providers (Optional for basic development)

```env
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

#### Email (Resend)

```env
RESEND_API_KEY="re_1234567890"
```

#### Queue (QStash)

For local development, you can use Upstash QStash or a local instance:

```env
QSTASH_URL="http://localhost:8080"  # or https://qstash.upstash.io/v2
QSTASH_TOKEN=xxx
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_xxx
```

#### Vector Stores & Embeddings

**Required (for RAG functionality):**

```env
# Managed vector store for customers who don't provide their own credentials
DEFAULT_PINECONE_API_KEY=pcsk_xxx
DEFAULT_PINECONE_HOST="https://xxx.svc.xxx.pinecone.io"
DEFAULT_TURBOPUFFER_API_KEY=xxx
```

**Optional (for advanced features):**

```env
# Secondary Pinecone (for advanced features)
SECONDARY_PINECONE_API_KEY=pcsk_xxx
SECONDARY_PINECONE_HOST="https://xxx.svc.xxx.pinecone.io"

# Azure Search (for hybrid search)
AZURE_SEARCH_URL=https://xxx.search.windows.net
AZURE_SEARCH_INDEX=your-index
AZURE_SEARCH_KEY=xxx
```

#### Azure AI Services

```env
DEFAULT_AZURE_RESOURCE_NAME=xxx
DEFAULT_AZURE_API_KEY=xxx
DEFAULT_AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large
DEFAULT_AZURE_LLM_DEPLOYMENT=gpt-4.1
```

#### Re-ranking & Other Services

```env
DEFAULT_COHERE_API_KEY=xxx
DEFAULT_ZEROENTROPY_API_KEY=xxx
PARTITION_API_URL=https://example.com/ingest
PARTITION_API_KEY=xxx
```

#### Storage (S3)

```env
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_ENDPOINT=xxx
S3_BUCKET=xxx

ASSETS_S3_ACCESS_KEY=xxx
ASSETS_S3_SECRET_KEY=xxx
ASSETS_S3_ENDPOINT=xxx
ASSETS_S3_BUCKET=xxx
ASSETS_S3_URL=xxx
```

#### Redis

```env
REDIS_URL=https://xxx.upstash.io
REDIS_TOKEN=xxx
```

#### Stripe

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Required
STRIPE_API_KEY=sk_test_xxx  # Required by stripe package (needed if using payment features)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_xxx  # Required by stripe package (needed if using payment features)
```

**Note**: The `@agentset/stripe` package requires `STRIPE_API_KEY` and `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`. If you're not using payment features, you can set `SKIP_ENV_VALIDATION=true` temporarily, but you'll need to provide these values for the app to start normally.

#### Background Jobs (Trigger.dev)

```env
TRIGGER_SECRET_KEY=xxx
```

#### Vercel (Optional, for hosting features)

```env
VERCEL_PROJECT_ID=xxx
VERCEL_TEAM_ID=xxx
VERCEL_API_TOKEN=xxx
```

#### Discord Webhooks (Optional)

```env
DISCORD_HOOK_ALERTS=
DISCORD_HOOK_CRON=
DISCORD_HOOK_SUBSCRIBERS=
DISCORD_HOOK_ERRORS=
```

### 4. Run Database Migrations

```bash
pnpm db:deploy
```

### 5. Start Development Server

```bash
# Start all services (web app + dependencies)
pnpm dev

# Or start only the web app
pnpm dev:web
```

## Common Issues

### Missing Environment Variables

If you see errors about missing environment variables:

1. **Check `.env.example`**: All available environment variables are listed in `.env.example` with example values.

2. **Required vs Optional**:
   - Most variables are required for the app to function
   - Some are optional (marked with comments in `.env.example`)
   - Variables like `SECONDARY_PINECONE_*`, `AZURE_SEARCH_*`, `VERCEL_*`, and `TRIGGER_SECRET_KEY` are optional

3. **Skip validation temporarily**: You can set `SKIP_ENV_VALIDATION=true` in your `.env` file to bypass validation during initial setup, but you'll need to configure all required variables eventually. This is not recommended for production.

### Database Connection Issues

If you're using Supavisor (Docker):

1. Make sure Docker is running
2. Create `tooling/supavisor/.env` with database credentials
3. The Supavisor service should start automatically with `pnpm dev`

### Port Conflicts

The default ports are:

- Web app: `http://localhost:3000`
- Database (via Supavisor): `5432`
- Supavisor API: `4000`

If these are in use, you may need to adjust your configuration.

## Useful Commands

```bash
# Open Prisma Studio to view database
pnpm db:studio

# Run linting
pnpm lint

# Type check
pnpm typecheck

# Build all packages
pnpm build
```

## Getting API Keys

### Pinecone

1. Sign up at https://www.pinecone.io/
2. Create an index
3. Get your API key and host from the dashboard

### Turbopuffer

1. Sign up at https://turbopuffer.com/
2. Get your API key from the dashboard

### Azure AI Services

1. Create an Azure account
2. Set up an Azure AI resource
3. Get your resource name, API key, and deployment names

### Resend (Email)

1. Sign up at https://resend.com/
2. Get your API key from the dashboard

### Upstash (Redis & QStash)

1. Sign up at https://upstash.com/
2. Create Redis and QStash instances
3. Get your URLs and tokens

## Next Steps

- Check out the [README.md](./README.md) for more information
- Visit the [documentation](https://docs.agentset.ai) for detailed guides
- Join the [Discord](https://discord.com/invite/XNcrk6bv) for community support
