import type { CollectionAfterDeleteHook } from 'payload'

import createClient from '../algolia.js'
import type { AlgoliaSearchConfig } from '../types.js'
import { getObjectID } from './syncWithSearch.js'

export default function deleteFromSearch(
  searchConfig: AlgoliaSearchConfig,
): CollectionAfterDeleteHook {
  return async ({ doc, collection, req: { payload } }) => {
    try {
      const { client, indexName } = createClient(searchConfig.algolia)
      const objectID = getObjectID({ collection, doc })

      client.deleteObject({ indexName, objectID })
    } catch (error) {
      payload.logger.error({
        err: `Error deleting search for ${collection.slug} ${doc.id}: ${error}`,
      })
    }
  }
}
