<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Read the codex docs first

Before exploring the codebase, read the reference files in `docs/codex/` — they index routes, schema, lib exports,
components, and pages so you don't have to re-derive them by grepping:

- `docs/codex/routes.md` — every API route + Server Action file, method/auth/purpose
- `docs/codex/schema.md` — every DB table, fields, FKs, constraints
- `docs/codex/lib.md` — every shared lib export, signature, location
- `docs/codex/components.md` — UI component index, props, client/server
- `docs/codex/pages.md` — full page/route tree, client/server, auth gating
- `docs/codex/architecture.md` — tech stack, design decisions, conventions, gotchas (start here)

If a file seems stale relative to the actual code, trust the code and regenerate the doc.
