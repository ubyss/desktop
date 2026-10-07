import { normalizeRepositoryPath } from './watched-repository-folders'

/** The local storage key for the user's repository list customizations */
const RepositoryGroupsKey = 'repository-groups'

/** A group created by the user to organize the repository list */
export interface ICustomRepositoryGroup {
  readonly id: string
  readonly name: string
}

/** The user's customizations of the groups in the repository list */
export interface IRepositoryGroupsState {
  /** Groups created by the user */
  readonly customGroups: ReadonlyArray<ICustomRepositoryGroup>

  /** Custom group id for each repository, keyed by normalized path */
  readonly assignments: Readonly<Record<string, string>>

  /**
   * Group keys in the order chosen by the user. Groups missing from this list
   * are shown after the ordered ones, in their default order.
   */
  readonly order: ReadonlyArray<string>

  /** Keys of the groups the user has collapsed */
  readonly collapsed: ReadonlyArray<string>
}

export const defaultRepositoryGroupsState: IRepositoryGroupsState = {
  customGroups: [],
  assignments: {},
  order: [],
  collapsed: [],
}

const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every(v => typeof v === 'string')

/** Load the repository list customizations from local storage */
export function loadRepositoryGroupsState(): IRepositoryGroupsState {
  try {
    const raw = localStorage.getItem(RepositoryGroupsKey)
    if (raw === null) {
      return defaultRepositoryGroupsState
    }

    const parsed = JSON.parse(raw)
    const customGroups = Array.isArray(parsed.customGroups)
      ? parsed.customGroups.filter(
          (g: unknown): g is ICustomRepositoryGroup =>
            typeof g === 'object' &&
            g !== null &&
            typeof (g as ICustomRepositoryGroup).id === 'string' &&
            typeof (g as ICustomRepositoryGroup).name === 'string'
        )
      : []

    const assignments: Record<string, string> = {}
    if (typeof parsed.assignments === 'object' && parsed.assignments !== null) {
      for (const [path, id] of Object.entries(parsed.assignments)) {
        if (typeof id === 'string') {
          assignments[path] = id
        }
      }
    }

    return {
      customGroups,
      assignments,
      order: isStringArray(parsed.order) ? parsed.order : [],
      collapsed: isStringArray(parsed.collapsed) ? parsed.collapsed : [],
    }
  } catch (e) {
    log.warn('Could not load the repository groups', e)
    return defaultRepositoryGroupsState
  }
}

/** Save the repository list customizations to local storage */
export function saveRepositoryGroupsState(state: IRepositoryGroupsState) {
  localStorage.setItem(RepositoryGroupsKey, JSON.stringify(state))
}

/** The group key used for a custom group */
export const getCustomGroupKey = (id: string) => `custom:${id}`

/** The id of the custom group the repository at `path` belongs to, if any */
export function getCustomGroupIdForPath(
  state: IRepositoryGroupsState,
  path: string
): string | null {
  const id = state.assignments[normalizeRepositoryPath(path)]
  return id !== undefined && state.customGroups.some(g => g.id === id)
    ? id
    : null
}

/** Create a custom group, optionally moving a repository into it */
export function createCustomGroup(
  state: IRepositoryGroupsState,
  name: string,
  repositoryPath?: string,
  id: string = crypto.randomUUID()
): IRepositoryGroupsState {
  const withGroup = {
    ...state,
    customGroups: [...state.customGroups, { id, name: name.trim() }],
  }

  return repositoryPath === undefined
    ? withGroup
    : assignRepositoryToGroup(withGroup, repositoryPath, id)
}

/** Rename a custom group */
export function renameCustomGroup(
  state: IRepositoryGroupsState,
  id: string,
  name: string
): IRepositoryGroupsState {
  return {
    ...state,
    customGroups: state.customGroups.map(g =>
      g.id === id ? { ...g, name: name.trim() } : g
    ),
  }
}

/**
 * Delete a custom group. Its repositories go back to their default groups.
 */
export function deleteCustomGroup(
  state: IRepositoryGroupsState,
  id: string
): IRepositoryGroupsState {
  const key = getCustomGroupKey(id)
  const assignments = Object.fromEntries(
    Object.entries(state.assignments).filter(([, groupId]) => groupId !== id)
  )

  return {
    customGroups: state.customGroups.filter(g => g.id !== id),
    assignments,
    order: state.order.filter(k => k !== key),
    collapsed: state.collapsed.filter(k => k !== key),
  }
}

/**
 * Move the repository at `path` into a custom group, or back to its default
 * group when `groupId` is null.
 */
export function assignRepositoryToGroup(
  state: IRepositoryGroupsState,
  path: string,
  groupId: string | null
): IRepositoryGroupsState {
  const assignments = { ...state.assignments }
  const normalizedPath = normalizeRepositoryPath(path)

  if (groupId === null) {
    delete assignments[normalizedPath]
  } else {
    assignments[normalizedPath] = groupId
  }

  return { ...state, assignments }
}

/** Collapse an expanded group, or expand a collapsed one */
export function toggleGroupCollapsed(
  state: IRepositoryGroupsState,
  key: string
): IRepositoryGroupsState {
  const collapsed = state.collapsed.includes(key)
    ? state.collapsed.filter(k => k !== key)
    : [...state.collapsed, key]

  return { ...state, collapsed }
}

/**
 * Move a group one position up or down.
 *
 * @param visibleKeys the keys of the groups in the order they are displayed
 */
export function moveGroup(
  state: IRepositoryGroupsState,
  visibleKeys: ReadonlyArray<string>,
  key: string,
  direction: 'up' | 'down'
): IRepositoryGroupsState {
  const order = [...visibleKeys]
  const index = order.indexOf(key)
  const target = direction === 'up' ? index - 1 : index + 1

  if (index === -1 || target < 0 || target >= order.length) {
    return state
  }

  order[index] = order[target]
  order[target] = key

  // Keep the position of groups that are currently hidden (e.g. a "Recent"
  // group that only shows up once there are enough repositories).
  const hidden = state.order.filter(k => !visibleKeys.includes(k))
  return { ...state, order: [...order, ...hidden] }
}

/**
 * Sort groups by the user's order; groups the user hasn't ordered keep their
 * default order after the ordered ones.
 */
export function sortGroupKeys(
  defaultOrder: ReadonlyArray<string>,
  userOrder: ReadonlyArray<string>
): ReadonlyArray<string> {
  const rank = (key: string) => {
    const index = userOrder.indexOf(key)
    return index === -1 ? userOrder.length + defaultOrder.indexOf(key) : index
  }

  return [...defaultOrder].sort((x, y) => rank(x) - rank(y))
}
