import assert from 'node:assert'
import * as crypto from 'node:crypto'
import { describe, it } from 'node:test'
import { createGitHubAppJwt } from '../../src/main/jwt.ts'

const decodeJson = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString())

describe('createGitHubAppJwt', () => {
  const keyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const signer = async (message: Buffer) => crypto.sign('sha256', message, keyPair.privateKey)

  // 2026-01-01T00:00:00.123Z (sub-second part should be truncated)
  const now = Date.UTC(2026, 0, 1, 0, 0, 0, 123)

  const createJwt = async () => {
    const jwt = await createGitHubAppJwt('Iv1.example', signer, now)
    const [header, payload, signature] = jwt.split('.')
    assert(header && payload && signature)
    return { header, payload, signature }
  }

  it('has a RS256 header', async () => {
    const { header } = await createJwt()
    assert.deepStrictEqual(decodeJson(header), { alg: 'RS256', typ: 'JWT' })
  })

  it('has iat 60 seconds in the past and exp 10 minutes after iat', async () => {
    const { payload } = await createJwt()
    assert.deepStrictEqual(decodeJson(payload), {
      iat: 1767225540, // 2025-12-31T23:59:00Z
      exp: 1767226140, // 2026-01-01T00:09:00Z
      iss: 'Iv1.example',
    })
  })

  it('has a signature verifiable with the public key', async () => {
    const { header, payload, signature } = await createJwt()
    const verified = crypto.verify(
      'sha256',
      Buffer.from(`${header}.${payload}`),
      keyPair.publicKey,
      Buffer.from(signature, 'base64url'),
    )
    assert(verified)
  })
})
