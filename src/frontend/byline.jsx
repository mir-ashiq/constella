/**
 * Constella — byline entry (confluence:contentBylineItem).
 * A tiny standalone UI Kit app: the people behind the page you're reading.
 * Lives as its own resource because each UI Kit resource bundles its own
 * reconciler — it cannot share one with the global page.
 */
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Text, Heading, Stack, Inline, Lozenge, SectionMessage, Spinner, useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

function PeopleChip({ label, people }) {
  if (!people || !people.length) return null;
  return (
    <Inline space="space.050" blockAlign="center" wrap="wrap">
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

function BylineApp() {
  const context = useProductContext();
  const contentId = context?.extension?.content?.id;
  return (
    <Stack space="space.050">
      <Heading as="h6">✨ Page people</Heading>
      {contentId ? <PagePeopleView contentId={String(contentId)} /> : <Text size="small">Open on a page.</Text>}
      <Text size="small" as="p">Resolved live from the Atlassian Teamwork Graph. Ask the Constella Guide agent “who should I ask about this topic?” anywhere in Confluence.</Text>
    </Stack>
  );
}

ForgeReconciler.render(<React.StrictMode><BylineApp /></React.StrictMode>);
