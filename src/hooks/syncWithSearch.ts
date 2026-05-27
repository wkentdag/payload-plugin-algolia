import type { CollectionAfterChangeHook } from 'payload'

import type { AlgoliaSearchConfig } from '../types.js'

import createClient from '../algolia.js'

const generateSearchAttributes: AlgoliaSearchConfig['generateSearchAttributes'] = ({
  collection,
  doc,
}) => {
  return {
    collection: collection.slug,
    ...doc,
  }
}

export const getObjectID = ({
  collection,
  doc,
}: Pick<Parameters<CollectionAfterChangeHook>[0], 'collection' | 'doc'>) =>
  `${collection.slug}:${doc.id}`

export default function syncWithSearch(
  searchConfig: AlgoliaSearchConfig,
): CollectionAfterChangeHook {
  return async (args: Parameters<CollectionAfterChangeHook>[0]) => {
    const {
      collection,
      doc,
      previousDoc,
      req: { payload },
    } = args
    try {
      // eslint-disable-next-line no-prototype-builtins
      const hasPreviousDoc = previousDoc?.hasOwnProperty('id')
      if (doc?._status === 'draft' && !hasPreviousDoc) {
        // quick early exit for first drafts
        return doc
      }

      const { client, indexName } = createClient(searchConfig.algolia)
      const objectID = getObjectID({ collection, doc })

      // remove search results for unpublished docs
      if (doc?._status === 'draft' && hasPreviousDoc) {
        // distinguish between "pending change" (canonical document is still published)
        // vs "unpublish" (canonical document is draft)
        try {
          const publishedDoc = await payload.findByID({
            id: doc.id,
            collection: collection.slug,
            draft: false,
          })

          if (publishedDoc && publishedDoc._status === 'published') {
            // ignore pending changes
            return doc
          } else {
            // remove search results for unpublished
            const deleteOp = client.deleteObject({ indexName, objectID })

            if (searchConfig.waitForHook === true) {
              await deleteOp
            }

            return doc
          }
        } catch (error) {
          return doc
        }
      }

      const generateSearchAttributesFn =
        searchConfig.generateSearchAttributes || generateSearchAttributes

      const searchDoc = await generateSearchAttributesFn!(args)

      if (!searchDoc) {
        // @TODO check for stale search results?
        return doc
        // throw new Error('invalid searchDoc')
      }

      const saveOp = client.saveObject({
        body: {
          collection: collection.slug,
          objectID,
          ...searchDoc,
        },
        indexName,
      })

      if (searchConfig.waitForHook === true) {
        await saveOp
      }
    } catch (error) {
      payload.logger.error({
        err: `Error syncing search for ${collection.slug} ${doc.id}: ${error}`,
      })
    }

    return doc
  }
}
