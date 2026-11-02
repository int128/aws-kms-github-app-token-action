import assert from 'node:assert'
import * as core from '@actions/core'
import {
  DescribeKeyCommand,
  type KMSClient,
  paginateListResourceTags,
  SignCommand,
  type Tag,
} from '@aws-sdk/client-kms'
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

const CLIENT_ID_TAG_KEY = 'GitHubAppClientId'

export const getClientIdFromKeyTag = async (kms: KMSClient, keyId: string): Promise<string> => {
  // ListResourceTags does not accept an alias, so resolve the key ARN first.
  core.info(`Resolving the KMS key ARN for ${keyId}`)
  const describeKeyOutput = await kms.send(new DescribeKeyCommand({ KeyId: keyId }))
  const keyArn = describeKeyOutput.KeyMetadata?.Arn
  assert(keyArn, 'describeKeyOutput.KeyMetadata.Arn must be returned')

  core.info(`Getting the tags of the KMS key ${keyId}`)
  const tags: Tag[] = []
  for await (const page of paginateListResourceTags({ client: kms }, { KeyId: keyArn })) {
    tags.push(...(page.Tags ?? []))
  }
  const clientId = findTagValue(tags, CLIENT_ID_TAG_KEY)
  if (!clientId) {
    throw new Error(`KMS key ${keyId} must have the tag ${CLIENT_ID_TAG_KEY} when client-id is omitted`)
  }
  return clientId
}

export const findTagValue = (tags: Tag[], key: string): string | undefined =>
  tags.find((tag) => tag.TagKey === key)?.TagValue || undefined
