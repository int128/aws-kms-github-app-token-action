import assert from 'node:assert'
import { describe, it } from 'node:test'
import { getDefaultRoleSessionName } from '../src/aws.ts'

describe('getDefaultRoleSessionName', () => {
  it('returns the repository and run ID', () => {
    assert.strictEqual(
      getDefaultRoleSessionName({ repo: { owner: 'octocat', repo: 'hello-world' }, runId: '123456789' }),
      'octocat.hello-world@123456789',
    )
  })

  it('truncates the repository to fit 64 characters', () => {
    const name = getDefaultRoleSessionName({ repo: { owner: 'octocat', repo: 'a'.repeat(100) }, runId: '123456789' })
    assert.strictEqual(name.length, 64)
    assert(name.endsWith('@123456789'))
  })
})
