import { CollectionAfterDeleteHook } from 'payload/types'

import createClient from '../algolia'
import { AlgoliaSearchConfig } from '../types'

export default function deleteFromSearch(
  searchConfig: AlgoliaSearchConfig,
): CollectionAfterDeleteHook {
  return async ({ doc, collection, req: { payload } }) => {
    try {
      const searchClient = createClient(searchConfig)
      // @TODO this should be configurable
      const objectID = `${collection.slug}:${doc.id}`

      await searchClient.deleteObject(objectID).wait()
    } catch (error) {
      payload.logger.error({
        err: `Error deleting search for ${collection.slug} ${doc.id}: ${error}`,
      })
    }
  }
}
