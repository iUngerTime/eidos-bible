# Bible Import for Eidos MD

Put a whole public-domain Bible into your Eidos project, a blueprint per chapter, then link to any verse from your study notes. Install it, import once, and remove it if you like: the blueprints are your project's own and stay.

- **A blueprint per chapter, a folder per book.** `bible/20-proverbs/proverbs-31.md`, titled _Proverbs 31_, with a book index beside each book and a translation index at the top. They show in the sidebar and in search like any other blueprint.
- **Every verse is a heading.** Each verse sits under a small `###### 4` heading, so a link can land on one verse or span a few, like Proverbs 31:4–6.
- **You choose where it goes.** Any empty collection in the project.
- **Public domain only.** Five translations whose text anyone may copy, and the import checks the license that comes with the text before writing a page.
- **The source's own shape.** Section headings, psalm titles, poetry line by line, and the translators' footnotes (which you can leave out).
- **Clean on arrival.** Every page passes `eidos check` and the Linter as written, so saving one changes nothing.

## Translations

| Language   | Short name | Translation                      |
| :--------- | :--------- | :------------------------------- |
| English    | BSB        | Berean Standard Bible (default)  |
| English    | WEB        | World English Bible              |
| English    | KJV        | King James Version               |
| English    | ASV        | American Standard Version (1901) |
| English    | MSB        | Majority Standard Bible          |
| Spanish    | RV1909     | Reina-Valera 1909                |
| Spanish    | BES        | La Biblia en Español Sencillo    |
| Spanish    | BLM        | Biblia Libre para el Mundo       |
| Spanish    | BLL        | Biblia Libre Latinoamericana     |
| Portuguese | BPM        | Bíblia Portuguesa Mundial        |

A Spanish or Portuguese translation is written in its own language: its book names (_Proverbios 31_, _Provérbios 31_), its summaries, and its index. The import page is in English, Spanish, or Portuguese, following the app, and offers that language's translation first.

The text comes from the [Free Use Bible API](https://bible.helloao.org/docs/) (bible.helloao.org), which is MIT licensed and adds no terms of its own. Each translation above is in the public domain: the Berean Standard Bible was [dedicated to the public domain](https://berean.bible/licensing.htm) in April 2023, and the others are long out of copyright. One caveat: in the United Kingdom the King James Version is still under the Crown's letters patent, so check before publishing a KJV import there.

## Import

You need Eidos MD 0.24.0 or later. Install the plugin from **Settings → Community plugins**, enable it, and allow it to run.

1. **Make a collection for it.** On Eidos MD 0.26.0 or later, choose **Make the Bible collection** on the import page. On an older version, choose **New collection** on the Home and name it _Bible_ (any name works).
2. **Import.** Open the plugin's settings page (the cog beside **Bible Import** on the Community plugins page). Pick a translation and the collection, and choose **Import**. The page shows each book as it is written, and a toast says when it is done.
3. **Rebuild the index** when `eidos check` asks (the **Rebuild the index** fix in the app, or `eidos index`).

From a terminal:

```bash
eidos configure:collection add "Bible" --description "The Berean Standard Bible"
eidos bible import Bible --translation BSB
eidos index
```

`eidos bible translations` lists the translations, and `--no-footnotes` leaves the translators' notes out.

A full import is one download of about 8 MB and writes 1,256 blueprints in a few seconds.

The collection must be empty, so nothing of yours is written over, and each translation is imported once per project, since its ids would otherwise repeat. To keep two translations side by side, give each a collection of its own.

## What a chapter looks like

```markdown
---
id: "bsb-pro-31"
title: "Proverbs 31"
summary: "Proverbs 31 in the Berean Standard Bible"
---

[← Proverbs 30](<proverbs-30.md>) · [Proverbs](<proverbs.md>)

---

##### The Sayings for King Lemuel

###### 1

These are the words of King Lemuel—the burden that his mother taught him:

###### 2

What shall I say,[^1] O my son?
What, O son of my womb?
What, O son of my vows?
```

The title lives in the frontmatter, and section headings are H5s. The Linter's heading-levels rule lowers a heading that skips a level below the one before it, so a `#` title above the verses would turn them into `##` headings on the first save. Under an H5 they stay small.

File and folder names follow your project's naming convention (`proverbs-31.md` in kebab-case, `Proverbs 31.md` in Title Case), and chapter numbers are padded to the book's widest (`psalms-001` to `psalms-150`), so chapters sort in order.

## Linking to verses

In the Eidos MD editor, type `[[Proverbs 31#4..6]]` and it becomes a standard link:

```markdown
[Proverbs 31 › 4–6](<../bible/20-proverbs/proverbs-31.md#4>)
```

A link to a range points at its first verse, so it works in any markdown reader, and an embed of the range shows verses 4 to 6 in place. `eidos check` reports a link to a verse that isn't there.

## Good to know

- The index of every collection lives in `.eidos/Framework.yaml`, so a translation adds about 6,000 lines there.
- Ids read as the translation, the book, and the chapter: `bsb` for the translation's index, `bsb-pro` for Proverbs, `bsb-pro-31` for a chapter.

## Develop

```bash
pnpm install
pnpm test
```

`pnpm run dev` rebuilds `dist/` on every change. To try it in a sandbox project with the app, run `eidos plugin dev dist`. The tests run the import in a sandbox against a local fake source, so they need no network.

Until `eidosmd` publishes `eidosmd/page` and `eidosmd/plugin-testing` to npm, `package.json` links a local checkout of Eidos MD at `../eidosmd/cli`.

## License

MIT, for the plugin's code. The Bible text it imports is in the public domain.
