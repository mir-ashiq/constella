/**
 * Constella — Forge entry point (resolver + 5 Rovo/MCP actions).
 */
import Resolver from '@forge/resolver';
import {
  userTeams, teamMembers, teamSpaces, spaceTeams, pagePeople, userRecentWork,
} from './backend/twg-client';
import { searchPages } from './backend/confluence-client';
import { seedDemoData } from './backend/demo-seeder';

// ---------------------------------------------------------------------------
// Resolver (frontend bridge) — request.context carries accountId per call
// ---------------------------------------------------------------------------
const resolver = new Resolver();

// Empty-site rescue: one click seeds a demo space + 3 pages so the
// constellation, search and byline have graph data to work with.
resolver.define('seedDemo', async () => seedDemoData());

resolver.define('getMyTeams', async (req) => {
  const ari = accountIdToAri(req?.context?.accountId);
  if (!ari) return { error: 'No user in context.' };
  const teams = await userTeams(ari);
  if (teams.error) return teams;
  return { ari, teams };
});

resolver.define('getTeamDetail', async ({ payload }) => {
  const teamAri = String(payload.teamAri || '');
  if (!teamAri) return { error: 'No team specified.' };
  const [members, spaces] = await Promise.all([teamMembers(teamAri), teamSpaces(teamAri)]);
  return {
    teamAri,
    members: members.error ? [] : members,
    spaces: spaces.error ? [] : spaces,
  };
});

resolver.define('getSpaceTeams', async ({ payload }) => {
  const spaceAri = String(payload.spaceAri || '');
  if (!spaceAri) return { error: 'No space specified.' };
  const teams = await spaceTeams(spaceAri);
  return { spaceAri, teams: teams.error ? [] : teams };
});

resolver.define('getPagePeople', async ({ payload }) => {
  const contentId = String(payload.contentId || '');
  if (!contentId) return { error: 'No page specified.' };
  return pagePeople(contentId);
});

resolver.define('whoToAsk', async ({ payload }) => {
  return whoToAsk(String(payload.topic || ''));
});

export const handler = resolver.getDefinitions();

// ---------------------------------------------------------------------------
// Current-user ARI (resolver context → identity)
// ---------------------------------------------------------------------------
function accountIdToAri(accountId) {
  if (!accountId) return null;
  return `ari:cloud:identity::user/${accountId}`;
}

// ---------------------------------------------------------------------------
// Rovo agent / MCP actions
// ---------------------------------------------------------------------------
export async function actGetPagePeople(payload) {
  const contentId = payload?.contentId || payload?.context?.confluence?.contentId;
  if (!contentId) return 'No page specified.';
  const r = await pagePeople(String(contentId));
  if (r.error) return r.error;
  const lines = [];
  if (r.creator) lines.push(`Creator: ${r.creator.displayName}`);
  if (r.owners.length) lines.push(`Owners: ${r.owners.map((u) => u.displayName).join(', ')}`);
  if (r.contributors.length) lines.push(`Recent contributors: ${r.contributors.map((u) => u.displayName).join(', ')}`);
  return lines.length ? lines.join('\n') : 'No people data found for this page.';
}

export async function actGetSpaceTeams(payload) {
  const spaceAri = payload?.spaceAri;
  if (!spaceAri) return 'No space specified. Ask the user for the space name or use the Constella page.';
  const teams = await spaceTeams(String(spaceAri));
  if (teams.error) return teams.error;
  if (!teams.length) return 'No teams are linked to this space yet.';
  return `Teams in this space: ${teams.map((t) => t.displayName).join(', ')}.`;
}

export async function actGetUserTeams(payload) {
  const userId = payload?.userId;
  if (!userId) return 'No user specified.';
  const teams = await userTeams(String(userId));
  if (teams.error) return teams.error;
  if (!teams.length) return 'This user belongs to no teams (or teams data is unavailable).';
  const detail = await Promise.all(teams.slice(0, 3).map(async (t) => {
    const spaces = await teamSpaces(t.ari);
    return spaces.error ? `${t.displayName} (spaces unavailable)` : `${t.displayName} — ${spaces.length} linked space(s)`;
  }));
  return `Teams: ${detail.join('; ')}.`;
}

export async function actGetUserRecentWork(payload) {
  const userId = payload?.userId;
  if (!userId) return 'No user specified.';
  const r = await userRecentWork(String(userId));
  if (r.error) return r.error;
  const parts = [];
  if (r.recent.length) parts.push(`Recently viewed: ${r.recent.slice(0, 5).map((w) => w.title).join(', ')}`);
  if (r.assigned.length) parts.push(`Assigned Jira work: ${r.assigned.slice(0, 5).map((w) => `${w.title} (${w.status})`).join(', ')}`);
  return parts.length ? parts.join('\n') : 'No recent work data found for this user.';
}

export async function actWhoToAsk(payload) {
  const topic = payload?.topic || payload?.context?.confluence?.pageTitle;
  if (!topic) return 'No topic specified.';
  const r = await whoToAsk(String(topic));
  if (r.error) return r.error;
  if (!r.people.length) return `No page matches "${topic}" — try a different keyword.`;
  const lines = [`For "${topic}", the best people to ask are:`];
  r.people.slice(0, 3).forEach((p, i) => {
    lines.push(`${i + 1}. ${p.displayName} — ${p.reason}`);
  });
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Core: who-to-ask ranking (pure, testable)
// ---------------------------------------------------------------------------
export async function whoToAsk(topic) {
  const pages = await searchPages(topic, 10);
  if (!pages.length) return { people: [] };
  const people = new Map();
  // Resolve the top 5 pages' people in parallel — the graph is fast enough
  // for 5 concurrent curated queries and the UI feels instant.
  const topPages = pages.slice(0, 5);
  const peopleByPage = await Promise.all(topPages.map((p) => pagePeople(p.contentId)));
  for (let i = 0; i < topPages.length; i++) {
    const p = topPages[i];
    const pp = peopleByPage[i];
    if (pp.error) continue;
    const add = (u, reason, weight) => {
      if (!u) return;
      const key = u.ari || u.displayName;
      const cur = people.get(key) || { displayName: u.displayName, ari: u.ari, score: 0, reasons: new Set() };
      cur.score += weight;
      cur.reasons.add(`${p.title} (${reason})`);
      people.set(key, cur);
    };
    add(pp.creator, 'creator', 2);
    pp.owners.forEach((u) => add(u, 'owner', 3));
    pp.contributors.forEach((u) => add(u, 'contributor', 1));
  }
  const ranked = [...people.values()].sort((a, b) => b.score - a.score).map((p) => ({
    displayName: p.displayName,
    ari: p.ari,
    reason: [...p.reasons].slice(0, 2).join('; '),
    score: p.score,
  }));
  return { people: ranked };
}
