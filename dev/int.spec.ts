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

/** Object IDs we may have indexed — deleted in afterAll. */
const createdObjectIDs: string[] = []

const objectID = (collection: string, id: number | string) => {
  const oid = `${collection}:${id}`
  createdObjectIDs.push(oid)
  return oid
}

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

/** Poll until the Algolia record is gone (404). */
const expectNoRecord = async (objectID: string, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      await algolia.client.getObject({ indexName: algolia.indexName, objectID })
      await waitFor(pollIntervalMs)
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
  if (algolia && createdObjectIDs.length > 0) {
    const objectIDs = [...new Set(createdObjectIDs)]
    await algolia.client.deleteObjects({ indexName: algolia.indexName, objectIDs })
  }

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

    const record = await getRecord(objectID('examples', doc1.id))
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

    await expectNoRecord(objectID('versioned_examples', doc.id))
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

    const id = objectID('versioned_examples', doc.id)

    const initialRecord = await getRecord(id)
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

    const record = await getRecord(id)
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

    const id = objectID('versioned_examples', doc.id)

    await expectNoRecord(id)

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
    const record = await getRecord(id)
    expect(record.title).toBe('updated')
  }, 10_000)

  test('removes documents from search on unpublish', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      draft: false,
      data: {
        title: 'published article',
        text: 'content',
        _status: 'published',
      },
    })

    expect(doc._status).toBe('published')

    const id = objectID('versioned_examples', doc.id)

    const record = await getRecord(id)
    expect(record.title).toBe('published article')

    const unpublishedDoc = await payload.update({
      collection: 'versioned_examples',
      id: doc.id,
      draft: false,
      data: {
        _status: 'draft',
        title: 'unpublished article',
      },
    })

    expect(unpublishedDoc._status).toBe('draft')
    expect(unpublishedDoc.title).toBe('unpublished article')
    await expectNoRecord(id)
  }, 10_000)

  test('accepts custom generateSearchAttributes', async () => {
    const doc = await payload.create({
      collection: 'examples',
      data: {
        title: 'test',
        text: 'doc',
      },
    })

    const record = await getRecord(objectID('examples', doc.id))
    expect(record.custom).toBe('attribute')
  })
})
