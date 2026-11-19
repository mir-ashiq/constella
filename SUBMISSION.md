# Devpost submission draft — Constella (win-grade, ready to paste)
# Updated Nov 18, 2026: solo voice, demo-content seeder, judge-path first.

## Title
Constella — the team knowledge satellite for Confluence

## Elevator pitch (Devpost "tagline", ≤ 200 chars; 196 chars)
Maps the org chart that actually exists — who wrote the pages, who owns them, which team lives where — live from the Atlassian Teamwork Graph. Ask "who do I ask about X?" and get names, not search hits.

## Inspiration
Every newcomer asks the same question: "Who do I ask about X?" The answer lives in the Teamwork Graph — who created the page, who owns it, who edited it last week, which teams live in which space — but until now that graph was invisible. Company directories show the reporting line; they don't show that the onboarding checklist really belongs to Dana, or that the payments runbook is maintained by three people who left the payments team a year ago. I built Constella to make the real one navigable.

## What it does
- **Constellation Map** (Confluence global page): every team you belong to, its members, and its linked Jira + Confluence spaces — resolved live from the Teamwork Graph.
- **Page People byline item**: on any page, see creator, owners, and recent contributors at a glance.
- **Constella Guide agent** (rovo:agent): ask "who owns the onboarding checklist?" or "which teams work in Marketing?" in Rovo chat.
- **Who to ask**: type a topic; Constella searches pages and ranks the people to consult (owners weighted above contributors).
- **MCP server** (rovo:mcp): all 5 tools exposed for your own custom agents.
- **One-click demo content**: on a fresh site with no Confluence content, the map offers "Generate demo content" — it seeds a space with four realistic pages (remote work policy, onboarding guide, Q3 launch plan, incident runbook) and sets the installing user as their owner, so the graph, the search and the byline all have something real to resolve within about a minute.

## How I built it
Forge (UI Kit), curated Teamwork Graph GraphQL queries (atlassianUserInTeams, atlassianTeamMembers, spacesByAtlassianTeam, atlassianTeamsBySpace, confluencePageCreator/Owners/Contributors), Confluence CQL search, Rovo agent + MCP, and the v2 content API for the demo seeder behind write scopes reserved for that path. A pure, tested who-to-ask ranking engine; every TWG wrapper degrades gracefully to [] with the reason surfaced in the UI, so the app never breaks on partial graph data.

## Challenges I ran into
- Teamwork Graph is in Preview: raw Cypher is unavailable to new apps, so I built exclusively on curated queries — no registration step, no propagation delay, resilient to schema drift.
- Missing graph scopes return partial data silently (documented behavior); the UI explains this instead of showing empty states.
- The demo-content problem: a judge's fresh site has an empty graph and my app would have shown nothing. The seeder fixes that, but it had to be safe — idempotent, its own space, clearly labeled, never touching existing content.

## Accomplishments I'm proud of
- A genuinely graph-native app: remove the Teamwork Graph and there is no product left — every surface resolves through it.
- Read-only by design in its core: zero write scopes on any knowledge surface; the only writes are the demo seeder's own labeled space.
- The empty-site experience: a judge on a brand-new site is one click away from a populated constellation instead of a blank page.

## What I learned
The graph rewards curiosity: one curated query (user → teams → spaces) composes into a whole product surface. The hard part is graceful degradation, not querying — and "who to ask" turns out to be a ranking problem (owners over contributors over creators), which is exactly the kind of small, testable logic that builds trust.

## What's next for Constella
Loom/meeting context on the map ("who did I meet about this?"), cross-team dependency views, and a "knowledge health" score per space (stale pages, orphaned pages, single-owner risk).

## Built with (tags)
forge, atlassian, confluence, teamwork-graph, rovo, mcp, ai-agents, react, nodejs, knowledge-management, developer-tools

## Try it out link
https://github.com/mir-ashiq/constella

## Testing instructions (Step 3 field)
1) Click the installation link and approve the app on your Atlassian site (works on free sites). 2) Open Confluence → Apps → Constella. Belong to a team? Your constellation appears — members, linked spaces, drill-ins. 3) NO TEAMS / EMPTY SITE? Click "Generate demo content" — it creates a space with three pages; give Confluence about a minute to index them into the graph, then reload the map and try the "who to ask" search (e.g. "onboarding") and open any demo page to see the byline chip. 4) Rovo Chat → Browse agents → Constella Guide → "Which teams work with the launch plan?" Note: if Rovo chat is not visible on a free site, the map, search and byline still work fully. The app reads only; the demo seeder creates only its own labeled space and never modifies existing content.

## Technology requirement (Step 3 field)
Constella is a Forge app: manifest.yml declares confluence:globalPage, confluence:contentBylineItem, a rovo:agent with 5 actions, and a rovo:mcp server exposing 5 tools. It integrates deeply with Confluence (CQL search, v2 content APIs) and is built on the Atlassian Teamwork Graph through its curated GraphQL queries (user teams, team members, team spaces, space teams, page creator/owners/contributors) — every product surface resolves through the graph.

## Category + bonus
- Category: Apps for Business Teams
- Why this track: Constella serves the people who live in documents rather than tickets — operations, enablement, HR, internal comms — answering the question every business team asks on day one: who actually knows this? It turns Confluence from a place you search into a place you navigate.
- Bonus prize: Best apps with Teamwork Graph integration

## Forge experience / AI tools (Step 3 fields)
- Forge experience: The Teamwork Graph's curated-query model was the pleasant surprise — one well-chosen query composes into an entire product surface, and the per-object scopes make the permission story clean. Friction: the graph is in Preview, so raw Cypher is off the table and some scopes return partial data silently; the graceful-degradation layer I had to build for that ended up making the app more robust. The byline item module took one iteration to size correctly inside Confluence's layout.
- AI tools used: An AI coding agent (GLM via z.ai) for scaffolding, implementation, unit tests and documentation; Atlassian developer documentation and the Forge CLI for API verification and deployment planning.

## Requirements checklist (official rules mapping)
- [x] Forge app + ≥1 Atlassian integration (Confluence, Teamwork Graph, Rovo)
- [x] Category: Apps for Business Teams
- [x] Bonus target: Best apps with Teamwork Graph integration
- [x] Install link + test instructions (README + judge quick path in repo)
- [x] GitHub repo created + pushed: https://github.com/mir-ashiq/constella
- [ ] Demo video < 5 min (script in VIDEO-SCRIPT.md: map → byline → who-to-ask → agent → MCP)
- [ ] Installation link + App ID (after forge deploy — see runbook)
