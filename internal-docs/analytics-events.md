# Analytics Events Documentation

This document describes all the analytics events tracked throughout the Agentset application using PostHog. Each event captures specific user actions and includes relevant context data.

## Authentication Events

### `auth_magic_link_sent`

Triggered when a user requests a magic link for email authentication.

**Payload:**

```typescript
{
  email: string; // The email address used for authentication
}
```

**Location:** `apps/web/src/hooks/use-auth.ts` (via `useMagicAuth` hook)

### `auth_social_login`

Triggered when a user initiates social login (Google or GitHub).

**Payload:**

```typescript
{
  provider: "google" | "github"; // The social auth provider used
}
```

**Location:** `apps/web/src/hooks/use-auth.ts` (via `useGoogleAuth` and `useGithubAuth` hooks)

## Organization Management Events

### `organization_created`

Triggered when a new organization is successfully created.

**Payload:**

```typescript
{
  slug: string; // Organization slug
  name: string; // Organization name
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/create-organization/create-org-form.tsx`

### `organization_updated`

Triggered when organization settings are updated.

**Payload:**

```typescript
{
  id: string;           // Organization ID
  nameChanged: boolean; // Whether the name was changed
  slugChanged: boolean; // Whether the slug was changed
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/settings/page.client.tsx`

## Namespace Management Events

### `namespace_created`

Triggered when a new namespace is successfully created.

**Payload:**

```typescript
{
  name: string;                    // Namespace name
  slug: string;                    // Namespace slug
  organizationId: string;          // Parent organization ID
  embeddingModel: {                // Embedding configuration (if set)
    provider: string;              // e.g., "openai", "cohere"
    model: string;                 // e.g., "text-embedding-3-small"
  } | null;
  vectorStore: {                   // Vector store configuration (if set)
    provider: string;              // e.g., "pinecone", "qdrant"
  } | null;
}
```

**Location:** `apps/web/src/components/create-namespace/index.tsx`

### `namespace_deleted`

Triggered when a namespace is successfully deleted.

**Payload:**

```typescript
{
  id: string;            // Namespace ID
  name: string;          // Namespace name
  organizationId: string; // Parent organization ID
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/settings/danger/delete-namespace-button.tsx`

## Document Management Events

### `document_ingested`

Triggered when documents are successfully ingested into a namespace. This event covers text, file uploads, and URL ingestion.

**Payload:**

```typescript
{
  type: "text" | "files" | "urls";    // Type of ingestion
  namespaceId: string;                // Target namespace ID
  fileCount?: number;                 // Number of files (for file uploads)
  urlCount?: number;                  // Number of URLs (for URL ingestion)
  chunkSize?: number;                 // Chunk size configuration
  hasMetadata: boolean;               // Whether custom metadata was provided
}
```

**Locations:**

- `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/documents/ingest-modal/text-form.tsx`
- `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/documents/ingest-modal/upload-form.tsx`
- `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/documents/ingest-modal/urls-form.tsx`

### `document_deleted`

Triggered when a document is successfully deleted.

**Payload:**

```typescript
{
  documentId: string;  // Document ID
  namespaceId: string; // Namespace ID
  status: string;      // Document status at time of deletion
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/documents/document-actions.tsx`

## Chat and Conversation Events

### `chat_message_sent`

Triggered when a user sends a message in either the playground or hosted chat.

**Payload:**

```typescript
{
  type: "playground" | "hosted";  // Chat interface type
  messageLength: number;          // Length of the message in characters
  hasExistingMessages: boolean;   // Whether there were previous messages in the conversation
}
```

**Location:** `apps/web/src/components/chat/chat-input.tsx`

### `chat_reset`

Triggered when a user resets/clears the chat conversation.

**Payload:**

```typescript
{
  type: "playground" | "hosted"; // Chat interface type
}
```

**Locations:**

- `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/playground/chat-actions.tsx`
- `apps/web/src/app/[hostingId]/(defaultLayout)/header.tsx`

### `chat_suggested_action_clicked`

Triggered when a user clicks on a suggested action/example question.

**Payload:**

```typescript
{
  position: number; // Position/index of the clicked suggestion
}
```

**Location:** `apps/web/src/components/chat/suggested-actions.tsx`

## API Management Events

### `api_key_created`

Triggered when a new API key is successfully created.

**Payload:**

```typescript
{
  orgId: string;        // Organization ID
  scope: "all" | string; // API key scope
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/settings/api-keys/create-api-key.tsx`

### `api_request`

Triggered on the server when API requests are made to the public API endpoints. This event captures usage patterns and helps track API adoption.

**Payload:**

```typescript
{
  routeName: string;    // Descriptive route name (e.g., "GET /v1/namespace", "POST /v1/namespace/[namespaceId]/search")
  pathname: string;     // Full request pathname
  method: string;       // HTTP method (GET, POST, PATCH, DELETE, etc.)
  statusCode: number;   // HTTP response status code
  tenantId?: string;    // Tenant identifier (if applicable)
  namespaceId?: string; // Namespace ID (for namespace-specific endpoints)
}
```

**Locations:**

- `apps/web/src/lib/api/handler/base.ts` (via `withApiHandler`)
- `apps/web/src/lib/api/handler/namespace.ts` (via `withNamespaceApiHandler`)

**Coverage:** All public API endpoints under `/api/(public-api)/v1/`

## Team Management Events

### `team_invite_member_clicked`

Triggered when a user clicks to invite a new member to their organization.

**Payload:**

```typescript
{
  organizationId: string; // Organization ID
  email: string;          // Email address of the invited member
  role: string;           // Role being assigned ("admin" | "member")
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/team/invite-dialog.tsx`

### `team_accept_invitation`

Triggered when a user accepts an organization invitation.

**Payload:**

```typescript
{
  invitationId: string;     // Invitation ID
  organizationId: string;   // Organization ID
  role: string;             // Role assigned to the member
  email: string;            // Email address of the invited member
}
```

**Location:** `apps/web/src/app/app.agentset.ai/invitation/[id]/invitation-card.tsx`

### `team_reject_invitation`

Triggered when a user rejects an organization invitation.

**Payload:**

```typescript
{
  invitationId: string;     // Invitation ID
  organizationId: string;   // Organization ID
  role: string;             // Role that was offered
  email: string;            // Email address of the invited member
}
```

**Location:** `apps/web/src/app/app.agentset.ai/invitation/[id]/invitation-card.tsx`

### `team_revoke_invitation`

Triggered when an admin revokes a pending invitation.

**Payload:**

```typescript
{
  organizationId: string; // Organization ID
  invitationId: string;   // Invitation ID being revoked
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/team/revoke-invitation.tsx`

### `team_remove_member`

Triggered when a member is removed from an organization (or leaves).

**Payload:**

```typescript
{
  organizationId: string; // Organization ID
  memberId: string;       // Member ID being removed
  isCurrentMember: boolean; // Whether the current user is removing themselves
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/team/remove-member.tsx`

### `organization_team_role_updated`

Triggered when a member's role is updated in an organization.

**Payload:**

```typescript
{
  organizationId: string; // Organization ID
  memberId: string;       // Member ID being updated
  oldRole: string;        // Previous role
  newRole: string;        // New role
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/team/member-card.tsx`

## Domain Management Events

### `domain_added`

Triggered when a custom domain is added to a hosting configuration.

**Payload:**

```typescript
{
  domain: string;       // Domain name added
  namespaceId: string;  // Namespace ID
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/hosting/domain-card/index.tsx`

### `domain_removed`

Triggered when a custom domain is removed from a hosting configuration.

**Payload:**

```typescript
{
  domain: string;       // Domain name removed
  namespaceId: string;  // Namespace ID
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/hosting/domain-card/index.tsx`

## Search and Exploration Events

### `playground_search_performed`

Triggered when a user performs a search in the playground search interface.

**Payload:**

```typescript
{
  namespaceId: string; // Namespace ID where search was performed
  query: string;       // Search query entered
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/playground/search/page.client.tsx`

## Benchmarking Events

### `benchmark_evaluated`

Triggered when a user runs a benchmark evaluation on their namespace.

**Payload:**

```typescript
{
  namespaceId: string;     // Namespace ID
  mode: "normal" | "agentic"; // Evaluation mode
  correctness: number;     // Correctness score
  faithfulness: boolean;   // Whether response was faithful to context
  relevance: boolean;      // Whether response was relevant to query
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/benchmarks/page.client.tsx`

## Billing Events

### `billing_upgrade_clicked`

Triggered when a user clicks to upgrade their billing plan.

**Payload:**

```typescript
{
  organizationId: string;     // Organization ID
  plan: string;               // Plan being upgraded to
  period: "monthly" | "yearly"; // Billing period selected
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/billing/upgrade/upgrade-button.tsx`

## Feature Access Events

### `connectors_get_access_clicked`

Triggered when a user clicks to get access to the connectors feature.

**Payload:** None (empty object)

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/connectors/empty-state.tsx`

## Hosting Configuration Events

### `hosting_enabled`

Triggered when hosting is first enabled for a namespace.

**Payload:**

```typescript
{
  namespaceId: string; // Namespace ID where hosting was enabled
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/hosting/empty-state.tsx`

### `hosting_search`

Triggered when a user performs a search in hosted chat.

**Payload:**

```typescript
{
  query: string; // The search query entered by the user
}
```

**Location:** `apps/web/src/app/[hostingId]/(defaultLayout)/search/use-search.ts`

### `hosting_search_example`

Triggered when a user clicks on an example search query in hosted chat.

**Payload:** None (empty object)

**Location:** `apps/web/src/app/[hostingId]/(defaultLayout)/search/use-search.ts`

### `hosting_updated`

Triggered when hosting configuration for a namespace is updated.

**Payload:**

```typescript
{
  namespaceId: string;                    // Namespace ID
  slug: string;                           // Hosting slug
  protected: boolean;                     // Whether hosting is password protected
  searchEnabled: boolean;                 // Whether search functionality is enabled
  hasCustomPrompt: boolean;               // Whether a custom system prompt is set
  hasWelcomeMessage: boolean;             // Whether a welcome message is set
  exampleQuestionsCount: number;          // Number of example questions configured
  exampleSearchQueriesCount: number;      // Number of example search queries configured
}
```

**Location:** `apps/web/src/app/app.agentset.ai/(dashboard)/[slug]/[namespaceSlug]/hosting/page.client.tsx`

## Event Usage Guidelines

### Implementation Principles

1. **Hybrid Logging**: Events are logged both client-side and server-side depending on context
   - **Client-Side**: User interface interactions, feature usage, and user-initiated actions
   - **Server-Side**: API usage, system events, and programmatic interactions
2. **Core Actions Only**: We log meaningful user actions, not every button click
3. **Privacy Conscious**: We avoid logging sensitive data like email content, passwords, or document content
4. **Structured Data**: All payloads use consistent TypeScript interfaces
5. **Context Rich**: Events include relevant context for understanding user behavior

### Client-Side vs Server-Side Logging

#### Client-Side Events

- **Location**: Browser/client applications
- **Implementation**: Using `logEvent()` function from `@/lib/analytics`
- **Purpose**: Track user interactions, feature adoption, and UI behavior
- **Examples**: Button clicks, form submissions, navigation, feature usage
- **User Context**: Associated with authenticated user sessions

#### Server-Side Events

- **Location**: API handlers and server functions
- **Implementation**: Using `logServerEvent()` function from `@/lib/analytics-server`
- **Purpose**: Track API usage, system performance, and programmatic interactions
- **Examples**: API requests, system operations, background processes
- **User Context**: Associated with API keys and organization identifiers

Both logging approaches use PostHog as the analytics platform but serve different purposes in understanding user behavior and system usage.

### Event Naming Convention

Events follow a `{object}_{action}` pattern:

- `auth_*` - Authentication related events
- `organization_*` - Organization management events
- `namespace_*` - Namespace management events
- `document_*` - Document management events
- `chat_*` - Chat and conversation events
- `api_*` - API management events
- `team_*` - Team and invitation management events
- `domain_*` - Custom domain management events
- `hosting_*` - Hosting configuration events
- `playground_*` - Playground feature events
- `benchmark_*` - Benchmarking and evaluation events
- `billing_*` - Billing and subscription events
- `connectors_*` - Connectors and integration events

### Adding New Events

#### Client-Side Events

1. Import the `logEvent` function: `import { logEvent } from "@/lib/analytics";`
2. Call it with a descriptive event name and relevant payload
3. Update this documentation with the new event details
4. Ensure the event is only triggered on successful actions (in `onSuccess` callbacks)

#### Server-Side Events

1. Import the server analytics functions: `import { logServerEvent, identifyOrganization, flushServerEvents } from "@/lib/analytics-server";`
2. Use `withApiHandler` or `withNamespaceApiHandler` with logging enabled
3. Events are automatically logged for API requests when logging is configured
4. Custom server events can be logged using `logServerEvent()` directly

### Analytics Platform

Events are sent to PostHog for analysis:

- **Client-side**: `logEvent` function wraps PostHog's client `capture` method (`apps/web/src/lib/analytics.ts`)
- **Server-side**: `logServerEvent` function uses PostHog Node.js client (`apps/web/src/lib/analytics-server.ts`)
