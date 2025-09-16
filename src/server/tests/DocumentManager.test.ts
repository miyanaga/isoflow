import { DocumentManager } from '../managers/DocumentManager'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('DocumentManager', () => {
  let tempDir: string
  let manager: DocumentManager

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-test-'))
    manager = new DocumentManager(tempDir)
    await manager.initialize()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test('should save and load a document', async () => {
    const doc = { title: 'Test', content: 'Hello World' }
    await manager.save('test-doc', doc)

    const loaded = await manager.load('test-doc')
    expect(loaded).toEqual(doc)
  })

  test('should check if document exists', async () => {
    expect(await manager.exists('non-existent')).toBe(false)

    await manager.save('existing-doc', { data: 'test' })
    expect(await manager.exists('existing-doc')).toBe(true)
  })

  test('should delete a document', async () => {
    await manager.save('to-delete', { data: 'test' })
    expect(await manager.exists('to-delete')).toBe(true)

    await manager.delete('to-delete')
    expect(await manager.exists('to-delete')).toBe(false)
  })

  test('should list documents sorted by update time', async () => {
    await manager.save('doc1', { data: 'first' })
    await new Promise(resolve => setTimeout(resolve, 10))
    await manager.save('doc2', { data: 'second' })
    await new Promise(resolve => setTimeout(resolve, 10))
    await manager.save('doc3', { data: 'third' })

    const list = await manager.index()
    expect(list).toHaveLength(3)
    expect(list[0].name).toBe('doc3')
    expect(list[1].name).toBe('doc2')
    expect(list[2].name).toBe('doc1')
  })

  test('should filter documents by query', async () => {
    await manager.save('apple-doc', { data: 'apple' })
    await manager.save('banana-doc', { data: 'banana' })
    await manager.save('apple-pie', { data: 'pie' })

    const filtered = await manager.index('apple')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(doc => doc.name.includes('apple'))).toBe(true)
  })

  test('should limit results to 100 documents', async () => {
    const promises = []
    for (let i = 0; i < 150; i++) {
      promises.push(manager.save(`doc${i}`, { index: i }))
    }
    await Promise.all(promises)

    const list = await manager.index()
    expect(list).toHaveLength(100)
  })

  test('should sanitize file names', async () => {
    const doc = { data: 'test' }
    await manager.save('doc/with/slashes', doc)

    const loaded = await manager.load('doc/with/slashes')
    expect(loaded).toEqual(doc)

    const list = await manager.index()
    expect(list[0].name).toBe('doc_with_slashes')
  })
})