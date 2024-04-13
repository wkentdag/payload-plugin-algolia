import { CollectionAfterChangeHook } from 'payload/types'

export interface SearchDocument {
  [key: string]: any
  objectID?: never
}

export interface AlgoliaSearchConfig {
  collections?: string[]
  app_id: string
  api_key: string
  index: string
  generateSearchDoc?: (
    args: Parameters<CollectionAfterChangeHook>[0],
  ) => SearchDocument | Promise<SearchDocument>
}
