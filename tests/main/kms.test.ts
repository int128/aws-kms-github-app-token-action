import assert from 'node:assert'
import { describe, it } from 'node:test'
import { findTagValue } from '../../src/main/kms.ts'

describe('findTagValue', () => {
  it('returns the value of the client ID tag', () => {
    assert.strictEqual(
      findTagValue(
        [
          { TagKey: 'Name', TagValue: 'example' },
          { TagKey: 'GitHubAppClientId', TagValue: 'Iv1.0123456789abcdef' },
        ],
        'GitHubAppClientId',
      ),
      'Iv1.0123456789abcdef',
    )
  })

  it('returns undefined if the tag does not exist', () => {
    assert.strictEqual(findTagValue([{ TagKey: 'Name', TagValue: 'example' }], 'GitHubAppClientId'), undefined)
  })

  it('returns undefined if the tag value is empty', () => {
    assert.strictEqual(findTagValue([{ TagKey: 'GitHubAppClientId', TagValue: '' }], 'GitHubAppClientId'), undefined)
  })
})
