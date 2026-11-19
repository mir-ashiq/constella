/**
 * Constella — demo content seeder.
 *
 * A judge on a brand-new Confluence site has no spaces, no pages, and an
 * empty Teamwork Graph. The constellation map would show nothing. This
 * seeder creates one space ("Constella Demo") with three pages whose
 * ownership/labels make the graph relationships visible once Confluence
 * indexes them (usually seconds to a minute).
 *
 * Idempotent: skips everything if the space already exists. Defensive:
 * returns {error} rather than throwing. Uses the v2 content API.
 */
import api, { route } from '@forge/api';

const SPACE_KEY = 'CONSTELLADEMO';

async function cpost(url, payload) {
  try {
    const res = await api.asApp().requestConfluence(route`${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) return { error: `Confluence responded ${res.status}: ${(text || '').slice(0, 200)}` };
    return data || {};
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}

/** PUT JSON via asApp; returns parsed body or {error}. */
async function cput(url, payload) {
  try {
    const res = await api.asApp().requestConfluence(route`${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) return { error: `Confluence responded ${res.status}: ${(text || '').slice(0, 200)}` };
    return data || {};
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}

async function cget(url) {
  try {
    const res = await api.asApp().requestConfluence(route`${url}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function pageBody(blocks, spaceId) {
  // v2 create shape: spaceId (not space key), no type/status; version is
  // assigned by the server on create and required on update.
  return {
    spaceId,
    title: blocks.title,
    body: {
      representation: 'atlas_doc_format',
      value: JSON.stringify({
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: blocks.intro },
            ],
          },
          ...blocks.sections.map((s) => ({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: s.heading }],
          })),
          ...blocks.sections.map((s) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: s.text }],
          })),
        ],
      }),
    },
  };
}

const DEMO_PAGES = [
  {
    title: 'Remote work policy — HR',
    intro: 'Who to ask about working remotely: eligibility, equipment, and the approval flow.',
    sections: [
      { heading: 'Eligibility', text: 'All full-time employees after 90 days; contractors follow their agency terms.' },
      { heading: 'Equipment', text: 'Laptops ship from the IT vendor within 5 business days of approval; monitors are self-serve.' },
      { heading: 'Approval', text: 'Manager approves in the HR portal; HR keeps this page as the source of truth.' },
    ],
  },
  {
    title: 'Onboarding guide for new engineers',
    intro: 'Everything a new engineer needs in their first two weeks: accounts, access, rituals and first PR.',
    sections: [
      { heading: 'Day 1: accounts and access', text: 'Create the SSO account, join the engineering Confluence space, and request repository access through the access-request form.' },
      { heading: 'Week 1: rituals', text: 'Attend daily standup at 10:00, the weekly sprint planning on Mondays, and the demo session on Thursdays.' },
      { heading: 'Week 2: first pull request', text: 'Pick a good-first-issue label ticket, pair with your onboarding buddy, and ship a small change end to end.' },
    ],
  },
  {
    title: 'Q3 launch plan — Constella demo',
    intro: 'The launch plan for the Q3 release: scope, owners, dates and risks, kept as the single source of truth.',
    sections: [
      { heading: 'Scope', text: 'The release ships the new checkout flow, the reporting export, and the migration to the new login service.' },
      { heading: 'Owners', text: 'Checkout is owned by the payments team, exports by the platform team, and login by the identity team.' },
      { heading: 'Risks', text: 'The login migration depends on the SSO vendor response; the fallback is the staged rollout plan below.' },
    ],
  },
  {
    title: 'Incident response runbook',
    intro: 'What to do when an alert fires: severity levels, escalation paths and the communication template.',
    sections: [
      { heading: 'Severity levels', text: 'SEV1 is customer-facing and needs the incident channel opened immediately; SEV2 is degraded functionality; SEV3 is internal only.' },
      { heading: 'Escalation', text: 'The on-call engineer owns SEV3. SEV1 pages the engineering manager and the duty lead within five minutes.' },
      { heading: 'Template', text: 'Copy the postmortem template from this space, fill the timeline while facts are fresh, and schedule the review within 48 hours.' },
    ],
  },
];

export async function seedDemoData() {
  // Idempotency: does the space already exist?
  const existing = await cget(`/wiki/api/v2/spaces?keys=${SPACE_KEY}`);
  if (existing?.results?.length) return { already: true, spaceKey: SPACE_KEY };

  const me = await getMyAccountId();
  const space = await cpost('/wiki/api/v2/spaces', {
    key: SPACE_KEY,
    name: 'Constella Demo',
    description: {
      plain: { value: 'Seeded demo content for the Constella app. Safe to delete.', representation: 'plain' },
    },
  });
  if (space.error) return space;

  const created = [];
  const pageMeta = [];
  const spaceId = space.id;
  for (const spec of DEMO_PAGES) {
    const page = await cpost('/wiki/api/v2/pages', pageBody(spec, spaceId));
    if (!page.error && page.id) {
      created.push(page.id);
      pageMeta.push({ id: page.id, title: spec.title });
      // Make the installing user the page OWNER (v2 create does not set
      // owners): the byline chip and who-to-ask ranking then have real
      // owner data the moment the graph indexes the page. The update must
      // carry the CURRENT version from the create response, or Confluence
      // answers 409.
      const currentVersion = page.version && page.version.number ? page.version.number : 1;
      if (me) {
        await cput(`/wiki/api/v2/pages/${page.id}`, {
          id: page.id,
          status: page.status || 'current',
          title: spec.title,
          body: page.body,
          version: { number: currentVersion },
          ownerId: me,
        });
      }
    }
  }

  return {
    created: true,
    spaceKey: SPACE_KEY,
    pageCount: created.length,
    pages: pageMeta,
    note: 'Confluence indexes new pages into the Teamwork Graph within about a minute; reload afterwards.',
  };
}

let myId = null;
async function getMyAccountId() {
  if (myId) return myId;
  try {
    const res = await api.asApp().requestConfluence(route`/wiki/api/v2/users/me`);
    if (!res.ok) return null;
    const me = await res.json();
    myId = me.account_id || me.accountId || null;
    return myId;
  } catch {
    return null;
  }
}
