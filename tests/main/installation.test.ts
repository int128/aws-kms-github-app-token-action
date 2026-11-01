import assert from 'node:assert'
import { describe, it } from 'node:test'
import { getPermissionsFromInputs, parseInstallationTarget } from '../../src/main/installation.ts'

describe('parseInstallationTarget', () => {
  const context = { repo: { owner: 'octocat', repo: 'hello-world' }, runId: '123456789' }

  it('defaults to the current repository', () => {
    assert.deepStrictEqual(parseInstallationTarget({ owner: '', repositories: [] }, context), {
      owner: 'octocat',
      repositories: ['hello-world'],
    })
  })

  it('returns the owner if only owner is set', () => {
    assert.deepStrictEqual(parseInstallationTarget({ owner: 'example', repositories: [] }, context), {
      owner: 'example',
      repositories: undefined,
    })
  })

  it('returns the repositories of the default owner', () => {
    assert.deepStrictEqual(parseInstallationTarget({ owner: '', repositories: ['foo', 'octocat/bar'] }, context), {
      owner: 'octocat',
      repositories: ['foo', 'bar'],
    })
  })

  it('throws if a repository owner does not match', () => {
    assert.throws(() => parseInstallationTarget({ owner: 'example', repositories: ['octocat/bar'] }, context))
  })
})

describe('getPermissionsFromInputs', () => {
  it('returns undefined if no permission is set', () => {
    assert.strictEqual(getPermissionsFromInputs({ 'INPUT_PERMISSION-CONTENTS': '', INPUT_OWNER: 'octocat' }), undefined)
  })

  it('returns the permissions', () => {
    assert.deepStrictEqual(
      getPermissionsFromInputs({ 'INPUT_PERMISSION-CONTENTS': 'read', 'INPUT_PERMISSION-PULL-REQUESTS': 'write' }),
      { contents: 'read', pull_requests: 'write' },
    )
  })
})
