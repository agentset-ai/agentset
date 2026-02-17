# E2E Test Bugs

This file documents known bugs that block E2E tests.

---

## Namespace Bugs

### GET /api/v1/namespace/{namespaceId} - Cache Date Serialization Bug

**Status:**  Failing  
**Endpoint:** `GET /api/v1/namespace/{namespaceId}`  
**Test:** `namespace.test.ts` → "should return namespace details"

#### Issue

The `unstable_cache` in `withNamespaceApiHandler` serializes `Date` objects to ISO strings. When `NamespaceSchema.parse()` runs, it expects a `Date` but receives a `string`.

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "unprocessable_entity",
    "message": "invalid_type: createdAt: Invalid input: expected date, received string"
  }
}
```

#### Root Cause

**File:** [src/lib/api/handler/namespace.ts](../../src/lib/api/handler/namespace.ts)

The cache serializes Date objects to strings, but the schema validation expects Date objects.

#### Fix Options

1. Use `z.coerce.date()` in NamespaceSchema
2. Transform dates after cache retrieval
3. Add date normalization layer

---

## Hosting Bugs

### PATCH /api/v1/namespace/{namespaceId}/hosting - rerankConfig Corruption

**Status:**  Failing  
**Endpoint:** `PATCH /api/v1/namespace/{namespaceId}/hosting`  
**Test:** `hosting.test.ts` → "should update hosting config"

#### Issue

When PATCH is called on hosting that doesn't have `rerankConfig` set (null), the update service creates an empty object `{}` which fails validation when the response is serialized.

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "unprocessable_entity",
    "message": "invalid_value: rerankConfig.model: Invalid option: expected one of \"cohere:rerank-v3.5\"..."
  }
}
```

#### Root Cause

**File:** [src/services/hosting/update.ts](../../src/services/hosting/update.ts#L54-L55)

```typescript
const newRerankConfig = hosting.rerankConfig
  ? structuredClone(hosting.rerankConfig)
  : ({} as PrismaJson.HostingRerankConfig);
```

When `hosting.rerankConfig` is null, it creates `{}` which doesn't have a valid `model` property.

Then in line 85:
```typescript
...(newRerankConfig && { rerankConfig: newRerankConfig }),
```

The truthy empty object `{}` is included in the update.

#### Fix Options

1. **Don't create empty object when rerankConfig is null:**
   ```typescript
   const newRerankConfig = hosting.rerankConfig
     ? structuredClone(hosting.rerankConfig)
     : null;
   ```

2. **Only include rerankConfig when it has valid data:**
   ```typescript
   ...(newRerankConfig?.model && { rerankConfig: newRerankConfig }),
   ```

---

### DELETE /api/v1/namespace/{namespaceId}/hosting - Response Serialization Error

**Status:**  Failing (but operation succeeds)  
**Endpoint:** `DELETE /api/v1/namespace/{namespaceId}/hosting`  
**Test:** `hosting.test.ts` → "should delete hosting"

#### Issue

The DELETE endpoint successfully deletes the hosting record but returns a 500 error when trying to serialize the deleted hosting object in the response.

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "internal_server_error",
    "message": "An internal server error occurred..."
  }
}
```

**Note:** The hosting IS successfully deleted despite the error response.

#### Root Cause

**File:** [src/app/api/(public-api)/v1/namespace/[namespaceId]/hosting/route.ts](../../src/app/api/(public-api)/v1/namespace/[namespaceId]/hosting/route.ts#L70-L85)

The DELETE handler:
1. Gets the hosting record
2. Deletes it
3. Tries to return the deleted hosting with `HostingSchema.parse()`

The issue is likely related to the same rerankConfig validation issue - if the hosting had corrupted data, the response parsing fails.

#### Fix Options

1. **Return a simpler response after delete:**
   ```typescript
   return makeApiSuccessResponse({
     data: { deleted: true },
     headers,
     status: 204,
   });
   ```

2. **Don't return body for 204 responses:**
   ```typescript
   return new Response(null, { status: 204, headers });
   ```

---

## Summary

| Bug | Endpoint | Impact | Workaround |
|-----|----------|--------|------------|
| Cache Date Serialization | GET namespace | Response validation fails | Test skipped |
| rerankConfig Corruption | PATCH hosting | Can't update hosting config | Don't use PATCH |
| DELETE Response Error | DELETE hosting | Returns 500 (but deletes) | Ignore response, check GET returns 404 |
