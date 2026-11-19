/**
 * Constella — UI Kit frontend.
 * One resource, two surfaces:
 *  - confluence:globalPage      → Constellation Map (my teams → spaces → drill-in)
 *  - confluence:contentBylineItem → Page People chip (people behind this page)
 */
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Text, Heading, Box, Stack, Inline, Button, Lozenge, SectionMessage, Spinner,
  Textfield, Link, useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

function PeopleChip({ label, people }) {
  if (!people || !people.length) return null;
  return (
    <Inline space="space.050" blockAlign="center">
      <Text size="small" weight="medium">{label}:</Text>
      {people.slice(0, 6).map((u) => <Lozenge key={u.ari || u.displayName}>{u.displayName}</Lozenge>)}
    </Inline>
  );
}

function PagePeopleView({ contentId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (contentId) invoke('getPagePeople', { contentId }).then(setData);
  }, [contentId]);
  if (!data) return <Spinner size="small" label="Loading people…" />;
  if (data.error) return <SectionMessage appearance="warning" title="Teamwork Graph unavailable"><Text as="p">{String(data.error)}</Text></SectionMessage>;
  if (!data.creator && !data.owners?.length && !data.contributors?.length) {
    return <Text size="small">No people data in the graph for this page yet.</Text>;
  }
  return (
    <Stack space="space.050">
      <PeopleChip label="Created by" people={data.creator ? [data.creator] : []} />
      <PeopleChip label="Owners" people={data.owners} />
      <PeopleChip label="Recent contributors" people={data.contributors} />
    </Stack>
  );
}

function TeamCard({ team, onOpen }) {
  return (
    <Stack space="space.050" xcss={{ backgroundColor: 'elevation.surface.sunken', padding: 'space.150', borderRadius: '3px' }}>
      <Inline space="space.100" grow="fill" blockAlign="center">
        <Text weight="semibold">⭐ {team.displayName}</Text>
        <Button spacing="compact" onClick={() => onOpen(team)}>Explore</Button>
      </Inline>
      {team.summary && <Text size="small" as="p">{team.summary}</Text>}
    </Stack>
  );
}

function TeamDetail({ team, onBack }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    invoke('getTeamDetail', { teamAri: team.ari }).then(setDetail);
  }, [team.ari]);
  if (!detail) return <Spinner label="Loading team…" />;
  return (
    <Stack space="space.150">
      <Inline space="space.100" blockAlign="center" grow="fill">
        <Heading as="h4">⭐ {team.displayName}</Heading>
        <Button spacing="compact" onClick={onBack}>← Back</Button>
      </Inline>
      <Text size="small" as="p">{team.summary || 'No description.'}</Text>
      <Heading as="h5">Members ({detail.members.length})</Heading>
      <Inline space="space.050" wrap="wrap">
        {detail.members.map((m) => <Lozenge key={m.ari}>{m.displayName}</Lozenge>)}
        {!detail.members.length && <Text size="small">No members found (check team privacy settings).</Text>}
      </Inline>
      <Heading as="h5">Linked spaces ({detail.spaces.length})</Heading>
      <Inline space="space.050" wrap="wrap">
        {detail.spaces.map((s) => (
          <Lozenge key={s.ari}>{s.spaceType === 'confluence' ? '📄' : '🧭'} {s.title}</Lozenge>
        ))}
        {!detail.spaces.length && <Text size="small">No linked spaces. Link one in the space's settings → Connect a team to see it here.</Text>}
      </Inline>
    </Stack>
  );
}

function ConstellationMap() {
  const [myTeams, setMyTeams] = useState(null);
  const [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState('');
  const [who, setWho] = useState(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState(null);

  useEffect(() => {
    invoke('getMyTeams').then(setMyTeams);
  }, []);

  const seedDemo = async () => {
    setSeeding(true); setSeedMsg(null);
    try {
      const r = await invoke('seedDemo');
      if (r.error) setSeedMsg(`Seeding failed: ${r.error}`);
      else if (r.already) setSeedMsg('Demo space already exists — search for “onboarding” below.');
      else setSeedMsg(`Created ${r.pageCount} demo pages in the “Constella Demo” space: ${(r.pages || []).map((p) => p.title).join(' · ')}. ${r.note || ''}`);
    } finally {
      setSeeding(false);
    }
  };

  const search = async () => {
    setBusy(true);
    setWho(await invoke('whoToAsk', { topic }));
    setBusy(false);
  };

  return (
    <Stack space="space.200">
      <Heading as="h2">✨ Constella — your team constellation</Heading>
      <SectionMessage appearance="information" title="What this shows">
        <Text as="p">Every team you belong to, its members, and its linked Jira and Confluence spaces — one map resolved live from the Atlassian Teamwork Graph. Open the byline item on any page to see its people.</Text>
      </SectionMessage>

      {!myTeams && <Spinner label="Resolving your teams from the graph…" />}
      {myTeams?.error && (
        <SectionMessage appearance="warning" title="Teamwork Graph unavailable">
          <Text as="p">{String(myTeams.error)}</Text>
          <Text as="p">This usually means the Teamwork Graph scopes (read:teamwork-graph:confluence / :jira) were not granted at install time. Reinstall the app and approve all requested permissions, then reload this page.</Text>
        </SectionMessage>
      )}
      {myTeams?.teams && !myTeams.teams.length && (
        <SectionMessage appearance="information" title="No teams found">
          <Text as="p">You don't belong to any Atlassian teams yet. Create one in Team directory, reload this page, and the constellation will appear.</Text>
          <Text as="p">On a fresh site with no content yet, you can also seed a demo space with three pages (onboarding, launch plan, runbook) to try search and the byline:</Text>
          <Button appearance="primary" spacing="compact" isDisabled={seeding} onClick={seedDemo}>
            {seeding ? 'Seeding demo content…' : 'Generate demo content'}
          </Button>
          {seedMsg && <Text as="p" size="small">{seedMsg}</Text>}
        </SectionMessage>
      )}
      {myTeams?.teams && myTeams.teams.length > 0 && seedMsg && (
        <SectionMessage appearance="information" title="Demo content">
          <Text as="p">{seedMsg}</Text>
        </SectionMessage>
      )}

      {selected ? (
        <TeamDetail team={selected} onBack={() => setSelected(null)} />
      ) : (
        <Stack space="space.100">
          {(myTeams?.teams || []).map((t) => (
            <TeamCard key={t.ari} team={t} onOpen={setSelected} />
          ))}
        </Stack>
      )}

      <Heading as="h4">🔎 Who should I ask?</Heading>
      <Text size="small" as="p">Type a topic — Constella searches pages, then ranks owners and contributors by graph signals.</Text>
      <Inline space="space.100" blockAlign="center">
        <TextFieldValue topic={topic} setTopic={setTopic} onSearch={search} busy={busy} />
      </Inline>
      {who && (who.error ? (
        <SectionMessage appearance="warning" title="Search unavailable"><Text as="p">{String(who.error)}</Text></SectionMessage>
      ) : who.people.length ? (
        <Stack space="space.050">
          {who.people.slice(0, 5).map((p, i) => (
            <Inline key={p.ari || i} space="space.100" blockAlign="center">
              <Lozenge appearance="new">#{i + 1}</Lozenge>
              <Text weight="medium">{p.displayName}</Text>
              <Text size="small" as="em">{p.reason}</Text>
            </Inline>
          ))}
        </Stack>
      ) : (
        <Text size="small">No matches — try another keyword.</Text>
      ))}
    </Stack>
  );
}

function TextFieldValue({ topic, setTopic, onSearch, busy }) {
  return (
    <Inline space="space.100" blockAlign="center">
      <Textfield
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. onboarding, Q3 launch plan"
      />
      <Button appearance="primary" isDisabled={busy || !topic.trim()} onClick={onSearch}>
        {busy ? 'Searching…' : 'Who to ask'}
      </Button>
    </Inline>
  );
}

function App() {
  const context = useProductContext();
  const type = context?.type || '';
  if (type.startsWith('confluence:contentBylineItem')) {
    const contentId = context?.extension?.content?.id;
    return (
      <Stack space="space.100">
        <Heading as="h5">✨ Page people</Heading>
        {contentId ? <PagePeopleView contentId={String(contentId)} /> : <Text size="small">Open on a page.</Text>}
      </Stack>
    );
  }
  return <ConstellationMap />;
}

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
