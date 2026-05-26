import type { CollectionConfig } from 'payload'

import Examples from './Examples.js'

const VersionedExamples: CollectionConfig = {
  ...Examples,
  slug: 'versioned_examples',
  versions: {
    drafts: true,
  },
}

export default VersionedExamples
