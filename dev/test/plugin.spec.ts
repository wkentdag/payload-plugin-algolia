import { SearchIndex } from 'algoliasearch'
import { type Payload } from 'payload'
import { SearchRecord } from '../src/payload.config'

const wait = () => new Promise(resolve => setTimeout(resolve, 2000))

describe('Plugin tests', () => {
  const payload = globalThis.payloadClient as Payload
  const algolia = globalThis.algoliaClient as SearchIndex

  it('indexes documents', async () => {
    const doc1 = await payload.create({
      collection: 'examples',
      data: {
        title: 'hello',
        text: 'world',
      },
    })

    expect(typeof doc1.id).toBe('string')

    // await wait()

    const record = await algolia.getObject(`examples:${doc1.id}`)
    expect(record).toHaveProperty('title')
  })

  it('ignores drafts', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      draft: true,
      data: {
        title: 'hello',
        text: 'world',
      },
    })

    expect(typeof doc.id).toBe('string')
    // await wait()

    try {
      await algolia.getObject(`versioned_examples:${doc.id}`)
    } catch (error) {
      expect(error?.message).toEqual('ObjectID does not exist')
      expect(error?.status).toEqual(404)
    }
  })

  it('retains published index on draft update', async () => {
    const doc = await payload.create({
      collection: 'versioned_examples',
      data: {
        title: 'first draft',
        text: 'lorem ipsum',
        _status: 'published',
      },
    })

    expect(typeof doc.id).toBe('string')

    const initialRecord = await algolia.getObject<SearchRecord>(`versioned_examples:${doc.id}`)
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

    const record = await algolia.getObject<SearchRecord>(`versioned_examples:${doc.id}`)
    expect(record.title).toEqual('first draft')
  })

  it('publishes on update', async () => {
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
      await algolia.getObject(`versioned_examples:${doc.id}`)
    } catch (error) {
      expect(error?.message).toEqual('ObjectID does not exist')
      expect(error?.status).toEqual(404)
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
    const record = await algolia.getObject<SearchRecord>(`versioned_examples:${doc.id}`)
    expect(record.title).toBe('updated')
  })

  it('accepts custom `getSearchAttributes`', async () => {
    const doc = await payload.create({
      collection: 'examples',
      data: {
        title: 'test',
        text: 'doc',
      },
    })

    const record = await algolia.getObject<SearchRecord>(`examples:${doc.id}`)
    expect(record.custom).toBe('attribute')
  })
})
