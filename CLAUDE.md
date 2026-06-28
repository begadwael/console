@AGENTS.md

# Console

A local-first Next.js dashboard (Overview, Job search, Side work, Projects,
Part-time, Personal). Data lives as JSON in `data/*.json`; the schema is in
[`lib/types.ts`](lib/types.ts).

## Changing dashboard data

To add or change the user's dashboard content (jobs, tasks, projects,
milestones, etc.), **use the `console` MCP server's tools** — e.g.
`add_job`, `create_project`, `add_project_task`, `update_project`. Call
`get_overview` or `list_projects` first to get current state and ids.

Do **not** hand-edit `data/*.json` for routine changes — the MCP tools validate
input and write atomically. (Direct edits are fine only for bulk migrations.)

The server is defined in [`mcp/server.mts`](mcp/server.mts) and registered for
this repo in `.mcp.json`. Changes appear in the dashboard on the next page
refresh.
