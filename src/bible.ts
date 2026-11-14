// The Bible as this plugin writes it: the translations it offers, the 66
// books with their names and order, and the markdown each page is made of.
// Pure functions over the source's data, so the layout is tested without a
// network or a host.

// A translation the plugin offers: the source's id for it and the name a
// person picks it by. Each is public domain, which the import checks again
// against the license the source sends with the text.
export interface Translation {
  id: string;
  short: string;
  name: string;
}

export const TRANSLATIONS: readonly Translation[] = [
  { id: 'BSB', short: 'BSB', name: 'Berean Standard Bible' },
  { id: 'ENGWEBP', short: 'WEB', name: 'World English Bible' },
  { id: 'eng_kjv', short: 'KJV', name: 'King James Version' },
  { id: 'eng_asv', short: 'ASV', name: 'American Standard Version (1901)' },
  { id: 'eng_msb', short: 'MSB', name: 'Majority Standard Bible' },
];

// A translation by its id or its short name, in any case.
export function findTranslation(wanted: string): Translation | null {
  const lower = wanted.trim().toLowerCase();
  return TRANSLATIONS.find((translation) => translation.id.toLowerCase() === lower || translation.short.toLowerCase() === lower) ?? null;
}

// The 66 books in the source's ids, their English names, and their chapter
// counts. The names are fixed here rather than taken from the source, so
// every translation is written under the same file names and a link to
// `Proverbs 31` reads the same whichever translation it lands in.
export const BOOKS: ReadonlyArray<readonly [id: string, name: string, chapters: number]> = [
  ['GEN', 'Genesis', 50], ['EXO', 'Exodus', 40], ['LEV', 'Leviticus', 27], ['NUM', 'Numbers', 36], ['DEU', 'Deuteronomy', 34],
  ['JOS', 'Joshua', 24], ['JDG', 'Judges', 21], ['RUT', 'Ruth', 4], ['1SA', '1 Samuel', 31], ['2SA', '2 Samuel', 24],
  ['1KI', '1 Kings', 22], ['2KI', '2 Kings', 25], ['1CH', '1 Chronicles', 29], ['2CH', '2 Chronicles', 36], ['EZR', 'Ezra', 10],
  ['NEH', 'Nehemiah', 13], ['EST', 'Esther', 10], ['JOB', 'Job', 42], ['PSA', 'Psalms', 150], ['PRO', 'Proverbs', 31],
  ['ECC', 'Ecclesiastes', 12], ['SNG', 'Song of Solomon', 8], ['ISA', 'Isaiah', 66], ['JER', 'Jeremiah', 52], ['LAM', 'Lamentations', 5],
  ['EZK', 'Ezekiel', 48], ['DAN', 'Daniel', 12], ['HOS', 'Hosea', 14], ['JOL', 'Joel', 3], ['AMO', 'Amos', 9],
  ['OBA', 'Obadiah', 1], ['JON', 'Jonah', 4], ['MIC', 'Micah', 7], ['NAM', 'Nahum', 3], ['HAB', 'Habakkuk', 3],
  ['ZEP', 'Zephaniah', 3], ['HAG', 'Haggai', 2], ['ZEC', 'Zechariah', 14], ['MAL', 'Malachi', 4], ['MAT', 'Matthew', 28],
  ['MRK', 'Mark', 16], ['LUK', 'Luke', 24], ['JHN', 'John', 21], ['ACT', 'Acts', 28], ['ROM', 'Romans', 16],
  ['1CO', '1 Corinthians', 16], ['2CO', '2 Corinthians', 13], ['GAL', 'Galatians', 6], ['EPH', 'Ephesians', 6], ['PHP', 'Philippians', 4],
  ['COL', 'Colossians', 4], ['1TH', '1 Thessalonians', 5], ['2TH', '2 Thessalonians', 3], ['1TI', '1 Timothy', 6], ['2TI', '2 Timothy', 4],
  ['TIT', 'Titus', 3], ['PHM', 'Philemon', 1], ['HEB', 'Hebrews', 13], ['JAS', 'James', 5], ['1PE', '1 Peter', 5],
  ['2PE', '2 Peter', 3], ['1JN', '1 John', 5], ['2JN', '2 John', 1], ['3JN', '3 John', 1], ['JUD', 'Jude', 1],
  ['REV', 'Revelation', 22],
];

export const TOTAL_CHAPTERS = BOOKS.reduce((sum, [, , chapters]) => sum + chapters, 0);

// ---- the source's data (bible.helloao.org's complete.json) -----------------

export interface SourceLicense {
  publicDomain?: boolean;
  derivatives?: string;
}

export type VerseItem =
  | string
  | { text: string; poem?: number; wordsOfJesus?: boolean }
  | { noteId: number }
  | { lineBreak: true; paragraph?: string }
  | { heading: string };

export type ContentItem =
  | { type: 'heading'; content: string[] }
  | { type: 'line_break'; paragraph?: string }
  | { type: 'hebrew_subtitle'; content: VerseItem[] }
  | { type: 'verse'; number: number; content: VerseItem[] };

export interface SourceChapter {
  chapter: {
    number: number;
    content: ContentItem[];
    footnotes: Array<{ noteId: number; text: string }>;
  };
}

export interface SourceBook {
  id: string;
  chapters: SourceChapter[];
}

export interface SourceTranslation {
  translation: { id: string; name: string; website?: string; licenseUrl?: string; license?: SourceLicense };
  books: SourceBook[];
}

// ---- where each page goes ---------------------------------------------------

// A name in the root's naming convention, as Eidos MD names a blueprint's file
// or a folder (its naming.ts): `proverbs-31` in kebab-case, `Proverbs31` in
// TitleCase, `Proverbs 31` in Title Case. The host does not hand a plugin its
// naming functions, so the three conventions are followed here.
export function nameIn(naming: string, given: string): string {
  const plain = given.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/\p{M}/gu, '');
  if (naming === 'kebab-case') {
    return plain
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  if (naming === 'TitleCase') {
    return plain
      .split(/[^A-Za-z0-9]+/)
      .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
      .join('');
  }
  return given.trim().replace(/\s+/g, ' ');
}

// A chapter's number as its file names it: as wide as the book's last chapter,
// so a book's chapters sort in order (Psalms 001 to 150, Proverbs 01 to 31).
export function padChapter(chapter: number, chapters: number): string {
  return String(chapter).padStart(String(chapters).length, '0');
}

// Where each page of a translation goes inside its collection, its files and
// folders named in the root's convention. Titles keep the plain names
// (Proverbs 31), which is what a person types to link one.
export class Layout {
  readonly naming: string;
  readonly translation: Translation;

  constructor(naming: string, translation: Translation) {
    this.naming = naming;
    this.translation = translation;
  }

  // A book's folder: its place among the 66 and its name, `20-proverbs`.
  bookFolder(index: number, name: string): string {
    return nameIn(this.naming, `${String(index + 1).padStart(2, '0')} ${name}`);
  }

  bookFile(name: string): string {
    return `${nameIn(this.naming, name)}.md`;
  }

  chapterFile(name: string, chapter: number, chapters: number): string {
    return `${nameIn(this.naming, `${name} ${padChapter(chapter, chapters)}`)}.md`;
  }

  translationFile(): string {
    return `${nameIn(this.naming, this.translation.name)}.md`;
  }

  // Ids unique in the root and readable: `bsb` for the translation, `bsb-pro`
  // for a book, `bsb-pro-31` for a chapter.
  id(bookId?: string, chapter?: number): string {
    const parts = [this.translation.short, bookId, chapter === undefined ? undefined : String(chapter)];
    return parts
      .filter((part) => part !== undefined)
      .join('-')
      .toLowerCase();
  }
}

// A link's target as the standard writes it, in angle brackets so a space in
// a name needs no escaping.
function link(text: string, target: string): string {
  return `[${text}](<${target}>)`;
}

// A blueprint's frontmatter: the standard's three properties, quoted as YAML
// strings so a title holding a colon stays one value.
function frontmatter(id: string, title: string, summary: string): string {
  return ['---', `id: ${JSON.stringify(id)}`, `title: ${JSON.stringify(title)}`, `summary: ${JSON.stringify(summary)}`, '---'].join('\n');
}

// ---- the pages ----------------------------------------------------------------

// One verse's text: its words, a poem's lines each on a line of its own, and
// a footnote's marker where the source places it, numbered from 1 within the
// chapter. The app and Obsidian both keep a single line break. The source
// starts a poem's line where its indent changes or at a line break; pieces at
// the same indent with only a note between are one line ("A wife[^2] of noble
// character, who can find?").
function verseText(items: VerseItem[], notes: Map<number, number>): string {
  let out = '';
  let indent: number | undefined;
  const add = (text: string): void => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    const joined = out === '' || out.endsWith('\n') || /^[,.;:!?’”)\]]/.test(trimmed);
    out += joined ? trimmed : ` ${trimmed}`;
  };
  const breakLine = (): void => {
    if (out !== '' && !out.endsWith('\n')) out += '\n';
  };
  for (const item of items) {
    if (typeof item === 'string') {
      indent = undefined;
      add(item);
    } else if ('noteId' in item) {
      const number = notes.get(item.noteId);
      if (number !== undefined) out += `[^${number}]`;
    } else if ('lineBreak' in item) {
      breakLine();
    } else if ('heading' in item) {
      breakLine();
      out += `_${item.heading.trim()}_\n`;
      indent = undefined;
    } else {
      if (item.poem !== undefined && item.poem !== indent) breakLine();
      indent = item.poem;
      add(item.text);
    }
  }
  return out.trim();
}

export interface ChapterPlace {
  bookId: string;
  book: string;
  chapter: number;
  chapters: number;
}

// The navigation line at a chapter's head and foot: the chapter before, the
// book's index, and the chapter after, each within the book.
function chapterNav(layout: Layout, { book, chapter, chapters }: ChapterPlace): string {
  const parts: string[] = [];
  if (chapter > 1) parts.push(link(`← ${book} ${chapter - 1}`, layout.chapterFile(book, chapter - 1, chapters)));
  parts.push(link(book, layout.bookFile(book)));
  if (chapter < chapters) parts.push(link(`${book} ${chapter + 1} →`, layout.chapterFile(book, chapter + 1, chapters)));
  return parts.join(' · ');
}

// A chapter's blueprint. Each verse is an H6 holding only its number, so
// `proverbs-31.md#4` reaches verse 4 and a range (`[[Proverbs 31#4..6]]`
// in the editor) runs from one verse's heading to another's. The source's
// section headings are H5s and its psalm titles are italic lines. The title
// is the frontmatter's alone: the Linter's heading-levels rule lowers a
// heading that skips a level below the one before it, so an H1 above the
// verses would turn them into H2s on the next save, while H5 and H6 under no
// H1 are left as they are. Its emphasis and heading rules are kept too, so a
// save changes nothing.
export function chapterMarkdown(layout: Layout, place: ChapterPlace, source: SourceChapter, withFootnotes: boolean): string {
  const notes = new Map<number, number>();
  const used: Array<{ number: number; text: string }> = [];
  if (withFootnotes) {
    const byId = new Map(source.chapter.footnotes.map((note) => [note.noteId, note.text]));
    for (const item of source.chapter.content) {
      if (item.type !== 'verse' && item.type !== 'hebrew_subtitle') continue;
      for (const part of item.content) {
        if (typeof part === 'object' && 'noteId' in part && byId.has(part.noteId) && !notes.has(part.noteId)) {
          notes.set(part.noteId, used.length + 1);
          used.push({ number: used.length + 1, text: byId.get(part.noteId) ?? '' });
        }
      }
    }
  }
  const title = `${place.book} ${place.chapter}`;
  const nav = chapterNav(layout, place);
  const blocks: string[] = [nav, '---'];
  for (const item of source.chapter.content) {
    if (item.type === 'heading') {
      const text = item.content.join(' ').trim().replace(/[.,;:]+$/, '');
      if (text !== '') blocks.push(`##### ${text}`);
    } else if (item.type === 'hebrew_subtitle') {
      const text = verseText(item.content, notes);
      if (text !== '') blocks.push(`_${text}_`);
    } else if (item.type === 'verse') {
      blocks.push(`###### ${item.number}`);
      const text = verseText(item.content, notes);
      if (text !== '') blocks.push(text);
    }
  }
  blocks.push('---', nav);
  if (used.length > 0) blocks.push(used.map((note) => `[^${note.number}]: ${note.text.trim()}`).join('\n'));
  const head = frontmatter(layout.id(place.bookId, place.chapter), title, `${title} in the ${layout.translation.name}`);
  return `${head}\n\n${blocks.join('\n\n')}\n`;
}

// A book's index: a link to each chapter.
export function bookMarkdown(layout: Layout, bookId: string, book: string, chapters: number): string {
  const lines = [frontmatter(layout.id(bookId), book, `The book of ${book} in the ${layout.translation.name}, a page per chapter`), '', `# ${book}`, ''];
  for (let chapter = 1; chapter <= chapters; chapter++) lines.push(`- ${link(`${book} ${chapter}`, layout.chapterFile(book, chapter, chapters))}`);
  return `${lines.join('\n')}\n`;
}

// The translation's index, at the top of the collection: every book, and
// where the text came from and under what terms, so the import carries its notice.
export function translationMarkdown(layout: Layout, source: SourceTranslation['translation']): string {
  const title = layout.translation.name;
  const lines = [frontmatter(layout.id(), title, `The ${title}, every book, and where its text came from`), '', `# ${title}`, ''];
  const credit = source.website ? link(source.name, source.website) : source.name;
  lines.push(`The ${credit}, imported from the Free Use Bible API (bible.helloao.org). The text is in the public domain.`, '');
  lines.push('## Old Testament', '');
  BOOKS.forEach(([, name], index) => {
    if (index === 39) lines.push('', '## New Testament', '');
    lines.push(`- ${link(name, `${layout.bookFolder(index, name)}/${layout.bookFile(name)}`)}`);
  });
  return `${lines.join('\n')}\n`;
}
