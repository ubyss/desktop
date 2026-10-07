import * as Path from 'path'
import { readdir, stat } from 'fs/promises'
import { getStringArray, setStringArray } from './local-storage'

/** The local storage key for the folders scanned for repositories */
const WatchedFoldersKey = 'watched-repository-folders'

/**
 * The local storage key for repositories inside watched folders which the user
 * removed from the app, and which therefore shouldn't be added back.
 */
const IgnoredPathsKey = 'watched-repository-folders-ignored-paths'

/** Get the folders whose repositories are added to the app automatically */
export function getWatchedRepositoryFolders(): ReadonlyArray<string> {
  return getStringArray(WatchedFoldersKey)
}

/** Store the folders whose repositories are added to the app automatically */
export function setWatchedRepositoryFolders(folders: ReadonlyArray<string>) {
  const seen = new Set<string>()
  const unique = folders.filter(f => {
    const normalized = normalizeRepositoryPath(f)
    if (seen.has(normalized)) {
      return false
    }
    seen.add(normalized)
    return true
  })

  setStringArray(WatchedFoldersKey, unique)
}

/** Get the repository paths which shouldn't be added automatically */
export function getIgnoredRepositoryPaths(): ReadonlyArray<string> {
  return getStringArray(IgnoredPathsKey)
}

/** Prevent the repository at the given path from being added automatically */
export function ignoreRepositoryPath(path: string) {
  const normalized = normalizeRepositoryPath(path)
  const ignored = getIgnoredRepositoryPaths()

  if (!ignored.some(p => normalizeRepositoryPath(p) === normalized)) {
    setStringArray(IgnoredPathsKey, [...ignored, path])
  }
}

/** Allow the repository at the given path to be added automatically again */
export function unignoreRepositoryPath(path: string) {
  const normalized = normalizeRepositoryPath(path)
  const ignored = getIgnoredRepositoryPaths()
  const updated = ignored.filter(p => normalizeRepositoryPath(p) !== normalized)

  if (updated.length !== ignored.length) {
    setStringArray(IgnoredPathsKey, updated)
  }
}

/**
 * Normalize a path so that it can be compared with others: resolved, without
 * trailing separators and, on case-insensitive platforms, lower-cased.
 */
export function normalizeRepositoryPath(path: string): string {
  const resolved = Path.resolve(path).replace(/[\\/]+$/, '')
  return __WIN32__ || __DARWIN__ ? resolved.toLowerCase() : resolved
}

/** Whether `path` is located (at any depth) inside `folder` */
export function isPathInsideFolder(path: string, folder: string): boolean {
  const normalizedPath = normalizeRepositoryPath(path)
  const normalizedFolder = normalizeRepositoryPath(folder)
  return normalizedPath.startsWith(normalizedFolder + Path.sep)
}

/**
 * Find the immediate subfolders of `folder` which look like Git repositories,
 * i.e. which contain a `.git` directory (or a `.git` file, for worktrees and
 * submodules).
 */
export async function findRepositoriesInFolder(
  folder: string
): Promise<ReadonlyArray<string>> {
  const entries = await readdir(folder, { withFileTypes: true })
  const candidates = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => Path.join(folder, e.name))

  const repositories = await Promise.all(
    candidates.map(async candidate => {
      const hasGit = await stat(Path.join(candidate, '.git')).then(
        () => true,
        () => false
      )
      return hasGit ? candidate : null
    })
  )

  return repositories.filter((r): r is string => r !== null)
}

/**
 * Select which of the candidate repository paths should be added to the app:
 * those not already in the app and not ignored by the user.
 */
export function getRepositoryPathsToAdd(
  candidates: ReadonlyArray<string>,
  existingPaths: ReadonlyArray<string>,
  ignoredPaths: ReadonlyArray<string>
): ReadonlyArray<string> {
  const skip = new Set(
    [...existingPaths, ...ignoredPaths].map(normalizeRepositoryPath)
  )

  return candidates.filter(c => !skip.has(normalizeRepositoryPath(c)))
}
