import assert from 'node:assert'
import * as crypto from 'node:crypto'
import { describe, it } from 'node:test'
import { createGitHubAppJwt } from '../../src/main/jwt.ts'

describe('createAppJwt', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const signer = async (message: Buffer) => crypto.sign('sha256', message, privateKey)

  it('returns a RS256 JWT verifiable with the public key', async () => {
    const jwt = await createGitHubAppJwt('Iv1.example', signer, Date.UTC(2026, 0, 1) + 123)
    const [header, payload, signature] = jwt.split('.')
    assert(header && payload && signature)
    assert.deepStrictEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'RS256', typ: 'JWT' })
    const iat = Date.UTC(2026, 0, 1) / 1000 - 60
    assert.deepStrictEqual(JSON.parse(Buffer.from(payload, 'base64url').toString()), {
      iat,
      exp: iat + 600,
      iss: 'Iv1.example',
    })
    assert(crypto.verify('sha256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')))
  })
})
