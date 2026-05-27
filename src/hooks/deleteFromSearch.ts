import type { CollectionAfterDeleteHook } from 'payload'

import type { AlgoliaSearchConfig } from '../types.js'

import createClient from '../algolia.js'
import { getObjectID } from './syncWithSearch.js'

export default function deleteFromSearch(
  searchConfig: AlgoliaSearchConfig,
): CollectionAfterDeleteHook {
  return async ({ collection, doc, req: { payload } }) => {
    try {
      const { client, indexName } = createClient(searchConfig.algolia)
      const objectID = getObjectID({ collection, doc })

      const deleteOp = client.deleteObject({ indexName, objectID })

      if (searchConfig.waitForHook === true) {
        await deleteOp
      }

      return doc
    } catch (error) {
      payload.logger.error({
        err: `Error deleting search for ${collection.slug} ${doc.id}: ${error}`,
      })
    }
  }
}
