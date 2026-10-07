import {
  Repository,
  ILocalRepositoryState,
  nameOf,
  isRepositoryWithGitHubRepository,
  RepositoryWithGitHubRepository,
} from '../../models/repository'
import { CloningRepository } from '../../models/cloning-repository'
import { getHTMLURL } from '../../lib/api'
import { caseInsensitiveCompare, compare } from '../../lib/compare'
import { IFilterListGroup, IFilterListItem } from '../lib/filter-list'
import { IAheadBehind } from '../../models/branch'
import { assertNever } from '../../lib/fatal-error'
import { isDotCom } from '../../lib/endpoint-capabilities'
import { Owner } from '../../models/owner'
import {
  defaultRepositoryGroupsState,
  getCustomGroupIdForPath,
  getCustomGroupKey,
  IRepositoryGroupsState,
  sortGroupKeys,
} from '../../lib/repository-groups'

export type RepositoryListGroup =
  | {
      kind: 'recent' | 'other'
    }
  | {
      kind: 'dotcom'
      owner: Owner
    }
  | {
      kind: 'enterprise'
      host: string
    }
  | {
      /** A group created by the user */
      kind: 'custom'
      id: string
      name: string
    }

/**
 * Returns a unique, stable key (string) for a repository group. It's used to
 * remember the user's order and collapsed groups.
 */
export const getGroupKey = (group: RepositoryListGroup) => {
  const { kind } = group
  switch (kind) {
    case 'recent':
      return 'recent'
    case 'custom':
      return getCustomGroupKey(group.id)
    case 'dotcom':
      return `dotcom:${group.owner.login}`
    case 'enterprise':
      return `enterprise:${group.host}`
    case 'other':
      return 'other'
    default:
      assertNever(group, `Unknown repository group kind ${kind}`)
  }
}

/**
 * Returns a case sensitive sorting key for a repository group, defining the
 * default order of the groups in the repository list.
 */
const getDefaultSortKey = (group: RepositoryListGroup) => {
  const { kind } = group
  switch (kind) {
    case 'recent':
      return `0:recent`
    case 'custom':
      return `1:custom:${group.name.toLowerCase()}`
    case 'dotcom':
      return `2:dotcom:${group.owner.login}`
    case 'enterprise':
      return `3:enterprise:${group.host}`
    case 'other':
      return `4:other`
    default:
      assertNever(group, `Unknown repository group kind ${kind}`)
  }
}
export type Repositoryish = Repository | CloningRepository

export interface IRepositoryListItem extends IFilterListItem {
  readonly text: ReadonlyArray<string>
  readonly id: string
  readonly repository: Repositoryish
  readonly needsDisambiguation: boolean
  readonly aheadBehind: IAheadBehind | null
  readonly changedFilesCount: number
}

const recentRepositoriesThreshold = 7

const getHostForRepository = (repo: RepositoryWithGitHubRepository) =>
  new URL(getHTMLURL(repo.gitHubRepository.endpoint)).host

const getGroupForRepository = (
  repo: Repositoryish,
  groupsState: IRepositoryGroupsState
): RepositoryListGroup => {
  const customGroupId = getCustomGroupIdForPath(groupsState, repo.path)
  const customGroup = groupsState.customGroups.find(g => g.id === customGroupId)
  if (customGroup !== undefined) {
    return { kind: 'custom', id: customGroup.id, name: customGroup.name }
  }

  if (repo instanceof Repository && isRepositoryWithGitHubRepository(repo)) {
    return isDotCom(repo.gitHubRepository.endpoint)
      ? { kind: 'dotcom', owner: repo.gitHubRepository.owner }
      : { kind: 'enterprise', host: getHostForRepository(repo) }
  }
  return { kind: 'other' }
}

type RepoGroupItem = { group: RepositoryListGroup; repos: Repositoryish[] }

export function groupRepositories(
  repositories: ReadonlyArray<Repositoryish>,
  localRepositoryStateLookup: ReadonlyMap<number, ILocalRepositoryState>,
  recentRepositories: ReadonlyArray<number>,
  groupsState: IRepositoryGroupsState = defaultRepositoryGroupsState
): ReadonlyArray<IFilterListGroup<IRepositoryListItem, RepositoryListGroup>> {
  const includeRecentGroup = repositories.length > recentRepositoriesThreshold
  const recentSet = includeRecentGroup ? new Set(recentRepositories) : undefined
  const groups = new Map<string, RepoGroupItem>()

  const addToGroup = (group: RepositoryListGroup, repo: Repositoryish) => {
    const key = getGroupKey(group)
    let rg = groups.get(key)
    if (!rg) {
      rg = { group, repos: [] }
      groups.set(key, rg)
    }

    rg.repos.push(repo)
  }

  for (const repo of repositories) {
    if (recentSet?.has(repo.id) && repo instanceof Repository) {
      addToGroup({ kind: 'recent' }, repo)
    }

    addToGroup(getGroupForRepository(repo, groupsState), repo)
  }

  // Every group created by the user is shown, even when it's still empty, so
  // that repositories can be moved into it.
  for (const { id, name } of groupsState.customGroups) {
    const group: RepositoryListGroup = { kind: 'custom', id, name }
    if (!groups.has(getGroupKey(group))) {
      groups.set(getGroupKey(group), { group, repos: [] })
    }
  }

  const defaultOrder = Array.from(groups.values())
    .sort((x, y) =>
      compare(getDefaultSortKey(x.group), getDefaultSortKey(y.group))
    )
    .map(({ group }) => getGroupKey(group))

  return sortGroupKeys(defaultOrder, groupsState.order)
    .map(key => groups.get(key)!)
    .map(({ group, repos }) => ({
      identifier: group,
      collapsed: groupsState.collapsed.includes(getGroupKey(group)),
      showWhenEmpty: group.kind === 'custom',
      items: toSortedListItems(
        group,
        repos,
        localRepositoryStateLookup,
        groups
      ),
    }))
}

// Returns the display title for a repository, which is either the alias
// (if available) or the name.
const getDisplayTitle = (r: Repositoryish) =>
  r instanceof Repository && r.alias != null ? r.alias : r.name

const toSortedListItems = (
  group: RepositoryListGroup,
  repositories: ReadonlyArray<Repositoryish>,
  localRepositoryStateLookup: ReadonlyMap<number, ILocalRepositoryState>,
  groups: Map<string, RepoGroupItem>
): IRepositoryListItem[] => {
  const groupNames = new Map<string, number>()
  const allNames = new Map<string, number>()

  for (const groupItem of groups.values()) {
    // All items in the recent group are by definition present in another
    // group and therefore we don't want to count them.
    if (groupItem.group.kind === 'recent') {
      continue
    }

    for (const title of groupItem.repos.map(getDisplayTitle)) {
      allNames.set(title, (allNames.get(title) ?? 0) + 1)
      if (groupItem.group === group) {
        groupNames.set(title, (groupNames.get(title) ?? 0) + 1)
      }
    }
  }

  return repositories
    .map(r => {
      const repoState = localRepositoryStateLookup.get(r.id)
      const title = getDisplayTitle(r)

      return {
        text: r instanceof Repository ? [title, nameOf(r)] : [title],
        id: r.id.toString(),
        repository: r,
        needsDisambiguation:
          // If the repository is in the enterprise or a custom group and has a
          // duplicate name in the group, we need to disambiguate it. We don't
          // have to disambiguate repositories in the 'dotcom' group because
          // they are already grouped by owner. If the repository is in the
          // 'recent' group and has a duplicate name in any group, we need to
          // disambiguate it.
          ((groupNames.get(title) ?? 0) > 1 &&
            (group.kind === 'enterprise' || group.kind === 'custom')) ||
          ((allNames.get(title) ?? 0) > 1 && group.kind === 'recent'),
        aheadBehind: repoState?.aheadBehind ?? null,
        changedFilesCount: repoState?.changedFilesCount ?? 0,
      }
    })
    .sort(({ repository: x }, { repository: y }) =>
      caseInsensitiveCompare(getDisplayTitle(x), getDisplayTitle(y))
    )
}
