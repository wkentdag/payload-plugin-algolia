import type { Config } from 'payload/config'

import { onInitExtension } from './onInitExtension'
import type { AlgoliaSearchConfig } from './types'
import syncWithSearch from './hooks/syncWithSearch'
import deleteFromSearch from './hooks/deleteFromSearch'

export const AlgoliaSearchPlugin =
  (searchConfig: AlgoliaSearchConfig) =>
  (config: Config): Config => {
    const { collections } = config

    if (collections) {
      const enabledCollections = searchConfig.collections || []

      const collectionsWithSearchHooks = collections
        ?.map(collection => {
          const { hooks: existingHooks } = collection
          const isEnabled = enabledCollections.indexOf(collection.slug) > -1

          if (isEnabled) {
            return {
              ...collection,
              hooks: {
                ...collection.hooks,
                afterChange: [...(existingHooks?.afterChange || []), syncWithSearch(searchConfig)],
                afterDelete: [
                  ...(existingHooks?.afterDelete || []),
                  deleteFromSearch(searchConfig),
                ],
              },
            }
          }

          return collection
        })
        .filter(Boolean)

      // @TODO on init extension to set attributes / facets?

      return {
        ...config,
        collections: [...(collectionsWithSearchHooks || [])],
      }
    }

    return config
  }
