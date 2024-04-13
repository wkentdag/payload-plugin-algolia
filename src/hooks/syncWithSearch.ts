import { CollectionAfterChangeHook } from 'payload/types'

import createClient from '../algolia'
import { AlgoliaSearchConfig } from '../types'

const generateSearchDoc: AlgoliaSearchConfig['generateSearchDoc'] = ({ collection, doc }) => {
  return {
    objectID: `${collection.slug}:${doc.id}`,
    ...doc,
  }
}

export default function syncWithSearch(
  searchConfig: AlgoliaSearchConfig,
): CollectionAfterChangeHook {
  return async args => {
    const {
      collection,
      doc,
      // operation,
      req: { payload },
    } = args

    try {
      if (doc?._status === 'draft') {
        // @TODO remove search result if there is no stale published version
        return doc
      }

      const generateSearchDocFn = searchConfig.generateSearchDoc || generateSearchDoc

      const searchDoc = await generateSearchDocFn!(args)

      if (!searchDoc) {
        throw new Error('invalid searchDoc')
      }

      const searchClient = createClient(searchConfig)
      const objectID = `${collection.slug}:${doc.id}`

      await searchClient
        .saveObject({
          objectID,
          collection: collection.slug,
          ...searchDoc,
        })
        .wait()
    } catch (error) {
      payload.logger.error({
        err: `Error syncing search for ${collection.slug} ${doc.id}: ${error}`,
      })
    }

    return doc
  }
}
