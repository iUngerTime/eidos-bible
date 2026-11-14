// Bible Import's suite: the pages it writes, read as pure functions, and the
// import run as a person runs it, from the shell and from the page, against a
// source served locally, in a sandbox the testing kit makes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pluginSandbox, type PluginSandbox } from 'eidosmd/plugin-testing';
import { BOOKS, Layout, TRANSLATIONS, bookMarkdown, chapterMarkdown, nameIn, padChapter, translationMarkdown, type SourceChapter, type SourceTranslation } from '../src/bible.ts';

const PROVERBS_31: SourceChapter = {
  chapter: {
    number: 31,
    content: [
      { type: 'heading', content: ['The Sayings for King Lemuel'] },
      { type: 'line_break', paragraph: 'm' },
      { type: 'verse', number: 1, content: ['These are the words of King Lemuel—the burden that his mother taught him:'] },
      { type: 'verse', number: 2, content: [{ text: 'What shall I say,', poem: 1 }, { noteId: 83 }, { text: 'O my son?', poem: 1 }, { text: 'What, O son of my womb?', poem: 2 }] },
      { type: 'verse', number: 3, content: ['Do not spend your strength on women'] },
      { type: 'verse', number: 4, content: ['It is not for kings, O Lemuel,'] },
      { type: 'verse', number: 5, content: ['lest they drink and forget what is decreed,'] },
      { type: 'verse', number: 6, content: ['Give strong drink to one who is perishing,'] },
    ],
    footnotes: [
      { noteId: 83, text: 'Or What are you doing' },
      { noteId: 99, text: 'A note no verse references' },
    ],
  },
};

function plainChapter(number: number): SourceChapter {
  return { chapter: { number, content: [{ type: 'verse', number: 1, content: [`Verse one of chapter ${number}.`] }], footnotes: [] } };
}

function translation(id: string, publicDomain: boolean): SourceTranslation {
  return {
    translation: { id, name: `Test ${id}`, website: 'https://example.org/', license: { publicDomain } },
    books: BOOKS.map(([bookId, , chapters]) => ({
      id: bookId,
      chapters: Array.from({ length: chapters }, (_, index) => (bookId === 'PRO' && index === 30 ? PROVERBS_31 : plainChapter(index + 1))),
    })),
  };
}

const BSB = TRANSLATIONS[0]!;
const place = { bookId: 'PRO', book: 'Proverbs', chapter: 31, chapters: 31 };

test('a chapter blueprint: its frontmatter, the way around the book, sections as H5s, and every verse an H6 of its number', () => {
  const page = chapterMarkdown(new Layout('kebab-case', BSB), place, PROVERBS_31, true);
  assert.match(page, /^---\nid: "bsb-pro-31"\ntitle: "Proverbs 31"\nsummary: "Proverbs 31 in the Berean Standard Bible"\n---\n\n\[← Proverbs 30\]\(<proverbs-30\.md>\) · \[Proverbs\]\(<proverbs\.md>\)\n\n---\n/);
  assert.doesNotMatch(page, /^# /m, 'no H1 above the verses, which the Linter would read as a skipped level');
  assert.match(page, /\n##### The Sayings for King Lemuel\n/);
  for (const verse of [1, 2, 3, 4, 5, 6]) assert.match(page, new RegExp(`\\n###### ${verse}\\n\\n`));
  assert.match(page, /###### 2\n\nWhat shall I say,\[\^1\] O my son\?\nWhat, O son of my womb\?\n/);
  assert.match(page, /\n\[\^1\]: Or What are you doing\n$/);
  assert.doesNotMatch(page, /never references|\[\^2\]/);
});

test('without footnotes, a chapter carries no markers and no notes', () => {
  const page = chapterMarkdown(new Layout('kebab-case', BSB), place, PROVERBS_31, false);
  assert.doesNotMatch(page, /\[\^/);
});

test("files and folders follow the project's naming; titles keep the plain names", () => {
  const kebab = new Layout('kebab-case', BSB);
  assert.equal(kebab.chapterFile('Psalms', 1, 150), 'psalms-001.md');
  assert.equal(kebab.bookFolder(8, '1 Samuel'), '09-1-samuel');
  assert.equal(kebab.translationFile(), 'berean-standard-bible.md');
  const title = new Layout('Title Case', BSB);
  assert.equal(title.chapterFile('Song of Solomon', 3, 8), 'Song of Solomon 3.md');
  assert.equal(title.bookFolder(21, 'Song of Solomon'), '22 Song of Solomon');
  assert.equal(new Layout('TitleCase', BSB).chapterFile('1 John', 2, 5), '1John2.md');
  assert.equal(nameIn('kebab-case', 'Bible'), 'bible');
});

test('a Spanish or Portuguese translation is written with its own book names and words, its ids and folders plain', () => {
  const rv = new Layout('kebab-case', TRANSLATIONS.find((translation) => translation.short === 'RV1909')!);
  const page = chapterMarkdown(rv, { bookId: 'PRO', book: rv.bookName(19), chapter: 31, chapters: 31 }, PROVERBS_31, true);
  assert.match(page, /^---\nid: "rv1909-pro-31"\ntitle: "Proverbios 31"\nsummary: "Proverbios 31 \(Reina-Valera 1909\)"\n---\n\n\[← Proverbios 30\]\(<proverbios-30\.md>\) · \[Proverbios\]\(<proverbios\.md>\)/);
  assert.equal(rv.bookFolder(0, rv.bookName(0)), '01-genesis', 'accents come off a folder name, as the convention does');
  assert.equal(rv.chapterFile(rv.bookName(21), 2, 8), 'cantares-2.md');
  assert.match(bookMarkdown(rv, 'PRO', 'Proverbios', 31), /summary: "El libro de Proverbios \(Reina-Valera 1909\), una página por capítulo"/);
  const index = translationMarkdown(rv, { id: 'spa_r09', name: 'Santa Biblia — Reina Valera 1909' });
  assert.match(index, /## Antiguo Testamento[\s\S]*- \[Génesis\]\(<01-genesis\/genesis\.md>\)[\s\S]*## Nuevo Testamento[\s\S]*- \[Apocalipsis\]/);
  const bpm = new Layout('Title Case', TRANSLATIONS.find((translation) => translation.short === 'BPM')!);
  assert.equal(bpm.chapterFile(bpm.bookName(42), 3, 21), 'João 03.md');
  assert.match(translationMarkdown(bpm, { id: 'por_bsl', name: 'Bíblia Portuguesa Mundial' }), /## Antigo Testamento[\s\S]*## Novo Testamento/);
});

test("a chapter's number is as wide as its book's last", () => {
  assert.equal(padChapter(1, 150), '001');
  assert.equal(padChapter(31, 31), '31');
  assert.equal(padChapter(3, 31), '03');
  assert.equal(padChapter(1, 1), '1');
});

let sandbox: PluginSandbox;
let server: Server;
let source: string;

before(async () => {
  const bodies = new Map([
    ['/TEST/BSB/complete.json', JSON.stringify(translation('BSB', true))],
    ['/TEST/eng_kjv/complete.json', JSON.stringify(translation('eng_kjv', false))],
  ]);
  server = createServer((request, response) => {
    const body = bodies.get(request.url ?? '');
    response.writeHead(body ? 200 : 404, { 'content-type': 'application/json' });
    response.end(body ?? '{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  source = `http://127.0.0.1:${(server.address() as AddressInfo).port}/TEST`;
  process.env.EIDOS_BIBLE_SOURCE = source;
  sandbox = await pluginSandbox('dist');
});

after(async () => {
  await sandbox.close();
  server.close();
});


const env = (): Record<string, string> => ({ EIDOS_BIBLE_SOURCE: source });

async function addCollection(name: string): Promise<void> {
  const made = await sandbox.run(['configure:collection', 'add', name, '--description', 'A Bible translation', '--yes']);
  assert.equal(made.status, 0, made.stderr);
}

test('the import writes every book and chapter as blueprints, and check is clean and finds a verse a page links to', async () => {
  await addCollection('Bible');
  const run = await sandbox.run(['bible', 'import', 'bible'], { env: env() });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Berean Standard Bible written to Bible \(bible\/, 1256 blueprints\)/);
  const folder = path.join(sandbox.root, 'bible');
  assert.equal(readdirSync(folder).filter((entry) => /^\d\d-/.test(entry)).length, 66);
  assert.ok(existsSync(path.join(folder, 'berean-standard-bible.md')));
  assert.ok(existsSync(path.join(folder, '19-psalms', 'psalms-001.md')));
  assert.ok(existsSync(path.join(folder, '19-psalms', 'psalms-150.md')));
  assert.match(readFileSync(path.join(folder, '20-proverbs', 'proverbs-31.md'), 'utf8'), /###### 4\n\nIt is not for kings/);
  assert.match(readFileSync(path.join(folder, '20-proverbs', 'proverbs.md'), 'utf8'), /- \[Proverbs 31\]\(<proverbs-31\.md>\)/);

  const index = await sandbox.run(['index']);
  assert.equal(index.status, 0, index.stderr);
  const clean = await sandbox.run(['check', '--json']);
  const imported: Array<{ code: string; path: string; message: string }> = JSON.parse(clean.stdout).findings;
  assert.deepEqual(imported, [], JSON.stringify(imported.slice(0, 5)));

  await addCollection('notes');
  const made = await sandbox.run(['new', 'notes', 'Study']);
  assert.equal(made.status, 0, made.stderr);
  const study = path.join(sandbox.root, 'notes', 'study.md');
  const text = readFileSync(study, 'utf8');
  writeFileSync(study, `${text}\nSee [Proverbs 31 › 4–6](<../bible/20-proverbs/proverbs-31.md#4>) and [a verse that is not there](<../bible/20-proverbs/proverbs-31.md#40>).\n`);
  const check = await sandbox.run(['check', '--json']);
  const findings: Array<{ code: string; message: string }> = JSON.parse(check.stdout).findings;
  const headings = findings.filter((finding) => finding.code === 'link-heading');
  assert.equal(headings.length, 1, JSON.stringify(findings));
  assert.match(headings[0]?.message ?? '', /#40/);
});

test('a translation already in the project, and a collection that already holds files, are refused', async () => {
  await addCollection('Second Bible');
  const again = await sandbox.run(['bible', 'import', 'Second Bible'], { env: env() });
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /Berean Standard Bible is already in this project, at bible\/berean-standard-bible\.md/);
  const full = await sandbox.run(['bible', 'import', 'notes', '--translation', 'WEB'], { env: env() });
  assert.match(full.stderr, /[Nn]otes already holds files/);
});

test('a collection that is not there, a folder that is not a collection, and a translation not offered are refused before anything is fetched', async () => {
  const missing = await sandbox.run(['bible', 'import', 'Scripture'], { env: env() });
  assert.match(missing.stderr, /no collection Scripture; make one first .*eidos configure:collection add "Scripture"/);
  assert.match((await sandbox.run(['bible', 'import', 'Second Bible', '--translation', 'NIV'], { env: env() })).stderr, /not one of the translations offered/);
  const folder = await sandbox.run(['configure:folder', 'add', 'loose', '--description', 'Notes of my own', '--yes']);
  assert.equal(folder.status, 0, folder.stderr);
  assert.match((await sandbox.run(['bible', 'import', 'loose'], { env: env() })).stderr, /loose is not a collection/);
});

test('a translation the source no longer marks public domain is not imported', async () => {
  const run = await sandbox.run(['bible', 'import', 'Second Bible', '--translation', 'KJV'], { env: env() });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /no longer marks King James Version as public domain/);
  assert.deepEqual(readdirSync(path.join(sandbox.root, 'second-bible')).filter((entry) => !entry.startsWith('.')), []);
});

test('the page is offered the translations and the empty collections, and a bad request is refused at once', async () => {
  const answer = await sandbox.route<{ translations: Array<{ short: string }>; collections: Array<{ name: string; title: string }>; suggested: string }>('GET', 'options');
  assert.deepEqual(
    answer.translations.map((translation) => translation.short),
    ['BSB', 'WEB', 'KJV', 'ASV', 'MSB', 'RV1909', 'BES', 'BLM', 'BLL', 'BPM'],
  );
  assert.deepEqual(answer.collections, [{ name: 'second-bible', title: 'Second Bible' }]);
  assert.equal(answer.suggested, 'bible');
  await assert.rejects(sandbox.route('POST', 'import', { body: { translation: 'BSB', collection: '' } }), /a collection to import into/);
});

test('the collection an import needs is made through the host where it can, and an older host says how to make it', async () => {
  const offered = await sandbox.route<{ can_create: boolean }>('GET', 'options');
  if (!offered.can_create) {
    await assert.rejects(sandbox.route('POST', 'collection', { body: { title: 'Biblia' } }), /cannot make a collection for a plugin/);
    return;
  }
  const made = await sandbox.route<{ name: string; title: string }>('POST', 'collection', { body: { title: 'Biblia', description: 'Reina-Valera 1909' } });
  assert.deepEqual(made, { name: 'biblia', title: 'Biblia' });
  const after = await sandbox.route<{ collections: Array<{ name: string; title: string }> }>('GET', 'options');
  assert.ok(after.collections.some((choice) => choice.name === 'biblia' && choice.title === 'Biblia'), 'the page is offered it at once');
  await assert.rejects(sandbox.route('POST', 'collection', { body: { title: 'Biblia' } }));
});

test('eidos bible translations lists the translations by language', async () => {
  const run = await sandbox.run(['bible', 'translations']);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^English\n  BSB {5}Berean Standard Bible\n[\s\S]*\nSpanish\n  RV1909  Reina-Valera 1909\n[\s\S]*\nPortuguese\n  BPM {5}Bíblia Portuguesa Mundial\n$/);
});
