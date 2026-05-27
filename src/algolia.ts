import { algoliasearch } from 'algoliasearch'

import type { AlgoliaSearchConfig } from './types.js'

export default function createClient({
  appId,
  apiKey,
  options,
  index,
}: AlgoliaSearchConfig['algolia']) {
  if (!appId || !apiKey || !index) {
    throw new Error(`[payload-plugin-algolia] missing required Algolia creds`)
  }
  const client = algoliasearch(appId, apiKey, options)
  return { client, indexName: index }
}
