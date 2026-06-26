# `.pi/context/` — Manual Reference Index

Manual-reference docs consulted on demand. These are never auto-injected into the system prompt — load them explicitly when you need the reference material.

| File | Purpose |
|------|---------|
| `architecture.md` | Pi 5-layer kit architecture and dependency rules for the `.pi/` drop-in kit |
| `definition-of-done.md` | Standing project-wide bar every change must clear before counting as done (correctness, quality, integration, docs, ship-readiness) |
| `testing-patterns.md` | Quick reference for common testing patterns across the stack — AAA structure, naming, assertions, mocking, React/API/E2E tests, anti-patterns |
| `security-checklist.md` | Web application security checklist — threat modeling, authn/authz, input validation, headers, CORS, data protection, deps, AI/LLM security, OWASP Top 10 |
| `performance-checklist.md` | Web performance checklist — Core Web Vitals targets, TTFB diagnosis, frontend/backend checklists, measurement commands, anti-patterns |
| `accessibility-checklist.md` | WCAG 2.1 AA compliance checklist — keyboard, screen readers, visual, forms, content, HTML patterns, ARIA, testing tools, anti-patterns |
| `observability-checklist.md` | Production instrumentation checklist — on-call questions, structured logging, metrics, tracing, alerting, dashboards, telemetry verification, pre-launch gate |
| `orchestration-patterns.md` | Agent orchestration pattern catalog — direct invocation, slash commands, parallel fan-out, sequential pipelines, research isolation, anti-patterns, decision flow |

> **Note:** These are manual-reference docs — consulted on demand, never auto-injected into the system prompt.

Checklists `definition-of-done`, `testing-patterns`, `security-checklist`, `performance-checklist`, `accessibility-checklist`, `observability-checklist`, and `orchestration-patterns` are adapted from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT).