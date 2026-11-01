import assert from 'node:assert'
import { type KMSClient, SignCommand } from '@aws-sdk/client-kms'
import type { Signer } from './jwt.ts'

export const createKmsSigner =
  (kms: KMSClient, keyId: string): Signer =>
  async (message) => {
    const signCommandOutput = await kms.send(
      new SignCommand({
        KeyId: keyId,
        Message: message,
        MessageType: 'RAW',
        // GitHub App JWT requires RS256, i.e., RSASSA-PKCS1-v1_5 using SHA-256.
        // https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
        // https://datatracker.ietf.org/doc/html/rfc7518#section-3.1
        SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
      }),
    )
    assert(signCommandOutput.Signature, 'signCommandOutput.Signature must be returned')
    return Buffer.from(signCommandOutput.Signature)
  }
