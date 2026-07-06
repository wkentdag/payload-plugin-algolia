import { algoliasearch } from 'algoliasearch'

import type { AlgoliaSearchConfig } from './types.js'

export default function createClient({
  apiKey,
  appId,
  index,
  options,
}: AlgoliaSearchConfig['algolia']) {
  if (!appId || !apiKey || !index) {
    const missing = [!appId && 'appId', !apiKey && 'apiKey', !index && 'index'].filter(Boolean)

    throw new Error(
      `[payload-plugin-algolia] missing required Algolia config: ${missing.join(', ')}`,
    )
  }
  const client = algoliasearch(appId, apiKey, options)
  return { client, indexName: index }
}
