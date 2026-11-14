// Bible Import's CLI entry: `eidos bible translations` lists what it offers
// and `eidos bible import <collection>` writes one into the project. The API
// it gives back is what the app entry answers the page through.
import { type CliEntry, type Host } from 'eidosmd/plugin';
import { TRANSLATIONS, type Translation } from './bible.ts';
import {
  collectionCommand,
  emptyCollections,
  prepareImport,
  runImport,
  suggestedCollection,
  type ImportRequest,
  type ImportResult,
  type Prepared,
  type Progress,
} from './importer.ts';

export interface Api {
  translations(): readonly Translation[];
  emptyCollections(): string[];
  suggestedCollection(): string;
  collectionCommand(name: string): string;
  prepare(request: ImportRequest): Prepared;
  import(request: ImportRequest, report: (progress: Progress) => void): Promise<ImportResult>;
}

const entry: CliEntry = {
  register(host: Host) {
    const api: Api = {
      translations: () => TRANSLATIONS,
      emptyCollections: () => emptyCollections(host),
      suggestedCollection: () => suggestedCollection(host),
      collectionCommand,
      prepare: (request) => prepareImport(host, request),
      import: (request, report) => runImport(host, request, report),
    };
    host.command((command) => {
      command
        .command('translations')
        .description('list the public-domain translations the import offers')
        .action(() => {
          for (const translation of TRANSLATIONS) process.stdout.write(`${translation.short.padEnd(5)} ${translation.name}\n`);
        });
      command
        .command('import')
        .argument('<collection>', 'the empty collection to write it into (make one first: eidos configure:collection add bible)')
        .option('--translation <name>', 'the translation, by its short name (eidos bible translations)', 'BSB')
        .option('--no-footnotes', "leave out the translators' footnotes")
        .description('write a whole translation into a collection: a folder per book, a blueprint per chapter, each verse an H6 to link to')
        .action(async (collection: string, options: { translation: string; footnotes: boolean }) => {
          const result = await api.import({ translation: options.translation, collection, footnotes: options.footnotes }, (progress) => {
            process.stderr.write(`\r${progress.done}/${progress.total} chapters, ${progress.book}`.padEnd(48));
          });
          process.stderr.write('\n');
          process.stdout.write(`✓ ${result.translation.name} written to ${result.collection}/ (${result.files} blueprints)\n`);
        });
    });
    return { api };
  },
};

export default entry;
