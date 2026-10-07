import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  addSavedGitEmail,
  getSavedGitEmails,
  isSavedGitEmail,
  removeSavedGitEmail,
} from '../../src/lib/saved-git-emails'

describe('saved git emails', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty list when nothing is saved', () => {
    assert.deepStrictEqual(getSavedGitEmails(), [])
  })

  it('adds and persists emails in order', () => {
    addSavedGitEmail('work@example.com')
    addSavedGitEmail('123+me@users.noreply.github.com')
    assert.deepStrictEqual(getSavedGitEmails(), [
      'work@example.com',
      '123+me@users.noreply.github.com',
    ])
  })

  it('ignores duplicates case-insensitively and trims whitespace', () => {
    addSavedGitEmail('Work@Example.com')
    addSavedGitEmail('  work@example.com ')
    assert.deepStrictEqual(getSavedGitEmails(), ['Work@Example.com'])
    assert.strictEqual(isSavedGitEmail('WORK@example.com'), true)
  })

  it('ignores empty emails', () => {
    addSavedGitEmail('   ')
    assert.deepStrictEqual(getSavedGitEmails(), [])
  })

  it('removes emails case-insensitively', () => {
    addSavedGitEmail('a@example.com')
    addSavedGitEmail('b@example.com')
    removeSavedGitEmail('A@EXAMPLE.COM')
    assert.deepStrictEqual(getSavedGitEmails(), ['b@example.com'])
    assert.strictEqual(isSavedGitEmail('a@example.com'), false)
  })
})
