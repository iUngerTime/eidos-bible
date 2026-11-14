// Bible Import's page half: its settings page is the import, a translation, the
// empty collection the person chose, and a button, with the import's progress
// beneath. The toast at its end is heard wherever the person is (useListen).
import { useCallback, useEffect, useState, type JSX } from 'react';
import { Button, Checkbox, Notice, Row, Select, SettingRow, Stack, Text, usePluginEvent, usePluginHost, type PagePlugin } from 'eidosmd/page';

interface Translation {
  id: string;
  short: string;
  name: string;
}

interface Options {
  translations: Translation[];
  collections: string[];
  suggested: string;
  command: string;
}

interface Progress {
  done: number;
  total: number;
  book: string;
}

interface Done {
  name: string;
  collection: string;
  files: number;
}

function ImportPage(): JSX.Element {
  const host = usePluginHost();
  const [options, setOptions] = useState<Options | null>(null);
  const [translation, setTranslation] = useState('BSB');
  const [collection, setCollection] = useState('');
  const [footnotes, setFootnotes] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const answer = await host.get<Options>('options');
      setOptions(answer);
      setCollection((current) => {
        if (answer.collections.includes(current)) return current;
        if (answer.collections.includes(answer.suggested)) return answer.suggested;
        return answer.collections[0] ?? '';
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [host]);
  useEffect(() => {
    void load();
  }, [load]);
  usePluginEvent('progress', (payload) => setProgress(payload as Progress));
  usePluginEvent('done', (payload) => {
    setProgress(null);
    setDone(payload as Done);
    void load();
  });
  usePluginEvent('failed', (payload) => {
    setProgress(null);
    setError((payload as { message: string }).message);
  });

  const start = async (): Promise<void> => {
    setError(null);
    setDone(null);
    try {
      await host.post('import', { translation, collection, footnotes });
      setProgress({ done: 0, total: 1189, book: '' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const running = progress !== null;
  const noCollection = options !== null && options.collections.length === 0 && done === null;
  return (
    <Stack gap="md">
      <Text block tone="muted">
        Write a public-domain Bible into a collection of this project: a folder per book and a blueprint per chapter, each verse a small heading you can
        link to, such as Proverbs 31:4–6. The blueprints are the project's own and stay if you remove this plugin.
      </Text>
      <SettingRow
        label="Translation"
        control={
          <Select value={translation} onChange={(event: { target: HTMLSelectElement }) => setTranslation(event.target.value)}>
            {(options?.translations ?? []).map((option) => (
              <option key={option.id} value={option.short}>
                {option.name} ({option.short})
              </option>
            ))}
          </Select>
        }
      />
      <SettingRow
        label="Collection"
        hint="An empty collection to write it into"
        control={
          <Row gap="sm">
            <Select value={collection} onChange={(event: { target: HTMLSelectElement }) => setCollection(event.target.value)}>
              {(options?.collections ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="quiet" onClick={() => void load()}>
              Refresh
            </Button>
          </Row>
        }
      />
      {noCollection && options && (
        <Notice>
          The project has no empty collection yet. Make one with <b>New collection</b> on the Home, named {options.suggested}, then choose Refresh. From a
          terminal: <code>{options.command}</code>
        </Notice>
      )}
      <SettingRow
        label="Footnotes"
        hint="The translators' notes, at the foot of each chapter"
        control={<Checkbox checked={footnotes} onChange={(event: { target: HTMLInputElement }) => setFootnotes(event.target.checked)} />}
      />
      <div>
        <Button variant="primary" disabled={running || collection === ''} onClick={() => void start()}>
          {running ? 'Importing…' : 'Import'}
        </Button>
      </div>
      {progress && (
        <Text block size="sm" tone="muted">
          {progress.done} of {progress.total} chapters{progress.book ? `, ${progress.book}` : ''}
        </Text>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {done && (
        <Notice tone="success">
          {done.name} is in{' '}
          <a
            href={host.hrefs.collection(done.collection)}
            onClick={(event) => {
              event.preventDefault();
              host.navigate(host.hrefs.collection(done.collection));
            }}
          >
            {done.collection}
          </a>{' '}
          ({done.files} blueprints).
        </Notice>
      )}
    </Stack>
  );
}

function useListen(): void {
  const host = usePluginHost();
  usePluginEvent('done', (payload) => {
    const done = payload as Done;
    host.toast(`${done.name} imported`, 'success', `${done.files} blueprints in ${done.collection}`);
  });
  usePluginEvent('failed', (payload) => host.toast('The Bible import stopped', 'error', (payload as { message: string }).message));
}

export const page: PagePlugin = {
  name: 'bible',
  settings: () => <ImportPage />,
  useListen,
};
