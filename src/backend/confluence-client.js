/**
 * Constella — Confluence search client.
 * Finds pages by title/keyword via CQL search (v1 search endpoint, stable).
 * Scope: read:page:confluence + read:space:confluence.
 */
import api, { route } from '@forge/api';

/**
 * Search Confluence pages by text. Returns [{ contentId, title, spaceKey }]
 * with a defensive empty array on any failure — search is a convenience, not
 * a hard dependency.
 */
export async function searchPages(query, limit = 10) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];
  // Phrase-quote the whole query: single words like "and" are CQL reserved
  // words and break unquoted queries; a phrase also matches multi-word topics.
  const phrase = escapeCql(trimmed);
  const cql = `type = page AND (title ~ "${phrase}" OR text ~ "${phrase}") ORDER BY lastmodified DESC`;
  try {
    const r = await api.asUser().requestConfluence(
      route`/wiki/rest/api/search?${new URLSearchParams({cql, limit})}`
    );
    if (r.status === 200) {
      const json = await r.json();
      return (json.results || []).map((row) => ({
        contentId: row.content && row.content.id,
        title: (row.content && row.content.title) || 'Untitled',
        spaceKey: (row.content && row.content.space && row.content.space.key) || '',
      })).filter((x) => x.contentId);
    }
  } catch {
    // degrade to empty — "who to ask" still works via graph data
  }
  return [];
}

function escapeCql(s) {
  return String(s).replace(/(["\\])/g, '\\$1');
}
