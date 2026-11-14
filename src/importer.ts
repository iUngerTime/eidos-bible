// The import: check the collection a person chose, fetch the whole translation
// in one request, check its license, and write every chapter as a blueprint
// through the host, so the pages are the root's own and stay when the plugin
// is gone.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { HostError, type Host } from 'eidosmd/plugin';
import {
  BOOKS,
  Layout,
  TOTAL_CHAPTERS,
  bookMarkdown,
  chapterMarkdown,
  findTranslation,
  nameIn,
  translationMarkdown,
  type SourceTranslation,
  type Translation,
} from './bible.ts';

// The source's address; a test points it at a server of its own.
export const SOURCE = process.env.EIDOS_BIBLE_SOURCE ?? 'https://bible.helloao.org/api';

const COLLECTIONS_OWNER = '@eidos/collections';

export interface ImportRequest {
  translation: string;
  collection: string;
  footnotes?: boolean;
}

export interface Progress {
  done: number;
  total: number;
  book: string;
}

export interface Prepared {
  translation: Translation;
  collection: string;
  title: string;
  layout: Layout;
}

export interface ImportResult {
  translation: Translation;
  collection: string;
  // what the person calls the collection: its title, else its folder's name
  title: string;
  files: number;
}

// A collection as the page offers it: its folder's name, which a request
// names, and the title the person gave it, which the page shows.
export interface CollectionChoice {
  name: string;
  title: string;
}

// What a person runs to make a collection to import into, named as they say
// it (Bible); the CLI names its folder in the project's convention.
export function collectionCommand(title: string): string {
  return `eidos configure:collection add ${JSON.stringify(title)} --description "A Bible translation, a blueprint per chapter"`;
}

// The host's framework calls (Surfaces REQ65, Eidos MD 0.26.0), when this host
// has them: an older host has no `framework`, so the plugin tests for it and
// the person makes the collection themselves there.
interface FrameworkCalls {
  addCollection?(spec: { title: string; description?: string }): Promise<{ name: string; title: string }>;
  addFolders?(spec: { collection: string; folders: ReadonlyArray<{ title: string; description?: string }> }): Promise<Array<{ path: string; title: string }>>;
}

function frameworkOf(host: Host): FrameworkCalls | null {
  const offered: unknown = (host as { framework?: unknown }).framework;
  if (typeof offered !== 'object' || offered === null) return null;
  return offered as FrameworkCalls;
}

export function canCreateCollection(host: Host): boolean {
  return typeof frameworkOf(host)?.addCollection === 'function';
}

// Whether the host declares a collection's folders for a plugin, in the order
// asked, so the books need no number to stay in order.
export function canDeclareFolders(host: Host): boolean {
  return typeof frameworkOf(host)?.addFolders === 'function';
}

// The collection made for an import, through the host's own plan, so it is
// named in the root's convention, held to the framework editor's rule, and
// refused rather than forced when its name is taken.
export async function createCollection(host: Host, title: string, description: string): Promise<CollectionChoice> {
  const add = frameworkOf(host)?.addCollection;
  if (typeof add !== 'function') throw new HostError(501, 'this version of Eidos MD cannot make a collection for a plugin; make it with New collection on the Home');
  return add({ title, description });
}

// The collection the page offers first: bible, in the root's convention.
export function suggestedCollection(host: Host): string {
  return nameIn(host.context().framework.naming, 'Bible');
}

// The collections that can take an import: those with no blueprint and no file yet.
export function emptyCollections(host: Host): CollectionChoice[] {
  const { root, framework, blueprints } = host.context();
  return framework.collections
    .filter((collection) => !blueprints.some((blueprint) => blueprint.collection === collection))
    .filter((collection) => {
      const folder = path.join(root, collection.name);
      return !existsSync(folder) || readdirSync(folder).every((entry) => entry.startsWith('.'));
    })
    .map((collection) => ({ name: collection.name, title: collection.title ?? collection.name }));
}

// What can be refused before anything is fetched. The collection must be one
// the framework declares, since a plugin cannot declare one, and empty, so
// nothing already there is written over. A translation is imported once per
// project, since its ids would otherwise repeat.
export function prepareImport(host: Host, request: ImportRequest): Prepared {
  const translation = findTranslation(request.translation);
  if (!translation) throw new HostError(400, `${request.translation} is not one of the translations offered (eidos bible translations lists them)`);
  const { framework, blueprints } = host.context();
  const wanted = request.collection.trim();
  const suggested = nameIn(framework.naming, 'Bible');
  if (wanted === '') throw new HostError(400, `a collection to import into, such as ${suggested}`);
  const lower = wanted.toLowerCase();
  const folder = framework.folders.find((candidate) => candidate.name.toLowerCase() === lower || candidate.title?.toLowerCase() === lower);
  if (!folder) {
    throw new HostError(404, `the project has no collection ${wanted}; make one first (New collection in the app, or ${collectionCommand(wanted)})`);
  }
  const title = folder.title ?? folder.name;
  if (folder.ownedBy !== COLLECTIONS_OWNER) throw new HostError(400, `${title} is not a collection; import into a collection made for the Bible, such as ${suggested}`);
  const empty = emptyCollections(host).some((choice) => choice.name === folder.name);
  if (!empty) throw new HostError(409, `${title} already holds files; import into a new, empty collection`);
  const layout = new Layout(framework.naming, translation, !canDeclareFolders(host));
  const taken = blueprints.find((blueprint) => blueprint.properties?.id === layout.id());
  if (taken) throw new HostError(409, `the ${translation.name} is already in this project, at ${taken.rel}`);
  return { translation, collection: folder.name, title, layout };
}

export async function fetchTranslation(translation: Translation): Promise<SourceTranslation> {
  const url = `${SOURCE}/${translation.id}/complete.json`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new HostError(502, `could not reach ${url}: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (!response.ok) throw new HostError(502, `${url} answered ${response.status}`);
  return (await response.json()) as SourceTranslation;
}

export async function runImport(host: Host, request: ImportRequest, report: (progress: Progress) => void): Promise<ImportResult> {
  const { translation, collection, title, layout } = prepareImport(host, request);
  const source = await fetchTranslation(translation);
  if (source.translation.license?.publicDomain !== true) {
    throw new HostError(422, `the source no longer marks ${translation.name} as public domain, so it is not imported`);
  }
  const byId = new Map(source.books.map((book) => [book.id, book]));
  const missing = BOOKS.filter(([id, , chapters]) => (byId.get(id)?.chapters.length ?? 0) !== chapters).map(([, name]) => name);
  if (missing.length > 0) throw new HostError(502, `the source's ${translation.short} is missing chapters of ${missing.join(', ')}`);

  const footnotes = request.footnotes ?? true;
  let files = 0;
  let done = 0;
  report({ done, total: TOTAL_CHAPTERS, book: layout.bookName(0) });
  const addFolders = frameworkOf(host)?.addFolders;
  if (!layout.numbered && typeof addFolders === 'function') {
    const made = await addFolders({ collection, folders: BOOKS.map((_, index) => ({ title: layout.bookName(index) })) });
    made.forEach((folder, index) => layout.declared.set(index, folder.path));
  }
  for (const [index, [id, , chapters]] of BOOKS.entries()) {
    const book = byId.get(id);
    if (!book) continue;
    const name = layout.bookName(index);
    const dir = `${collection}/${layout.bookFolder(index, name)}`;
    for (const chapter of book.chapters) {
      const number = chapter.chapter.number;
      const text = chapterMarkdown(layout, { bookId: id, book: name, chapter: number, chapters }, chapter, footnotes);
      await host.writeFile(`${dir}/${layout.chapterFile(name, number, chapters)}`, text);
      files++;
      done++;
    }
    await host.writeFile(`${dir}/${layout.bookFile(name)}`, bookMarkdown(layout, id, name, chapters));
    files++;
    report({ done, total: TOTAL_CHAPTERS, book: name });
  }
  await host.writeFile(`${collection}/${layout.translationFile()}`, translationMarkdown(layout, source.translation));
  files++;
  return { translation, collection, title, files };
}
