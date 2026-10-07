import { describe, it } from 'node:test'
import assert from 'node:assert'
import * as Path from 'path'
import { groupRepositories } from '../../src/ui/repositories-list/group-repositories'
import { Repository, ILocalRepositoryState } from '../../src/models/repository'
import { gitHubRepoFixture } from '../helpers/github-repo-builder'
import {
  assignRepositoryToGroup,
  createCustomGroup,
  defaultRepositoryGroupsState,
  deleteCustomGroup,
  getCustomGroupIdForPath,
  getCustomGroupKey,
  moveGroup,
  renameCustomGroup,
  sortGroupKeys,
  toggleGroupCollapsed,
} from '../../src/lib/repository-groups'

const path = (name: string) => Path.resolve('repos', name)

describe('repository groups', () => {
  const cache = new Map<number, ILocalRepositoryState>()
  const shop = new Repository(
    path('samsungar.shop'),
    1,
    gitHubRepoFixture({ owner: 'me', name: 'samsungar.shop' }),
    false
  )
  const minicart = new Repository(path('samsungar.minicart'), 2, null, false)
  const other = new Repository(path('other'), 3, null, false)
  const repositories = [shop, minicart, other]

  it('creates, renames and deletes custom groups', () => {
    let state = createCustomGroup(
      defaultRepositoryGroupsState,
      ' Samsung ',
      shop.path,
      'g1'
    )
    assert.deepStrictEqual(state.customGroups, [{ id: 'g1', name: 'Samsung' }])
    assert.strictEqual(getCustomGroupIdForPath(state, shop.path), 'g1')

    state = renameCustomGroup(state, 'g1', 'Work')
    assert.strictEqual(state.customGroups[0].name, 'Work')

    state = toggleGroupCollapsed(state, getCustomGroupKey('g1'))
    state = deleteCustomGroup(state, 'g1')
    assert.deepStrictEqual(state, defaultRepositoryGroupsState)
  })

  it('moves repositories into custom groups', () => {
    let state = createCustomGroup(
      defaultRepositoryGroupsState,
      'Samsung',
      undefined,
      'g1'
    )
    state = assignRepositoryToGroup(state, shop.path, 'g1')
    state = assignRepositoryToGroup(state, minicart.path, 'g1')

    const grouped = groupRepositories(repositories, cache, [], state)
    assert.deepStrictEqual(
      grouped.map(g => g.identifier.kind),
      ['custom', 'other']
    )
    assert.deepStrictEqual(
      grouped[0].items.map(i => i.repository.id),
      [minicart.id, shop.id]
    )

    state = assignRepositoryToGroup(state, shop.path, null)
    const regrouped = groupRepositories(repositories, cache, [], state)
    assert.deepStrictEqual(
      regrouped.map(g => g.identifier.kind),
      ['custom', 'dotcom', 'other']
    )
  })

  it('shows empty custom groups', () => {
    const state = createCustomGroup(
      defaultRepositoryGroupsState,
      'Empty',
      undefined,
      'g1'
    )
    const grouped = groupRepositories(repositories, cache, [], state)
    const custom = grouped.find(g => g.identifier.kind === 'custom')
    assert.ok(custom)
    assert.strictEqual(custom.items.length, 0)
    assert.strictEqual(custom.showWhenEmpty, true)
  })

  it('marks collapsed groups', () => {
    const state = toggleGroupCollapsed(defaultRepositoryGroupsState, 'other')
    const grouped = groupRepositories(repositories, cache, [], state)
    const otherGroup = grouped.find(g => g.identifier.kind === 'other')
    assert.strictEqual(otherGroup?.collapsed, true)
  })

  it('orders groups as chosen by the user', () => {
    const visible = ['dotcom:me', 'other']
    const state = moveGroup(
      defaultRepositoryGroupsState,
      visible,
      'other',
      'up'
    )
    assert.deepStrictEqual(state.order, ['other', 'dotcom:me'])

    const grouped = groupRepositories(repositories, cache, [], state)
    assert.deepStrictEqual(
      grouped.map(g => g.identifier.kind),
      ['other', 'dotcom']
    )
  })

  it('does not move groups past the edges', () => {
    const visible = ['a', 'b']
    assert.strictEqual(
      moveGroup(defaultRepositoryGroupsState, visible, 'a', 'up'),
      defaultRepositoryGroupsState
    )
  })

  it('keeps unordered groups after ordered ones, in default order', () => {
    assert.deepStrictEqual(sortGroupKeys(['a', 'b', 'c', 'd'], ['c']), [
      'c',
      'a',
      'b',
      'd',
    ])
  })
})
