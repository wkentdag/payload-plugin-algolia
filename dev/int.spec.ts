import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import createClient from '../src/algolia.js'
import type { SearchRecord } from './payload.config.js'

const waitFor = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

let payload: Payload
let algolia: ReturnType<typeof createClient>

const getRecord = async (id: string, wait = 0) => {
  if (wait) {
    await waitFor(wait)
  }

  return algolia.client.getObject<SearchRecord>({ indexName: algolia.indexName, objectID: id })
}

beforeAll(async () => {
  payload = await getPayload({ config })
  algolia = createClient({
    appId: process.env.ALGOLIA_APPLICATION_ID!,
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY!,
    index: process.env.ALGOLIA_INDEX!,
  })
})

afterAll(async () => {
  await payload.destroy()
})

describe('AlgoliaSearchPlugin', () => {
  test('indexes documents', async () => {
    const doc1 = await payload.create({
      collection: 'examples',
      data: {
        title: 'hello',
        text: 'world',
      },
    })

    expect(typeof doc1.id).toBe('string')

    const record = await getRecord(`examples:${doc1.id}`)
    expect(record).toHaveProperty('title')
  })

  test('ignores drafts', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      draft: true,
      data: {
        title: 'hello',
        text: 'world',
      },
    })

    expect(typeof doc.id).toBe('string')

    try {
      await getRecord(`versioned_examples:${doc.id}`)
      expect.fail('expected Algolia record to be missing')
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      expect(err.message).toEqual('ObjectID does not exist')
      expect(err.status).toEqual(404)
    }
  })

  test('retains published index on draft update', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      data: {
        title: 'first draft',
        text: 'lorem ipsum',
        _status: 'published',
      },
    })

    expect(typeof doc.id).toBe('string')

    const initialRecord = await getRecord(`versioned_examples:${doc.id}`)
    expect(initialRecord.title).toEqual('first draft')

    const draftUpdate = await payload.update({
      collection: 'versioned_examples',
      id: doc.id,
      draft: true,
      data: {
        title: 'second draft',
      },
    })

    expect(draftUpdate.id).toEqual(doc.id)

    const record = await getRecord(`versioned_examples:${doc.id}`)
    expect(record.title).toEqual('first draft')
  }, 10_000)

  test('indexes drafts on publish', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      draft: true,
      data: {
        title: 'first draft',
        text: 'content',
      },
    })

    expect(doc._status).toBe('draft')

    try {
      await getRecord(`versioned_examples:${doc.id}`)
      expect.fail('expected Algolia record to be missing')
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      expect(err.message).toEqual('ObjectID does not exist')
      expect(err.status).toEqual(404)
    }

    const updatedDoc = await payload.update({
      collection: 'versioned_examples',
      id: doc.id,
      data: {
        title: 'updated',
        _status: 'published',
      },
    })

    expect(updatedDoc._status).toBe('published')
    const record = await getRecord(`versioned_examples:${doc.id}`)
    expect(record.title).toBe('updated')
  }, 10_000)

  test('accepts custom generateSearchAttributes', async () => {
    const doc = await payload.create({
      collection: 'examples',
      data: {
        title: 'test',
        text: 'doc',
      },
    })

    const record = await getRecord(`examples:${doc.id}`)
    expect(record.custom).toBe('attribute')
  })
})
