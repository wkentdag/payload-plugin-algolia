import { CollectionAfterChangeHook } from 'payload/types'

export interface SearchAttributes {
  [key: string]: any
  objectID?: never
}

export interface AlgoliaSearchConfig {
  collections?: string[]
  // @TODO accept all algolia options
  app_id: string
  api_key: string
  index: string
  generateSearchAttributes?: (
    args: Parameters<CollectionAfterChangeHook>[0],
  ) => SearchAttributes | Promise<SearchAttributes>
}
