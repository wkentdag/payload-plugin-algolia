import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AlgoliaSearchPlugin } from '../src/index.js'
import Examples from './collections/Examples.js'
import Users from './collections/Users.js'
import VersionedExamples from './collections/VersionedExamples.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

export interface SearchRecord {
  title: string
  text: string
  collection: string
  custom: 'attribute'
}

const buildConfigWithMemoryDB = async () => {
  // Use DATABASE_URI from dev/.env when set (same as pnpm dev). In-memory repl set is a
  // fallback for CI/local runs without Mongo; count: 1 is enough for Payload drafts/transactions.
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URI) {
    const memoryDB = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        dbName: 'payloadmemory',
      },
    })

    process.env.DATABASE_URI = `${memoryDB.getUri()}&retryWrites=true`
  }

  return buildConfig({
    admin: {
      importMap: {
        baseDir: path.resolve(dirname),
      },
      user: Users.slug,
    },
    collections: [Examples, VersionedExamples, Users],
    db: mongooseAdapter({
      ensureIndexes: true,
      url: process.env.DATABASE_URI || '',
    }),
    editor: lexicalEditor(),
    plugins: [
      AlgoliaSearchPlugin({
        algolia: {
          appId: process.env.ALGOLIA_APPLICATION_ID || '',
          apiKey: process.env.ALGOLIA_ADMIN_API_KEY || '',
          index: process.env.ALGOLIA_INDEX || '',
        },
        collections: ['examples', 'versioned_examples'],
        waitForHook: true,
        generateSearchAttributes: ({ doc, collection }): SearchRecord => {
          const { title, text } = doc as { title: string; text: string }
          return {
            title,
            text,
            collection: collection.slug,
            custom: 'attribute',
          }
        },
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigWithMemoryDB()
