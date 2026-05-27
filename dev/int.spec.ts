import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import createClient from '../src/algolia.js'
import type { SearchRecord } from './payload.config.js'

const waitFor = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

const pollIntervalMs = 200

let payload: Payload
let algolia: ReturnType<typeof createClient>

/** Poll until the Algolia record exists. */
const getRecord = async (objectID: string, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      return await algolia.client.getObject<SearchRecord>({
        indexName: algolia.indexName,
        objectID,
      })
    } catch (error: unknown) {
      lastError = error
      const err = error as { status?: number }
      if (err.status === 404) {
        await waitFor(pollIntervalMs)
        continue
      }
      throw error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error(`timed out waiting for Algolia record ${objectID}`)
}

/** Poll until the Algolia record is gone (404). Fails immediately if the record exists. */
const expectNoRecord = async (objectID: string, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      await algolia.client.getObject({ indexName: algolia.indexName, objectID })
      expect.fail('expected Algolia record to be missing')
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string }
      if (err.status === 404) {
        return
      }
      throw error
    }
  }

  throw new Error(`timed out waiting for Algolia record ${objectID} to be absent`)
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
  if (payload) {
    await payload.destroy()
  }
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

    await expectNoRecord(`versioned_examples:${doc.id}`)
  })

  test('retains published index on draft update', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      draft: false,
      data: {
        title: 'first draft',
        text: 'lorem ipsum',
        _status: 'published',
      },
    })

    expect(typeof doc.id).toBe('string')
    expect(doc._status).toBe('published')

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

    await expectNoRecord(`versioned_examples:${doc.id}`)

    const updatedDoc = await payload.update({
      collection: 'versioned_examples',
      id: doc.id,
      draft: false,
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
