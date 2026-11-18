# Devpost submission draft (copy into the submission form fields)

## Title
Constella — the team knowledge satellite for Confluence

## One-liner
Companies have two org charts: the reporting line and the real one — the
people who actually wrote the pages. Constella maps the second one, live
from the Atlassian Teamwork Graph.

## Inspiration
Every newcomer asks the same question: "Who do I ask about X?" The answer
lives in the Teamwork Graph — who created the page, who owns it, who edited
it last week, which teams live in which space — but until now that graph was
invisible. Constella makes it navigable.

## What it does
- **Constellation Map** (Confluence global page): every team you belong to,
  its members, and its linked Jira + Confluence spaces — resolved live from
  the Teamwork Graph.
- **Page People byline item**: on any page, hover the byline to see creator,
  owners, and recent contributors.
- **Constella Guide agent** (rovo:agent): ask "who owns the onboarding
  checklist?" or "which teams work in Marketing?" in Rovo chat.
- **Who to ask**: type a topic; Constella searches pages and ranks the people
  to consult (owners weighted above contributors).
- **MCP server** (rovo:mcp): all 5 tools exposed for your own custom agents.

## How we built it
Forge (UI Kit), curated Teamwork Graph GraphQL queries (atlassianUserInTeams,
atlassianTeamMembers, spacesByAtlassianTeam, atlassianTeamsBySpace,
confluencePageCreator/Owners/Contributors), Confluence CQL search, Rovo agent
+ MCP. A pure, tested who-to-ask ranking engine; every TWG wrapper degrades
gracefully to [] with the reason surfaced in the UI.

## Challenges we ran into
- Teamwork Graph is in Preview: raw Cypher is unavailable to new apps, so we
  built exclusively on curated queries — no registration step, no propagation
  delay, resilient to schema drift.
- Missing graph scopes return partial data silently (documented behavior);
  the UI explains this instead of showing empty states.

## Accomplishments we're proud of
- A genuinely graph-native app: remove the Teamwork Graph and there is no
  product left — every surface resolves through it.
- Read-only by design: zero write scopes anywhere.

## What we learned
The graph rewards curiosity: one curated query (user → teams → spaces)
composes into a whole product surface. The hard part is graceful degradation,
not querying.

## What's next for Constella
Loom/meeting context on the map ("who did I meet about this?"), cross-team
dependency views, and a "knowledge health" score per space (stale pages,
orphaned pages, single-owner risk).

## Built with
Forge, Teamwork Graph (curated queries), Confluence CQL, Rovo agent, MCP,
React (UI Kit), Node.js

---

## Requirements checklist (official rules mapping)
- [x] Forge app + ≥1 Atlassian integration (Confluence, Teamwork Graph, Rovo)
- [x] Category: Apps for Business Teams
- [x] Bonus targets: Best apps with Teamwork Graph integration; Best Marketplace published app
- [x] Install link + test instructions (README + DEPLOY notes in repo)
- [x] GitHub repo created + pushed: https://github.com/mir-ashiq/constella
- [ ] Demo video < 5 min (script in VIDEO-SCRIPT.md: map → byline → who-to-ask → agent → MCP)
- [x] Marketplace review-ticket link (start the listing in week 2; link the ticket)
