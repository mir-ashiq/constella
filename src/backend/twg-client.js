/**
 * Constella — Teamwork Graph client.
 * Uses ONLY curated queries (no registration step, no persisted Cypher):
 *   atlassianUserInTeams(userId)
 *   atlassianTeamMembers(teamAri)
 *   spacesByAtlassianTeam(teamAri)
 *   atlassianTeamsBySpace(spaceAri)
 *   confluencePageContributors(id), confluencePageCreator(id),
 *   confluencePageOwners(id)
 *   atlassianUserRecentlyViewed(userId, since)
 *   atlassianUserAssignedJiraWorkItems(userId)
 * Doc anchor: developer.atlassian.com/platform/teamwork-graph/curated-queries/
 */
import api from '@forge/api';

// ---------------------------------------------------------------------------
// Low-level GraphQL execution
// ---------------------------------------------------------------------------

/**
 * Execute a Teamwork Graph GraphQL query as the current user.
 * Returns { data, errors } — never throws for GraphQL errors; callers decide.
 */
export async function twg(graphqlQuery, variables) {
  try {
    const response = await api.asUser().requestTeamworkGraph(graphqlQuery, variables);
    if (!response || typeof response.json !== 'function') {
      return { errors: [{ message: 'Teamwork Graph request failed (no response)' }] };
    }
    const json = await response.json();
    if (response.status && response.status >= 400) {
      return { errors: [{ message: `Teamwork Graph HTTP ${response.status}` }, ...((json && json.errors) || [])] };
    }
    return json || { data: null };
  } catch (e) {
    return { errors: [{ message: String(e) }] };
  }
}

// ---------------------------------------------------------------------------
// Curated query wrappers — each maps the graph payload to plain objects.
// Missing scopes yield partial/empty data silently (documented TWG behavior),
// so every wrapper degrades to [] rather than throwing.
// ---------------------------------------------------------------------------

/** Teams a user belongs to. [{ ari, displayName, summary(from description)] */
export async function userTeams(userId) {
  const q = `query constella_userTeams($userId: ID!) {
    atlassianUserInTeams(userId: $userId, first: 25) {
      edges { node {
        ... on AtlassianTeam { id displayName description }
      } }
      pageInfo { hasNextPage }
    }
  }`;
  const res = await twg(q, { userId });
  return extract(res, ['atlassianUserInTeams'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, displayName: n.displayName || 'Unnamed team', summary: n.description || '' };
  });
}

/** Members of a team. [{ ari, displayName }] */
export async function teamMembers(teamAri) {
  const q = `query constella_teamMembers($teamAri: ID!) {
    atlassianTeamMembers(teamAri: $teamAri, first: 50) {
      edges { node { id
        ... on AtlassianUser { id name }
      } }
    }
  }`;
  const res = await twg(q, { teamAri });
  return extract(res, ['atlassianTeamMembers'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, displayName: n.name || 'Unknown' };
  });
}

/** Jira & Confluence spaces linked to a team. [{ ari, title, spaceType }] */
export async function teamSpaces(teamAri) {
  const q = `query constella_teamSpaces($teamAri: ID!) {
    spacesByAtlassianTeam(teamAri: $teamAri, first: 25) {
      edges { node {
        ... on JiraSpace { id title }
        ... on ConfluenceSpace { id title }
      } }
    }
  }`;
  const res = await twg(q, { teamAri });
  return extract(res, ['spacesByAtlassianTeam'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, title: n.title || 'Untitled space', spaceType: (n.id || '').includes(':confluence:') ? 'confluence' : 'jira' };
  });
}

/** Teams linked to a space. [{ ari, displayName, summary, memberCount }] */
export async function spaceTeams(spaceAri) {
  const q = `query constella_spaceTeams($spaceAri: ID!) {
    atlassianTeamsBySpace(spaceAri: $spaceAri, first: 25) {
      edges { node { id
        __typename
        ... on AtlassianTeam { id displayName description }
      } }
    }
  }`;
  const res = await twg(q, { spaceAri });
  return extract(res, ['atlassianTeamsBySpace'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, displayName: n.displayName || 'Unnamed team', summary: n.description || '' };
  });
}

/** Creator / owners / recent contributors of a Confluence page. */
export async function pagePeople(contentId, cloudId) {
  // TWG wants the fully-qualified page ARI including the site's cloudId:
  // ari:cloud:confluence:<cloudId>:page/<id>  (see SDL objects() example).
  const raw = String(contentId);
  let id = raw;
  if (!raw.startsWith('ari:')) {
    id = cloudId
      ? `ari:cloud:confluence:${cloudId}:page/${raw}`
      : `ari:cloud:confluence::page/${raw}`;
  }
  const q = `query constella_pagePeople($id: ID!) {
    creator: confluencePageCreator(id: $id, first: 1) {
      edges { node { ... on AtlassianUser { id name } } }
    }
    owners: confluencePageOwners(id: $id, first: 10) {
      edges { node { ... on AtlassianUser { id name } } }
    }
    contributors: confluencePageContributors(id: $id, first: 20) {
      edges { node { ... on AtlassianUser { id name } } }
    }
  }`;
  const res = await twg(q, { id });
  if (res.errors && res.errors.length && !res.data) return { error: describeErrors(res.errors) };
  const d = res.data || {};
  const mapUser = (n) => (n ? { ari: n.id, displayName: n.name || 'Unknown' } : null);
  const firstNode = (conn) => {
    const edges = (conn && conn.edges) || [];
    return edges.length ? mapUser(edges[0].node) : null;
  };
  return {
    creator: firstNode(d.creator),
    owners: ((d.owners && d.owners.edges) || []).map((e) => mapUser(e.node)).filter(Boolean),
    contributors: ((d.contributors && d.contributors.edges) || []).map((e) => mapUser(e.node)).filter(Boolean),
  };
}

/** What a user recently viewed or was assigned, across tools. */
export async function userRecentWork(userId, sinceDays = 14) {
  const q = `query constella_userWork($userId: ID!, $since: String!) {
    recent: atlassianUserRecentlyViewed(userId: $userId, since: $since, first: 20) {
      edges { node {
        ... on ConfluencePage { id title }
        ... on JiraWorkItem { id title }
      } }
    }
    assigned: atlassianUserAssignedJiraWorkItems(userId: $userId, first: 20) {
      edges { node {
        ... on JiraWorkItem { id title status { name } }
      } }
    }
  }`;
  const res = await twg(q, { userId, since: `P${sinceDays}D` });
  if (res.errors && res.errors.length && !res.data) return { error: describeErrors(res.errors) };
  const d = res.data || {};
  const recent = extractFromEdges(d.recent, (n) => ({
    ari: n.id,
    title: n.title || 'Untitled',
    kind: (n.id || '').includes(':confluence:') ? 'page' : 'jira',
  }));
  const assigned = extractFromEdges(d.assigned, (n) => ({
    ari: n.id,
    title: n.title || 'Untitled',
    status: (n.status && n.status.name) || '',
    kind: 'jira',
  }));
  return { recent, assigned };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFromEdges(wrapper, mapper) {
  const edges = (wrapper && wrapper.edges) || [];
  return edges.map(mapper).filter((x) => x && x.ari);
}

function extract(res, path, mapper) {
  if (res.errors && res.errors.length && !res.data) return { error: describeErrors(res.errors) };
  let node = res.data;
  for (const key of path) node = (node && node[key]) || null;
  return extractFromEdges(node, mapper);
}

function describeErrors(errors) {
  const msgs = (errors || []).map((e) => e.message).filter(Boolean).slice(0, 3);
  return `Teamwork Graph error: ${msgs.join('; ')}`;
}
