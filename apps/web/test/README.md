# E2E Tests

End-to-end tests for the Agentset public API endpoints.

## Prerequisites

1. **Server must be running** on `localhost:3000`:
   ```bash
   bun run dev
   ```

2. **Set up environment variables**:
   ```bash
   # Copy the example file
   cp .env.test.example .env.test.local
   
   # Edit with your values
   ```

   Required variables:
   - `TEST_API_KEY` - Your Agentset API key (create from dashboard)
   - `TEST_BASE_URL` - Server URL (default: `http://localhost:3000`)
   - `TEST_NAMESPACE_ID` - A namespace ID to test against

## Running Tests

Run all commands from the `apps/web` directory:

```bash
cd apps/web

# Run all E2E tests
bun run test:e2e

# Run all tests (including unit tests if any)
bun run test

# Watch mode for development
bun run test:watch
```

## Test Coverage

### Endpoints Tested
- **Health** - `GET /api/health`
- **Namespace API** - `GET /api/v1/namespace`
- **Ingest Jobs API** - `POST` and `GET` operations

### Test Types
- Happy path (successful responses)
- Authentication errors (401 - missing/invalid API key)
- Validation errors (400/422 - invalid payloads)
- Not found errors (404 - non-existent resources)