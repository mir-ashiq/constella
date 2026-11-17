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

/** Teams a user belongs to. [{ ari, displayName, summary ]] */
export async function userTeams(userId) {
  const q = `query UserTeams($userId: ID!) {
    atlassianUserInTeams(userId: $userId, first: 25) {
      edges { node { id
        ... on AtlassianTeam { id displayName summary }
      } }
      pageInfo { hasNextPage }
    }
  }`;
  const res = await twg(q, { userId });
  return extract(res, ['atlassianUserInTeams'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, displayName: n.displayName || 'Unnamed team', summary: n.summary || '' };
  });
}

/** Members of a team. [{ ari, displayName }] */
export async function teamMembers(teamAri) {
  const q = `query TeamMembers($teamAri: ID!) {
    atlassianTeamMembers(teamAri: $teamAri, first: 50) {
      edges { node { id
        ... on AtlassianUser { id displayName }
      } }
    }
  }`;
  const res = await twg(q, { teamAri });
  return extract(res, ['atlassianTeamMembers'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, displayName: n.displayName || 'Unknown' };
  });
}

/** Jira & Confluence spaces linked to a team. [{ ari, title, spaceType }] */
export async function teamSpaces(teamAri) {
  const q = `query TeamSpaces($teamAri: ID!) {
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
  const q = `query SpaceTeams($spaceAri: ID!) {
    atlassianTeamsBySpace(spaceAri: $spaceAri, first: 25) {
      edges { node { id
        ... on AtlassianTeam { id displayName summary }
      } }
    }
  }`;
  const res = await twg(q, { spaceAri });
  return extract(res, ['atlassianTeamsBySpace'], (edge) => {
    const n = edge.node || {};
    return { ari: n.id, displayName: n.displayName || 'Unnamed team', summary: n.summary || '' };
  });
}

/** Creator / owners / recent contributors of a Confluence page. */
export async function pagePeople(contentId) {
  const q = `query PagePeople($id: ID!) {
    creator: confluencePageCreator(id: $id) {
      ... on AtlassianUser { id displayName }
    }
    owners: confluencePageOwners(id: $id, first: 10) {
      edges { node { ... on AtlassianUser { id displayName } } }
    }
    contributors: confluencePageContributors(id: $id, first: 20) {
      edges { node { ... on AtlassianUser { id displayName } } }
    }
  }`;
  const res = await twg(q, { id: String(contentId) });
  if (res.errors && res.errors.length && !res.data) return { error: describeErrors(res.errors) };
  const d = res.data || {};
  const mapUser = (n) => (n ? { ari: n.id, displayName: n.displayName || 'Unknown' } : null);
  return {
    creator: mapUser(d.creator),
    owners: ((d.owners && d.owners.edges) || []).map((e) => mapUser(e.node)).filter(Boolean),
    contributors: ((d.contributors && d.contributors.edges) || []).map((e) => mapUser(e.node)).filter(Boolean),
  };
}

/** What a user recently viewed or was assigned, across tools. */
export async function userRecentWork(userId, sinceDays = 14) {
  const q = `query UserWork($userId: ID!, $since: String!) {
    recent: atlassianUserRecentlyViewed(userId: $userId, since: $since, first: 20) {
      edges { node { id
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
