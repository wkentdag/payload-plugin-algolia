import type { CollectionConfig } from 'payload'

const Examples: CollectionConfig = {
  slug: 'examples',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'text',
      type: 'textarea',
    },
  ],
}

export default Examples
