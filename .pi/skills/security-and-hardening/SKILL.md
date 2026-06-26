---
name: security-and-hardening
description: Use when auditing for security vulnerabilities, implementing auth/authz, handling secrets, or hardening against OWASP Top 10 — covers input validation, authentication, dependency auditing, and secure defaults
---

# Security & Hardening

> **Replaces** "we'll add security later" with security-by-default patterns applied from the start

## Overview

Security is a constraint, not a feature. It should be present by default and requires explicit justification to relax. Treat every external input as hostile, every secret as sacred, and every authorization check as mandatory. Security isn't a phase — it's a constraint on every line of code that touches user data, authentication, or external systems.

**Core principle:** Validate all input. Authenticate all access. Encrypt all secrets. Audit all dependencies. Trust nothing from outside your process boundary.

## When to Use

- Implementing authentication or authorization
- Handling user input that touches databases, file systems, or external services
- Reviewing code for security vulnerabilities
- Running dependency audits or responding to CVE alerts
- Deploying to production for the first time
- Adding file uploads, webhooks, or callbacks
- Handling payment or PII data
- Integrating with external APIs or services

## When NOT to Use

- Local-only developer tools with no network exposure
- Throwaway prototypes that will never see user data
- Performance optimization (that's a different skill)

## Process: Threat Model First

Controls bolted on without a threat model are guesses. Before hardening, spend five minutes thinking like an attacker:

1. **Map the trust boundaries.** Where does untrusted data cross into your system? HTTP requests, form fields, file uploads, webhooks, third-party APIs, message queues, and **LLM output**. Every boundary is attack surface.
2. **Name the assets.** What's worth stealing or breaking? Credentials, PII, payment data, admin actions, money movement.
3. **Run STRIDE over each boundary** — a quick lens, not a ceremony:

| Threat | Ask | Typical mitigation |
|---|---|---|
| **S**poofing | Can someone impersonate a user/service? | Authentication, signature verification |
| **T**ampering | Can data be altered in transit or at rest? | Integrity checks, parameterized queries, HTTPS |
| **R**epudiation | Can an action be denied later? | Audit logging of security events |
| **I**nformation disclosure | Can data leak? | Encryption, field allowlists, generic errors |
| **D**enial of service | Can it be overwhelmed? | Rate limiting, input size caps, timeouts |
| **E**levation of privilege | Can a user gain rights they shouldn't? | Authorization checks, least privilege |

4. **Write abuse cases next to use cases.** For each feature, ask "how would I misuse this?" — then make that your first test.

If you can't name the trust boundaries for a feature, you're not ready to secure it. This is OWASP **A04: Insecure Design** — most breaches begin in design, not code.

## Security Boundaries

### Always

- Validate and sanitize all user input at the boundary
- Use parameterized queries (never string interpolation for SQL)
- Hash passwords with bcrypt/scrypt/argon2 (never MD5/SHA for passwords)
- Use HTTPS for all external communication
- Store secrets in environment variables, never in code
- Set secure defaults (CORS restrictive, CSP strict, cookies httpOnly+secure)
- Encode output to prevent XSS (use framework auto-escaping, don't bypass it)
- Run `npm audit` (or equivalent) before every release

### Ask First

- Changing authentication mechanism or session handling
- Adding new API endpoints that accept user data
- Modifying CORS policy or CSP headers
- Adding new third-party dependencies with network access
- Storing new types of PII or sensitive data
- Adding file upload handlers
- Granting elevated permissions or roles

### Never

- Commit secrets, API keys, or credentials to git
- Disable CSRF protection
- Use `eval()` or `Function()` with user input
- Trust client-side validation as the only validation
- Log sensitive data (passwords, tokens, PII)
- Disable security headers for convenience
- Use `innerHTML` with user-provided data
- Store sessions in client-accessible storage (localStorage for auth tokens)
- Expose stack traces or internal error details to users

## OWASP Top 10 Patterns

These are prevention patterns, not a ranking. For the 2021 ordering, see the quick-reference table in `references/security-checklist.md`.

### 1. Injection (SQL, NoSQL, Command)

```typescript
// [ ] SQL Injection
const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);

// [x] Parameterized query
const user = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
```

```typescript
// [ ] Command injection
exec(`convert ${filename} output.png`);

// [x] Safe argument passing
execFile("convert", [filename, "output.png"]);
```

### 2. Broken Authentication

```typescript
// [x] Password hashing
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 12); // cost factor 12
const valid = await bcrypt.compare(input, hash);

// [x] Session management
const session = {
  httpOnly: true, // No JS access
  secure: true, // HTTPS only
  sameSite: "lax", // CSRF protection
  maxAge: 3600, // 1 hour expiry
};
```

### 3. Sensitive Data Exposure

```typescript
// [ ] Logging sensitive data
console.log("User login:", { email, password });

// [x] Redact sensitive fields
console.log("User login:", { email, password: "[REDACTED]" });

// [x] API response excludes internal fields
function toPublicUser(user: DbUser): PublicUser {
  const { passwordHash, internalId, ...publicFields } = user;
  return publicFields;
}
```

### 4. Broken Access Control

```typescript
// [ ] No authorization check
app.get("/api/users/:id", async (req, res) => {
  const user = await getUser(req.params.id);
  res.json(user); // Any authenticated user can access any profile
});

// [x] Authorization check
app.get("/api/users/:id", async (req, res) => {
  const user = await getUser(req.params.id);
  if (user.id !== req.auth.userId && !req.auth.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(user);
});
```

### 5. Security Misconfiguration

```typescript
// [x] Secure headers (use helmet for Express)
import helmet from "helmet";
app.use(helmet());

// [x] CORS — restrictive by default
app.use(
  cors({
    origin: ["https://myapp.com"], // Not '*'
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

// [x] CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // No 'unsafe-inline'
      styleSrc: ["'self'", "'unsafe-inline'"], // Only if needed
    },
  }),
);
```

### Server-Side Request Forgery (SSRF)

Any time the server fetches a URL the user influenced — webhooks, "import from URL", image proxies, link previews — an attacker can aim it at internal services (cloud metadata, `localhost`, private IPs).

```typescript
// [ ] fetch whatever the user gives you
await fetch(req.body.webhookUrl);

// [x] allowlist scheme + host, reject if ANY resolved IP is private, forbid redirects
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

const ALLOWED_HOSTS = new Set(["hooks.example.com"]);

async function assertSafeUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("https only");
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error("host not allowed");
  // Resolve ALL records; a single private/reserved address fails the check.
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.some((a) => ipaddr.parse(a.address).range() !== "unicast")) {
    throw new Error("private/reserved IP");
  }
  return url;
}

await fetch(await assertSafeUrl(req.body.webhookUrl), { redirect: "error" });
```

The `range() !== 'unicast'` check covers loopback, link-local `169.254.169.254` (cloud metadata, the #1 SSRF target), private, and unique-local ranges across IPv4 and IPv6.

**Caveat — this still has a TOCTOU gap.** `fetch` resolves DNS again after the check, so an attacker using a short-TTL record can rebind to an internal IP between validation and connection. For high-risk surfaces, resolve once and connect to the pinned IP, or put a filtering agent in front (`request-filtering-agent` / `ssrf-req-filter`).

## Input Validation Patterns

### Schema Validation at Boundaries

```typescript
import { z } from "zod";

// [x] Validate at the boundary
const createUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(254),
  age: z.number().int().min(0).max(150).optional(),
});

// [x] Reject unknown fields
const input = createUserSchema.strict().parse(req.body);
```

| Input Type  | Validation                                   |
| ----------- | -------------------------------------------- |
| String      | Min/max length, regex pattern, trim          |
| Number      | Min/max range, integer check                 |
| Email       | Format validation, max 254 chars             |
| URL         | Protocol whitelist (https only)              |
| File upload | Type whitelist, max size, content validation |
| Array       | Max length, item validation                  |

### File Upload Safety

```typescript
// [x] Restrict file types and sizes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateUpload(file: UploadedFile) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new ValidationError("File type not allowed");
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError("File too large (max 5MB)");
  }
  // Don't trust the file extension — check magic bytes if critical
}
```

## Dependency Audit

### npm Audit Triage

```bash
# Run audit
npm audit

# Decision tree per vulnerability:
# 1. Is it in production dependencies? (devDeps are lower priority)
# 2. Is the vulnerability reachable in our usage?
# 3. Is a patch available? → Update
# 4. No patch? → Find alternative or add compensating control
```

```
npm audit reports a vulnerability
├── Severity: critical or high
│   ├── Is the vulnerable code reachable in your app?
│   │   ├── YES --> Fix immediately (update, patch, or replace the dependency)
│   │   └── NO (dev-only dep, unused code path) --> Fix soon, but not a blocker
│   └── Is a fix available?
│       ├── YES --> Update to the patched version
│       └── NO --> Check for workarounds, consider replacing the dependency, or add to allowlist with a review date
├── Severity: moderate
│   ├── Reachable in production? --> Fix in the next release cycle
│   └── Dev-only? --> Fix when convenient, track in backlog
└── Severity: low
    └── Track and fix during regular dependency updates
```

**Key questions:**
- Is the vulnerable function actually called in your code path?
- Is the dependency a runtime dependency or dev-only?
- Is the vulnerability exploitable given your deployment context (e.g., a server-side vulnerability in a client-only app)?

When you defer a fix, document the reason and set a review date.

| Severity | Action                | Timeline               |
| -------- | --------------------- | ---------------------- |
| Critical | Fix immediately       | Same day               |
| High     | Fix in current sprint | Within 1 week          |
| Medium   | Plan fix              | Within 1 month         |
| Low      | Track and monitor     | Next convenient update |

### Supply Chain Security

`npm audit` catches known CVEs; it won't catch a malicious or typosquatted package. Also:

- [ ] Use lockfile (`package-lock.json` / `pnpm-lock.yaml`) — commit it; install with `npm ci` (not `npm install`) in CI for reproducible builds
- [ ] Pin major versions in production dependencies
- [ ] Review new dependencies before adding (check maintainers, download count, last update) — every dependency is attack surface (OWASP **A06: Vulnerable Components**, **LLM03: Supply Chain**)
- [ ] Enable Dependabot or Renovate for automated updates
- [ ] Use `npm audit` or `pnpm audit` in CI pipeline
- [ ] Be wary of `postinstall` scripts in unfamiliar packages — they run arbitrary code at install time
- [ ] Watch for typosquats — `cross-env` vs `crossenv`, `react-dom` vs `reactdom`

## Secrets Management

| Rule                      | Implementation                                   |
| ------------------------- | ------------------------------------------------ |
| Never in code             | Use `.env` files (gitignored) or secret managers |
| Never in logs             | Redact before logging                            |
| Never in URLs             | Use headers or body for tokens                   |
| Rotate on exposure        | Immediate rotation + audit trail                 |
| Different per environment | Staging keys ≠ production keys                   |
| Least privilege           | Each secret grants minimum required access       |

```bash
# [x] .gitignore
.env
.env.local
.env.*.local
*.key
*.pem
```

**Always check before committing:**
```bash
# Check for accidentally staged secrets
git diff --cached | grep -i "password\|secret\|api_key\|token"
```

**If a secret is ever committed, rotate it.** Deleting the line or rewriting history is not enough — assume it's compromised the moment it reaches a remote. Revoke and reissue the key first, then purge it from history.

## Rate Limiting

```typescript
// [x] Basic rate limiting
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});

app.use("/api/", limiter);

// [x] Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
});
app.use("/api/auth/", authLimiter);
```

## Securing AI / LLM Features

If your app calls an LLM — chatbots, summarizers, agents, RAG — it inherits a new attack surface. Map it to the [OWASP Top 10 for LLM Applications (2025)](https://genai.owasp.org/llm-top-10/):

- **Treat all model output as untrusted input (LLM05: Improper Output Handling).** Never pass LLM output straight into `eval`, SQL, a shell, `innerHTML`, or a file path. Validate and encode it exactly as you would raw user input.
- **Assume prompts can be hijacked (LLM01: Prompt Injection).** Untrusted text in the context window — a user message, a fetched web page, a PDF — can carry instructions. The system prompt is not a security boundary; enforce permissions in code, not in the prompt.
- **Keep secrets and other users' data out of prompts (LLM02 / LLM07).** Anything in the context can be echoed back. Don't put API keys, cross-tenant data, or the full system prompt where the model can repeat it.
- **Constrain tool and agent permissions (LLM06: Excessive Agency).** Scope tools to the minimum, require confirmation for destructive or irreversible actions, and validate every tool argument.
- **Bound consumption (LLM10: Unbounded Consumption).** Cap tokens, request rate, and loop/recursion depth so a crafted input can't run up cost or hang the system.
- **Isolate retrieval data (LLM08: Vector and Embedding Weaknesses).** In RAG, treat the vector store as a trust boundary: partition embeddings per tenant so one user can't retrieve another's data, and validate documents before indexing so poisoned content can't steer answers.

```typescript
// [ ] trusting model output as a command or as markup
const sql = await llm.generate(`Write SQL for: ${userQuestion}`);
await db.query(sql);                                   // arbitrary query execution
container.innerHTML = await llm.reply(userMessage);   // stored XSS, via the model

// [x] model output is data — parse defensively, then validate, then encode
let intent;
try {
  intent = CommandSchema.parse(JSON.parse(await llm.replyJson(userMessage)));
} catch {
  throw new ValidationError("unexpected model output"); // JSON.parse or schema failed
}
await runAllowlistedAction(intent.action, intent.params);
container.textContent = await llm.reply(userMessage);
```

## Security Review Checklist

```markdown
### Authentication
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (salt rounds ≥ 12)
- [ ] Session tokens are httpOnly, secure, sameSite
- [ ] Login has rate limiting
- [ ] Password reset tokens expire

### Authorization
- [ ] Every endpoint checks user permissions
- [ ] Users can only access their own resources
- [ ] Admin actions require admin role verification

### Input
- [ ] All user input validated at the boundary
- [ ] SQL queries are parameterized
- [ ] HTML output is encoded/escaped
- [ ] Server-side URL fetches are allowlisted (no SSRF to internal services)

### Data
- [ ] No secrets in code or version control
- [ ] Sensitive fields excluded from API responses
- [ ] PII encrypted at rest (if applicable)

### Infrastructure
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited for vulnerabilities
- [ ] Error messages don't expose internals

### Supply Chain
- [ ] Lockfile committed; CI installs with `npm ci`
- [ ] New dependencies reviewed (maintenance, downloads, postinstall scripts)

### AI / LLM (if used)
- [ ] Model output treated as untrusted (no eval/SQL/innerHTML/shell)
- [ ] Secrets and other users' data kept out of prompts
- [ ] Tool/agent permissions scoped; destructive actions require confirmation
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is an internal tool, security doesn't matter" | Internal tools get compromised. Attackers target the weakest link. |
| "We'll add security later" | Security retrofitting is 10x harder than building it in. Add it now. |
| "No one would try to exploit this" | Automated scanners will find it. Security by obscurity is not security. |
| "The framework handles security" | Frameworks provide tools, not guarantees. You still need to use them correctly. |
| "It's just a prototype" | Prototypes become production. Security habits from day one. |
| "The audit has too many warnings" | Triage by severity. Critical/High first, Low can wait. |
| "Threat modeling is overkill here" | Five minutes of "how would I attack this?" prevents the design flaws no control can patch later. |
| "It's just LLM output, it's only text" | That "text" can be a SQL statement, a script tag, or a shell command. Treat it like any untrusted input. |

## Red Flags — STOP

- String concatenation in SQL queries
- Passwords stored in plaintext or MD5/SHA
- API keys or secrets in source code
- CORS set to `*` in production
- No rate limiting on authentication endpoints
- User input passed directly to `exec()`, `eval()`, or file system operations
- Dependencies with known critical CVEs
- No input validation at API boundaries
- Server fetches user-supplied URLs without an allowlist (SSRF)
- LLM/model output passed into a query, the DOM, a shell, or `eval`
- Secrets, PII, or the full system prompt placed inside an LLM context window

## Verification

After implementing security-relevant code:

- [ ] All user input validated with schemas at API boundaries
- [ ] SQL queries use parameterized statements
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (cost ≥ 12)
- [ ] No secrets in source code or logs
- [ ] CORS, CSP, and security headers configured
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] Rate limiting on authentication and sensitive endpoints
- [ ] Authorization checks on all protected resources
- [ ] Server-side URL fetches validated against an allowlist (no SSRF)
- [ ] LLM/model output validated and encoded before use (if AI features present)

## See Also

- **defense-in-depth** — Validation at every layer, not just the boundary
- **api-and-interface-design** — Error responses that don't leak internals
- **ci-cd-and-automation** — Running security checks in CI pipeline
- `references/security-checklist.md` — detailed security checklists and pre-commit verification steps