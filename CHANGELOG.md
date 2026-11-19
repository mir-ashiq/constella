# Changelog

## 1.1.0 — 2026-11-19 (loss-register fixes)
- Fixed: Teamwork Graph scopes (read:teamwork-graph:confluence/:jira) added
  to the manifest — without them every graph surface rendered empty after
  install. This was the app's #1 loss reason.
- Fixed: CQL search phrase-quotes the topic (reserved words like "and" no
  longer break the query).
- Added: demo seeder sets the installing user as each demo page's OWNER and
  returns page metadata; a 4th demo page (HR remote-work policy) broadens
  the business-team story.
- Faster: who-to-ask resolves the top 5 pages' people in parallel.
- UI: UI Kit Textfield, graph-scope troubleshooting banner, space-link hint.
- Agent: 4 conversation starters added.
- CI: GitHub Actions (tests with coverage + manifest parse). Tests 4 → 7.
- Docs: architecture diagram, judge quick path on top.

## 1.0.0 — 2026-11-16
- Initial release: constellation map, byline chip, Guide agent + MCP,
  who-to-ask ranking, demo seeder.
