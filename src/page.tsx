// Bible Import's page half: its settings page is the import, a translation, the
// empty collection the person chose (made here where the host can), and a
// button, with the import's progress beneath. Its words are in the page's
// language, and the toast at its end is heard wherever the person is.
import { useCallback, useEffect, useState, type JSX } from 'react';
import { Button, Checkbox, Notice, Row, Select, SettingRow, Stack, Text, usePluginEvent, usePluginHost, type PagePlugin } from 'eidosmd/page';
import { STRINGS } from './strings.ts';

interface Translation {
  id: string;
  short: string;
  name: string;
  language: 'en' | 'es' | 'pt';
}

interface Choice {
  name: string;
  title: string;
}

interface Options {
  translations: Translation[];
  collections: Choice[];
  suggested: string;
  command: string;
  can_create: boolean;
}

interface Progress {
  done: number;
  total: number;
  book: string;
}

interface Done {
  name: string;
  collection: string;
  title: string;
  files: number;
}

const LANGUAGES = ['en', 'es', 'pt'] as const;

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

// A bar of the import's progress, drawn with the page's tokens so a theme holds.
function ProgressBar({ progress }: { progress: Progress }): JSX.Element {
  const host = usePluginHost();
  const share = progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;
  const percent = Math.round(share * 100);
  const count = host.t('progress', { done: progress.done.toLocaleString(), total: progress.total.toLocaleString() });
  return (
    <Stack gap="xs">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        aria-valuetext={count}
        style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--color-sunken)', boxShadow: 'inset 0 0 0 1px var(--color-line)' }}
      >
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 999, background: 'var(--color-accent)', transition: 'width 200ms ease-out' }} />
      </div>
      <Row justify="between">
        <Text size="sm" tone="muted">
          {count}
          {progress.book ? ` · ${host.t('progressBook', { book: progress.book })}` : ''}
        </Text>
        <Text size="sm" tone="muted">
          {percent}%
        </Text>
      </Row>
    </Stack>
  );
}

function ImportPage(): JSX.Element {
  const host = usePluginHost();
  const [options, setOptions] = useState<Options | null>(null);
  const [translation, setTranslation] = useState(host.t('defaultTranslation'));
  const [collection, setCollection] = useState('');
  const [footnotes, setFootnotes] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [making, setMaking] = useState(false);

  const load = useCallback(
    async (prefer?: string): Promise<void> => {
      try {
        const answer = await host.get<Options>('options');
        setOptions(answer);
        setCollection((current) => {
          const names = answer.collections.map((choice) => choice.name);
          if (prefer && names.includes(prefer)) return prefer;
          if (names.includes(current)) return current;
          if (names.includes(answer.suggested)) return answer.suggested;
          return names[0] ?? '';
        });
      } catch (cause) {
        setError(message(cause));
      }
    },
    [host],
  );
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

  const makeCollection = async (): Promise<void> => {
    setError(null);
    setMaking(true);
    try {
      const made = await host.post<Choice>('collection', { title: host.t('collectionTitle'), description: host.t('collectionDescription') });
      await load(made.name);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setMaking(false);
    }
  };

  const start = async (): Promise<void> => {
    setError(null);
    setDone(null);
    try {
      await host.post('import', { translation, collection, footnotes });
      setProgress({ done: 0, total: 1189, book: '' });
    } catch (cause) {
      setError(message(cause));
    }
  };

  const running = progress !== null;
  const noCollection = options !== null && options.collections.length === 0 && done === null;
  const collectionTitle = host.t('collectionTitle');
  return (
    <Stack gap="md">
      <Text block tone="muted">
        {host.t('intro')}
      </Text>
      <SettingRow
        label={host.t('translation')}
        control={
          <Select value={translation} onChange={(event: { target: HTMLSelectElement }) => setTranslation(event.target.value)}>
            {LANGUAGES.flatMap((language) =>
              (options?.translations ?? [])
                .filter((option) => option.language === language)
                .map((option) => (
                  <option key={option.id} value={option.short} data-detail={host.t(`language_${language}`)} data-search={`${option.name} ${option.short} ${host.t(`language_${language}`)}`}>
                    {option.name} ({option.short})
                  </option>
                )),
            )}
          </Select>
        }
      />
      <SettingRow
        label={host.t('collection')}
        hint={host.t('collectionHint')}
        control={
          <Row gap="sm">
            <Select value={collection} onChange={(event: { target: HTMLSelectElement }) => setCollection(event.target.value)}>
              {(options?.collections ?? []).map((choice) => (
                <option key={choice.name} value={choice.name}>
                  {choice.title}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="quiet" onClick={() => void load()}>
              {host.t('refresh')}
            </Button>
          </Row>
        }
      />
      {noCollection && options?.can_create && (
        <Notice>
          <Stack gap="sm">
            <Text block>
              {host.t('noCollection')} {host.t('noCollectionMake')}
            </Text>
            <div>
              <Button size="sm" variant="primary" disabled={making} onClick={() => void makeCollection()}>
                {making ? host.t('makingCollection') : host.t('makeCollection', { title: collectionTitle })}
              </Button>
            </div>
          </Stack>
        </Notice>
      )}
      {noCollection && options && !options.can_create && (
        <Notice>
          {host.t('noCollection')} {host.t('noCollectionHint', { title: collectionTitle })} <code>{options.command}</code>
        </Notice>
      )}
      <SettingRow
        label={host.t('footnotes')}
        hint={host.t('footnotesHint')}
        control={<Checkbox checked={footnotes} onChange={(event: { target: HTMLInputElement }) => setFootnotes(event.target.checked)} />}
      />
      <div>
        <Button variant="primary" disabled={running || collection === ''} onClick={() => void start()}>
          {running ? host.t('importing') : host.t('import')}
        </Button>
      </div>
      {progress && <ProgressBar progress={progress} />}
      {error && <Notice tone="error">{error}</Notice>}
      {done && (
        <Notice tone="success">
          <a
            href={host.hrefs.collection(done.collection)}
            onClick={(event) => {
              event.preventDefault();
              host.navigate(host.hrefs.collection(done.collection));
            }}
          >
            {host.t('done', { name: done.name, collection: done.title, files: done.files.toLocaleString() })}
          </a>{' '}
          {host.t('doneIndex')}
        </Notice>
      )}
    </Stack>
  );
}

function useListen(): void {
  const host = usePluginHost();
  usePluginEvent('done', (payload) => {
    const done = payload as Done;
    host.toast(host.t('toastDone', { name: done.name }), 'success', host.t('toastDoneDetail', { files: done.files.toLocaleString(), collection: done.title }));
  });
  usePluginEvent('failed', (payload) => host.toast(host.t('toastFailed'), 'error', (payload as { message: string }).message));
}

export const page: PagePlugin = {
  name: 'bible',
  strings: STRINGS,
  settings: () => <ImportPage />,
  useListen,
};
