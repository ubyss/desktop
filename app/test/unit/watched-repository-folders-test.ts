import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import * as Path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { createTempDirectory } from '../helpers/temp'
import {
  findRepositoriesInFolder,
  getIgnoredRepositoryPaths,
  getRepositoryPathsToAdd,
  getWatchedRepositoryFolders,
  ignoreRepositoryPath,
  isPathInsideFolder,
  setWatchedRepositoryFolders,
  unignoreRepositoryPath,
} from '../../src/lib/watched-repository-folders'

describe('watched repository folders', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores folders without duplicates', () => {
    const folder = Path.resolve('repos')
    setWatchedRepositoryFolders([folder, folder + Path.sep, folder])
    assert.deepStrictEqual(getWatchedRepositoryFolders(), [folder])
  })

  it('ignores and unignores repository paths', () => {
    const repo = Path.resolve('repos', 'a')
    ignoreRepositoryPath(repo)
    ignoreRepositoryPath(repo)
    assert.deepStrictEqual(getIgnoredRepositoryPaths(), [repo])

    unignoreRepositoryPath(repo)
    assert.deepStrictEqual(getIgnoredRepositoryPaths(), [])
  })

  it('detects paths inside a folder', () => {
    const folder = Path.resolve('repos')
    assert.strictEqual(isPathInsideFolder(Path.join(folder, 'a'), folder), true)
    assert.strictEqual(isPathInsideFolder(folder + '-other', folder), false)
    assert.strictEqual(isPathInsideFolder(folder, folder), false)
  })

  it('skips existing and ignored repositories', () => {
    const a = Path.resolve('repos', 'a')
    const b = Path.resolve('repos', 'b')
    const c = Path.resolve('repos', 'c')

    assert.deepStrictEqual(
      getRepositoryPathsToAdd([a, b, c], [a + Path.sep], [c]),
      [b]
    )
  })

  it('finds immediate subfolders containing .git', async t => {
    const root = await createTempDirectory(t)

    await mkdir(Path.join(root, 'repo-dir', '.git'), { recursive: true })
    await mkdir(Path.join(root, 'worktree'), { recursive: true })
    await writeFile(Path.join(root, 'worktree', '.git'), 'gitdir: elsewhere')
    await mkdir(Path.join(root, 'not-a-repo'), { recursive: true })
    await mkdir(Path.join(root, 'nested', 'deep', '.git'), { recursive: true })
    await mkdir(Path.join(root, '.hidden', '.git'), { recursive: true })
    await writeFile(Path.join(root, 'file.txt'), '')

    const found = await findRepositoriesInFolder(root)
    assert.deepStrictEqual([...found].map(p => Path.basename(p)).sort(), [
      'repo-dir',
      'worktree',
    ])
  })
})
