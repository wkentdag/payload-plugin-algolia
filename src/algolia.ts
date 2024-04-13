import algoliasearch from 'algoliasearch'

import { AlgoliaSearchConfig } from './types'

export default function createClient({
  app_id,
  api_key,
  index,
}: Pick<AlgoliaSearchConfig, 'api_key' | 'app_id' | 'index'>) {
  if (!app_id || !api_key || !index) {
    throw new Error(`[payload-plugin-algolia] missing required Algolia creds`)
  }
  const client = algoliasearch(app_id, api_key)
  const searchIndex = client.initIndex(index)
  return searchIndex
}
