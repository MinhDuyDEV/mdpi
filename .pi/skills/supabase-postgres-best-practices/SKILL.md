---
name: supabase-postgres-best-practices
description: MUST load when writing, reviewing, or optimizing Postgres queries, schema designs, indexes, or RLS policies in Supabase. Covers Supabase-specific Postgres performance patterns and common pitfalls.
---

# Supabase Postgres Best Practices

## When to Use

- When optimizing or reviewing Postgres performance, schemas, or queries with Supabase guidance.

## When NOT to Use

- When the task is not related to Postgres performance or schema design.


## When to Apply

Reference these guidelines when:

- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category                 | Impact      | Prefix      |
| -------- | ------------------------ | ----------- | ----------- |
| 1        | Query Performance        | CRITICAL    | `query-`    |
| 2        | Connection Management    | CRITICAL    | `conn-`     |
| 3        | Security & RLS           | CRITICAL    | `security-` |
| 4        | Schema Design            | HIGH        | `schema-`   |
| 5        | Concurrency & Locking    | MEDIUM-HIGH | `lock-`     |
| 6        | Data Access Patterns     | MEDIUM      | `data-`     |
| 7        | Monitoring & Diagnostics | LOW-MEDIUM  | `monitor-`  |
| 8        | Advanced Features        | LOW         | `advanced-` |

## How to Use

Read individual rule files for detailed explanations and SQL examples:

```
rules/query-missing-indexes.md
rules/schema-partial-indexes.md
rules/_sections.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect SQL example with explanation
- Correct SQL example with explanation
- Optional EXPLAIN output or metrics
- Additional context and references
- Supabase-specific notes (when applicable)

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The ORM handles query optimization" | ORMs generate correct SQL, not efficient SQL. Review query plans. |
| "This query is fast enough for now" | "Fast enough" at 100 rows is broken at 100K rows. Test with realistic data volumes. |
| "I don't need to understand EXPLAIN output" | EXPLAIN is the difference between guessing and knowing. Learn it. |

## Red Flags

- Queries without EXPLAIN ANALYZE review
- Missing indexes on foreign key columns used in JOINs
- SELECT * on tables with large text/JSONB columns
- No connection pooling configured
- COUNT(*) used without WHERE on large tables

## Verification

After writing Supabase Postgres queries:

- [ ] EXPLAIN ANALYZE output reviewed for each new query
- [ ] Indexes exist on columns used in WHERE, JOIN, and ORDER BY
- [ ] COUNT(*) queries on large tables use estimates or caching
- [ ] Connection pooling is configured for production
- [ ] Query performance is measured under realistic data volume
