import { type AlgoliaSearchOptions } from 'algoliasearch'
import { type CollectionAfterChangeHook } from 'payload/types'

export interface SearchAttributes {
  [key: string]: any
  objectID?: never
}

export interface AlgoliaSearchConfig {
  algolia: {
    appId: string
    apiKey: string
    index: string
    options?: AlgoliaSearchOptions
  }
  collections?: string[]
  generateSearchAttributes?: (
    args: Parameters<CollectionAfterChangeHook>[0],
  ) => SearchAttributes | Promise<SearchAttributes>
}
