// Bible Import's app entry: the routes its page calls, under
// /api/plugins/bible/. An import runs on after the route answers, and its
// progress and its end reach the page as events.
import { HostError, type AppEntry } from 'eidosmd/plugin';
import type { Api } from './cli.ts';

const entry: AppEntry<Api> = {
  name: 'bible',
  mount(host, api) {
    let running = false;
    host.route('GET', 'options', () => {
      const suggested = api.suggestedCollection();
      return {
        translations: api.translations(),
        collections: api.emptyCollections(),
        suggested,
        command: api.collectionCommand('Bible'),
        can_create: api.canCreateCollection(),
      };
    });
    host.route('POST', 'collection', async (request) => {
      const title = typeof request.body.title === 'string' ? request.body.title : '';
      const description = typeof request.body.description === 'string' ? request.body.description : '';
      return api.createCollection(title, description);
    });
    host.route('POST', 'import', (request) => {
      if (running) throw new HostError(409, 'an import is already running');
      const body = request.body;
      const translation = typeof body.translation === 'string' ? body.translation : 'BSB';
      const collection = typeof body.collection === 'string' ? body.collection : '';
      const footnotes = body.footnotes !== false;
      api.prepare({ translation, collection, footnotes });
      running = true;
      void (async () => {
        try {
          const result = await api.import({ translation, collection, footnotes }, (progress) => host.emit('progress', progress));
          host.emit('done', { name: result.translation.name, collection: result.collection, title: result.title, files: result.files });
        } catch (cause) {
          host.emit('failed', { message: cause instanceof Error ? cause.message : String(cause) });
        } finally {
          running = false;
        }
      })();
      return { started: true };
    });
  },
};

export default entry;
