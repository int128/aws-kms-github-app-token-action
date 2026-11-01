import assert from 'node:assert'
import * as crypto from 'node:crypto'
import { type KMSClient, SignCommand } from '@aws-sdk/client-kms'
import type { Signer } from './jwt.ts'

export const createKmsSigner =
  (kms: KMSClient, keyId: string): Signer =>
  async (message) => {
    const digest = crypto.createHash('sha256').update(message).digest()
    const signCommandOutput = await kms.send(
      new SignCommand({
        KeyId: keyId,
        Message: digest,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
      }),
    )
    assert(signCommandOutput.Signature, 'signCommandOutput.Signature must be returned')
    return Buffer.from(signCommandOutput.Signature)
  }
