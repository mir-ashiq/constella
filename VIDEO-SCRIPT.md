# Constella — demo video script (target: 2:45, hard cap 5:00)

Record from the judge-account site (doubles as install-flow proof).
1080p, browser zoom ~110%, site seeded with ≥2 teams, linked spaces,
pages with distinct owners/editors.

| Time | Section | Screen | Narration (say this) |
|---|---|---|---|
| 0:00 | Hook | Constellation Map with teams visible | "Every company has two org charts: the reporting line, and the real one — the people who actually wrote the pages. This is Constella: the team knowledge satellite that maps the second one, live from the Atlassian Teamwork Graph." |
| 0:20 | The map | Drill into a team: members + linked spaces | "Your teams, their members, and the Jira and Confluence spaces each team actually lives in — resolved from the graph, not from a sync job or a spreadsheet." |
| 0:45 | Page people | Open a page, hover the byline item | "On any page, the byline answers the question you actually have: who created this, who owns it, who touched it last. Not just the last editor — the owners." |
| 1:10 | Who to ask | Type "onboarding" in Who should I ask? | "Type a topic and Constella ranks the people to consult — owners weighted above contributors, aggregated across every matching page." |
| 1:35 | The agent | Rovo chat: "Which teams work in the Marketing space?" | "Constella is also a Rovo agent. Ask it who owns a page, which teams live in a space, or who to talk to — it answers from the same graph, and never invents names." |
| 2:00 | MCP | Show the manifest rovo:mcp block | "All five tools are exposed over Atlassian MCP, so your own custom agents can call them." |
| 2:20 | How it's built | Architecture section of README | "Built on Forge with curated Teamwork Graph queries — no registration step, no Cypher text, resilient while the API is still in Preview. Read-only by design: the app has zero write scopes." |
| 2:40 | Close | Constellation Map again | "Constella: know who's behind the knowledge. Built on Forge, Confluence, Teamwork Graph, and Rovo." |

Rules mapping (keep in final cut):
- Show the app installed on a real site (Testing Access requirement).
- Show TWG queries returning **real** data (the bonus prize is specifically
  about Teamwork Graph integration — make the graph visibly the data source).
- Show the rovo:agent and rovo:mcp surfaces (Agents/MCP bonus evidence).
