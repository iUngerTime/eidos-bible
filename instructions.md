# Bible Import

Writes a whole public-domain Bible translation into an empty collection, once, a blueprint per chapter. The blueprints are the project's own: the plugin keeps no hold on them, and they stay when the plugin is switched off or removed.

## What it writes

Into the collection the person chose (`bible`), named in the project's convention:

- `berean-standard-bible.md` (id `bsb`): every book, and where the text came from.
- `20-proverbs/proverbs.md` (id `bsb-pro`): a book's index, a link to each chapter.
- `20-proverbs/proverbs-31.md` (id `bsb-pro-31`, title `Proverbs 31`): one chapter. Its number is padded to the book's widest (`psalms-001`), so chapters sort in order.

A chapter has `id`, `title`, and `summary` in its frontmatter and no H1. Its body is a line linking the chapter before, the book, and the chapter after, the source's section headings as H5s, and each verse as an H6 holding only its number (`###### 4`) with its text beneath. The translators' notes are footnotes at the foot, unless the import was told to leave them out. Do not add an H1 or raise the section headings: the Linter would then lower the verse headings.

## Linking to a verse

A verse is a heading, so link to it as to any heading: `[Proverbs 31 › 4](<../bible/20-proverbs/proverbs-31.md#4>)`, relative to the linking file. A range links to its first verse and names both ends in its text: `[Proverbs 31 › 4–6](<../bible/20-proverbs/proverbs-31.md#4>)`. To show the verses in place, use an embed region with `to` set to the last verse. In the editor, typing `[[Proverbs 31#4..6]]` writes the link.

## Commands

- `eidos bible translations` lists the translations offered.
- `eidos bible import <collection> [--translation BSB] [--no-footnotes]` writes one into `<collection>`, which must be a declared collection holding nothing yet (`eidos configure:collection add bible` makes one). A translation is imported once per project. Run `eidos index` after it.

Do not edit an imported chapter to add study notes; write them in the project's own blueprints and link to the verse.
