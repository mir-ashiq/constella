import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the TWG + Confluence clients so we test the pure ranking logic in
// src/index.js's whoToAsk().
vi.mock('@forge/api', () => ({ default: {} }));
vi.mock('@forge/resolver', () => ({ default: class { define() {} getDefinitions() { return {}; } } }));
vi.mock('../src/backend/confluence-client', () => ({
  searchPages: vi.fn(),
}));
vi.mock('../src/backend/twg-client', () => ({
  userTeams: vi.fn(),
  teamMembers: vi.fn(),
  teamSpaces: vi.fn(),
  spaceTeams: vi.fn(),
  pagePeople: vi.fn(),
  userRecentWork: vi.fn(),
}));

import { searchPages } from '../src/backend/confluence-client';
import { pagePeople } from '../src/backend/twg-client';
import { whoToAsk } from '../src/index';

const PAGES = [
  { contentId: '101', title: 'Onboarding checklist', spaceKey: 'HR' },
  { contentId: '102', title: 'Onboarding FAQ', spaceKey: 'HR' },
];

function pp(creator, owners, contributors) {
  return { creator, owners, contributors };
}
const PRIYA = { ari: 'ari:cloud:identity::user/priya', displayName: 'Priya Sharma' };
const DIEGO = { ari: 'ari:cloud:identity::user/diego', displayName: 'Diego Kim' };
const AMY = { ari: 'ari:cloud:identity::user/amy', displayName: 'Amy Chen' };

describe('whoToAsk ranking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ranks owners above contributors', async () => {
    searchPages.mockResolvedValue(PAGES);
    pagePeople
      .mockResolvedValueOnce(pp(PRIYA, [PRIYA], [DIEGO]))  // page 1
      .mockResolvedValueOnce(pp(DIEGO, [AMY], [DIEGO]));   // page 2
    const r = await whoToAsk('onboarding');
    expect(r.people.length).toBe(3);
    // Priya: p1 creator(2)+owner(3) = 5 ; Diego: p1 contrib(1) + p2 creator(2)+contrib(1) = 4 ; Amy: p2 owner(3)
    expect(r.people[0].displayName).toBe('Priya Sharma');
    expect(r.people[1].displayName).toBe('Diego Kim');
    expect(r.people[2].displayName).toBe('Amy Chen');
    expect(r.people[0].score).toBe(5);
  });

  it('aggregates the same person across pages', async () => {
    searchPages.mockResolvedValue(PAGES);
    pagePeople
      .mockResolvedValueOnce(pp(PRIYA, [PRIYA], [PRIYA]))
      .mockResolvedValueOnce(pp(PRIYA, [PRIYA], [DIEGO]));
    const r = await whoToAsk('onboarding');
    expect(r.people[0].displayName).toBe('Priya Sharma');
    // p1: creator(2)+owner(3)+contrib(1)=6 ; p2: creator(2)+owner(3)=5 ; total 11
    expect(r.people[0].score).toBe(11);
    expect(r.people[0].reason.length).toBeGreaterThan(0);
  });

  it('handles empty search results', async () => {
    searchPages.mockResolvedValue([]);
    const r = await whoToAsk('nonexistent topic');
    expect(r.people).toEqual([]);
  });

  it('skips pages whose people fail to resolve', async () => {
    searchPages.mockResolvedValue(PAGES);
    pagePeople
      .mockResolvedValueOnce({ error: 'graph down' })
      .mockResolvedValueOnce(pp(AMY, [AMY], []));
    const r = await whoToAsk('onboarding');
    expect(r.people.length).toBe(1);
    expect(r.people[0].displayName).toBe('Amy Chen');
  });

  it('caps the parallel fan-out at 5 pages', async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ contentId: String(200 + i), title: `P${i}`, spaceKey: 'HR' }));
    searchPages.mockResolvedValue(many);
    pagePeople.mockResolvedValue(pp(PRIYA, [PRIYA], []));
    await whoToAsk('topic');
    expect(pagePeople).toHaveBeenCalledTimes(5);
  });

  it('returns reasons citing page titles and roles', async () => {
    searchPages.mockResolvedValue([PAGES[0]]);
    pagePeople.mockResolvedValueOnce(pp(PRIYA, [PRIYA], [DIEGO]));
    const r = await whoToAsk('onboarding');
    expect(r.people[0].reason).toContain('Onboarding checklist');
    expect(r.people[0].reason).toContain('owner');
  });
});
