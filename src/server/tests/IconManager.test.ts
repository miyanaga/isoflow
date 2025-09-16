import { IconManager } from '../managers/IconManager'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('IconManager', () => {
  let tempDir: string
  let manager: IconManager

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'icon-test-'))
    manager = new IconManager(tempDir)
    await manager.initialize()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  const sampleSvg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'

  test('should save and check if icon exists', async () => {
    expect(await manager.exists('test-icon')).toBe(false)

    await manager.save('test-icon', sampleSvg)
    expect(await manager.exists('test-icon')).toBe(true)
  })

  test('should delete an icon', async () => {
    await manager.save('to-delete', sampleSvg)
    expect(await manager.exists('to-delete')).toBe(true)

    await manager.delete('to-delete')
    expect(await manager.exists('to-delete')).toBe(false)
  })

  test('should list icons sorted by update time', async () => {
    await manager.save('icon1', sampleSvg)
    await new Promise(resolve => setTimeout(resolve, 10))
    await manager.save('icon2', sampleSvg)
    await new Promise(resolve => setTimeout(resolve, 10))
    await manager.save('icon3', sampleSvg)

    const list = await manager.index()
    expect(list).toHaveLength(3)
    expect(list[0].name).toBe('icon3')
    expect(list[1].name).toBe('icon2')
    expect(list[2].name).toBe('icon1')
  })

  test('should filter icons by query', async () => {
    await manager.save('home-icon', sampleSvg)
    await manager.save('user-icon', sampleSvg)
    await manager.save('home-filled', sampleSvg)

    const filtered = await manager.index('home')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(icon => icon.name.includes('home'))).toBe(true)
  })

  test('should sync all icons with content', async () => {
    const svg1 = '<svg id="1"></svg>'
    const svg2 = '<svg id="2"></svg>'
    const svg3 = '<svg id="3"></svg>'

    await manager.save('icon1', svg1)
    await new Promise(resolve => setTimeout(resolve, 10))
    await manager.save('icon2', svg2)
    await new Promise(resolve => setTimeout(resolve, 10))
    await manager.save('icon3', svg3)

    const synced = await manager.sync()
    expect(synced).toHaveLength(3)

    expect(synced[0].name).toBe('icon3')
    expect(synced[0].svg).toBe(svg3)

    expect(synced[1].name).toBe('icon2')
    expect(synced[1].svg).toBe(svg2)

    expect(synced[2].name).toBe('icon1')
    expect(synced[2].svg).toBe(svg1)

    synced.forEach(icon => {
      expect(icon.updatedAt).toBeTruthy()
      expect(icon.updatedAt.getTime).toBeDefined()
    })
  })

  test('should limit index results to 100 icons', async () => {
    const promises = []
    for (let i = 0; i < 150; i++) {
      promises.push(manager.save(`icon${i}`, `<svg id="${i}"></svg>`))
    }
    await Promise.all(promises)

    const list = await manager.index()
    expect(list).toHaveLength(100)
  })

  test('should sanitize file names', async () => {
    await manager.save('icon/with/slashes', sampleSvg)

    expect(await manager.exists('icon/with/slashes')).toBe(true)

    const list = await manager.index()
    expect(list[0].name).toBe('icon_with_slashes')
  })
})