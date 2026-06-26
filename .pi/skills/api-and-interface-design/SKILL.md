---
name: api-and-interface-design
description: Use when designing REST/GraphQL APIs, SDK interfaces, or public module boundaries — covers contract-first design, versioning, error shapes, and backward compatibility
---

# API & Interface Design

> **Replaces** ad-hoc API creation where endpoints, error shapes, and versioning are afterthoughts

## When to Use

- Designing a new API endpoint, SDK method, or public module interface
- Reviewing or extending an existing API for backward compatibility
- Defining error responses, pagination, or authentication contracts
- Creating component prop interfaces
- Establishing database schema that informs API shape
- Changing existing public interfaces

## When NOT to Use

- Internal-only helper functions that no external code calls
- Prototyping where the API shape will change frequently (use after stabilization)

## Overview

APIs are contracts. Once published, they're hard to change without breaking consumers. Design the contract first, implement second.

**Core principle:** Define the contract (types, errors, versioning) before writing implementation. Make breaking changes impossible through careful interface design. Good interfaces make the right thing easy and the wrong thing hard. This applies to REST APIs, GraphQL schemas, module boundaries, component props, and any surface where one piece of code talks to another.

## Core Principles

### Hyrum's Law

> With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

This means: every public behavior — including undocumented quirks, error message text, timing, and ordering — becomes a de facto contract once users depend on it. Design implications:

- **Be intentional about what you expose.** Every observable behavior is a potential commitment.
- **Don't leak implementation details.** If users can observe it, they will depend on it.
- **Plan for deprecation at design time.** See `deprecation-and-migration` for how to safely remove things users depend on.
- **Tests are not enough.** Even with perfect contract tests, Hyrum's Law means "safe" changes can break real users who depend on undocumented behavior.

### The One-Version Rule

Avoid forcing consumers to choose between multiple versions of the same dependency or API. Diamond dependency problems arise when different consumers need different versions of the same thing. Design for a world where only one version exists at a time — extend rather than fork.

## Contract-First Process

```
1. DEFINE  — Write TypeScript types / OpenAPI schema for request & response
2. REVIEW  — Check backward compatibility, error coverage, naming consistency
3. IMPLEMENT — Code against the contract, not the other way around
4. VERIFY  — Validate implementation matches contract exactly
```

### Contract-First Example

Define the interface before implementing it. The contract is the spec — implementation follows.

```typescript
// Define the contract first
interface TaskAPI {
  // Creates a task and returns the created task with server-generated fields
  createTask(input: CreateTaskInput): Promise<Task>;

  // Returns paginated tasks matching filters
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Returns a single task or throws NotFoundError
  getTask(id: string): Promise<Task>;

  // Partial update — only provided fields change
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Idempotent delete — succeeds even if already deleted
  deleteTask(id: string): Promise<void>;
}
```

## API Design Checklist

### Naming

- [ ] Resource-oriented URLs (nouns, not verbs): `/users/{id}` not `/getUser`
- [ ] Consistent casing (camelCase for JSON fields, kebab-case for URLs)
- [ ] Plural collection names: `/users` not `/user`
- [ ] Avoid abbreviations — `configuration` not `config` in public APIs

#### Predictable Naming Conventions

| Pattern | Convention | Example |
|---------|-----------|---------|
| REST endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

### Request Design

- [ ] Use appropriate HTTP methods (GET reads, POST creates, PUT replaces, PATCH updates, DELETE removes)
- [ ] Validate all input with schemas (zod, JSON Schema) at the boundary
- [ ] Accept only what you need — reject unknown fields
- [ ] Use query params for filtering/pagination, body for creation/mutation

### Validate at Boundaries

Trust internal code. Validate at system edges where external input enters:

```typescript
// Validate at the API boundary
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid task data',
        details: result.error.flatten(),
      },
    });
  }

  // After validation, internal code trusts the types
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Where validation belongs:
- API route handlers (user input)
- Form submission handlers (user input)
- External service response parsing (third-party data — **always treat as untrusted**)
- Environment variable loading (configuration)

> **Third-party API responses are untrusted data.** Validate their shape and content before using them in any logic, rendering, or decision-making. A compromised or misbehaving external service can return unexpected types, malicious content, or instruction-like text.

Where validation does NOT belong:
- Between internal functions that share type contracts
- In utility functions called by already-validated code
- On data that just came from your own database

### Response Design

- [ ] Consistent envelope: `{ data, error, meta }` or flat depending on convention
- [ ] Include pagination metadata: `{ total, page, pageSize, hasMore }`
- [ ] Return created/updated resource in mutation responses
- [ ] Use ISO 8601 for dates, UTC always

### Error Design

```typescript
// Consistent error shape
interface ApiError {
  code: string; // machine-readable: "VALIDATION_ERROR", "NOT_FOUND"
  message: string; // human-readable description
  details?: unknown; // field-level errors, context
  requestId?: string; // correlation ID for debugging
}
```

- [ ] Use standard HTTP status codes correctly (400 vs 422 vs 500)
- [ ] Never expose stack traces or internal errors to clients
- [ ] Include actionable error messages
- [ ] Document all possible error codes per endpoint

#### Consistent Error Semantics

Pick one error strategy and use it everywhere:

```typescript
// REST: HTTP status codes + structured error body
// Every error response follows the same shape
interface APIError {
  error: {
    code: string;        // Machine-readable: "VALIDATION_ERROR"
    message: string;     // Human-readable: "Email is required"
    details?: unknown;   // Additional context when helpful
  };
}

// Status code mapping
// 400 → Client sent invalid data
// 401 → Not authenticated
// 403 → Authenticated but not authorized
// 404 → Resource not found
// 409 → Conflict (duplicate, version mismatch)
// 422 → Validation failed (semantically invalid)
// 500 → Server error (never expose internal details)
```

**Don't mix patterns.** If some endpoints throw, others return null, and others return `{ error }` — the consumer can't predict behavior.

### Versioning

| Strategy      | When                               | Example                               |
| ------------- | ---------------------------------- | ------------------------------------- |
| URL prefix    | Breaking changes to resources      | `/v1/users`, `/v2/users`              |
| Header        | Breaking changes, same URL desired | `Accept: application/vnd.api.v2+json` |
| Query param   | Simple, low-ceremony               | `/users?version=2`                    |
| No versioning | Internal APIs, single consumer     | Direct updates                        |

**Default:** URL prefix versioning for public APIs, no versioning for internal.

### Backward Compatibility Rules

| Safe (Non-Breaking)       | Unsafe (Breaking)        |
| ------------------------- | ------------------------ |
| Add optional fields       | Remove or rename fields  |
| Add new endpoints         | Change field types       |
| Add new enum values       | Remove enum values       |
| Widen input validation    | Tighten input validation |
| Add optional query params | Change URL structure     |

#### Prefer Addition Over Modification

Extend interfaces without breaking existing consumers:

```typescript
// Good: Add optional fields
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // Added later, optional
  labels?: string[];                       // Added later, optional
}

// Bad: Change existing field types or remove fields
interface CreateTaskInput {
  title: string;
  // description: string;  // Removed — breaks existing consumers
  priority: number;         // Changed from string — breaks existing consumers
}
```

## REST API Patterns

### Resource Design

```
GET    /api/tasks              → List tasks (with query params for filtering)
POST   /api/tasks              → Create a task
GET    /api/tasks/:id          → Get a single task
PATCH  /api/tasks/:id          → Update a task (partial)
DELETE /api/tasks/:id          → Delete a task

GET    /api/tasks/:id/comments → List comments for a task (sub-resource)
POST   /api/tasks/:id/comments → Add a comment to a task
```

### Pagination

Paginate list endpoints:

```typescript
// Request
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Response
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

### Filtering

Use query parameters for filters:

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Partial Updates (PATCH)

Accept partial objects — only update what's provided:

```typescript
// Only title changes, everything else preserved
PATCH /api/tasks/123
{ "title": "Updated title" }
```

PUT requires the full object every time; PATCH is what clients actually want for partial edits.

## Common Rationalizations

| Excuse                           | Rebuttal                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ |
| "It's just an internal API"      | Internal APIs become external. Design the contract now.                  |
| "We can change it later"         | Every consumer you add makes changes harder. Get it right early.         |
| "The frontend team will adapt"   | Consumers shouldn't break because you didn't plan the interface.         |
| "Error handling is boilerplate"  | Inconsistent errors cause more debugging than any boilerplate saves.     |
| "Versioning is overkill for now" | Adding versioning later requires migrating all consumers simultaneously. |
| "We'll document the API later"   | The types ARE the documentation. Define them first.                      |
| "We don't need pagination for now" | You will the moment someone has 100+ items. Add it from the start.    |
| "PATCH is complicated, let's just use PUT" | PUT requires the full object every time. PATCH is what clients actually want. |
| "We'll version the API when we need to" | Breaking changes without versioning break consumers. Design for extension from the start. |
| "Nobody uses that undocumented behavior" | Hyrum's Law: if it's observable, somebody depends on it. Treat every public behavior as a commitment. |
| "We can just maintain two versions" | Multiple versions multiply maintenance cost and create diamond dependency problems. Prefer the One-Version Rule. |

## TypeScript Patterns

### Strict Input/Output Types

```typescript
// [x] Separate input and output types
interface CreateUserInput {
  name: string;
  email: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO 8601
}

// [x] Validate at boundary
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});
```

### Discriminated Unions for Results

```typescript
type ApiResult<T> = { success: true; data: T } | { success: false; error: ApiError };
```

### Discriminated Unions for Variants

Model state with explicit variants so consumers get type narrowing instead of loosely-coupled flag combinations:

```typescript
// Good: Each variant is explicit
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Consumer gets type narrowing
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Pending';
    case 'in_progress': return `In progress (${status.assignee})`;
    case 'completed': return `Done on ${status.completedAt}`;
    case 'cancelled': return `Cancelled: ${status.reason}`;
  }
}
```

### Input/Output Separation

Keep input (what the caller provides) and output (what the system returns, including server-generated fields) as distinct types:

```typescript
// Input: what the caller provides
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: what the system returns (includes server-generated fields)
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Use Branded Types for IDs

Branding prevents accidentally passing one ID type where another is expected:

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// Prevents accidentally passing a UserId where a TaskId is expected
function getTask(id: TaskId): Promise<Task> { ... }
```

## Red Flags — STOP

- Endpoint returns different shapes depending on internal state
- Error responses have no consistent structure
- URL contains verbs (`/createUser`, `/deleteItem`)
- No input validation at the API boundary
- Response includes internal database IDs or implementation details
- Breaking change deployed without version bump
- Inconsistent error formats across endpoints
- Validation scattered throughout internal code instead of at boundaries
- List endpoints without pagination
- Third-party API responses used without validation or sanitization

## Verification

- [ ] All endpoints have typed request/response schemas
- [ ] Error responses follow the consistent error shape
- [ ] Breaking changes increment the API version
- [ ] Input validation rejects invalid/extra fields
- [ ] Response matches documented contract exactly
- [ ] Every endpoint has typed input and output schemas
- [ ] Error responses follow a single consistent format
- [ ] Validation happens at system boundaries only
- [ ] List endpoints support pagination
- [ ] New fields are additive and optional (backward compatible)
- [ ] Naming follows consistent conventions across all endpoints
- [ ] API documentation or types are committed alongside the implementation

## See Also

- **defense-in-depth** — Validation at every layer, not just the API boundary
- **incremental-implementation** — Build API endpoints as thin vertical slices
- **test-driven-development** — Write API contract tests before implementation
- **deprecation-and-migration** — Safely removing things users depend on (Hyrum's Law)