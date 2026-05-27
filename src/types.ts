import type { algoliasearch } from 'algoliasearch'
import type { CollectionAfterChangeHook } from 'payload'

export type AlgoliaClientOptions = NonNullable<Parameters<typeof algoliasearch>[2]>

export interface SearchAttributes extends UnknownSearchAttributes {
  objectID?: never
}

export interface UnknownSearchAttributes {
  [key: string]: any
}

export type GenerateSearchAttributes<D extends SearchAttributes = UnknownSearchAttributes> = (
  args: Parameters<CollectionAfterChangeHook>[0],
) => D | Promise<D> | undefined

export interface AlgoliaSearchConfig<D extends SearchAttributes = UnknownSearchAttributes> {
  algolia: {
    appId: string
    apiKey: string
    index: string
    options?: AlgoliaClientOptions
  }
  waitForHook?: boolean
  collections?: string[]
  generateSearchAttributes?: GenerateSearchAttributes<D>
}
