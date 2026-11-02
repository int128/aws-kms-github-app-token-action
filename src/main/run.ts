import * as core from '@actions/core'
import { KMSClient } from '@aws-sdk/client-kms'
import { fromWebToken } from '@aws-sdk/credential-provider-web-identity'
import { getOctokit } from '../github.ts'
import { createInstallationAccessToken, type InstallationTarget, type Permissions } from './installation.ts'
import { createGitHubAppJwt } from './jwt.ts'
import { createKmsSigner, getClientIdFromKeyTag } from './kms.ts'

type Inputs = {
  roleToAssume: string
  roleSessionName: string
  awsRegion: string
  kmsKeyId: string
  clientId: string | undefined
  githubApiUrl: string
  installationTarget: InstallationTarget
  permissions: Permissions
}

type Outputs = {
  token: string
  expiresAt: string
  installationId: number
  appSlug: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const credentialIdentityProvider = fromWebToken({
    webIdentityToken: await core.getIDToken('sts.amazonaws.com'),
    roleArn: inputs.roleToAssume,
    roleSessionName: inputs.roleSessionName,
  })
  const kms = new KMSClient({
    credentials: credentialIdentityProvider,
    region: inputs.awsRegion,
  })
  const signer = createKmsSigner(kms, inputs.kmsKeyId)

  let clientId = inputs.clientId
  if (!clientId) {
    clientId = await getClientIdFromKeyTag(kms, inputs.kmsKeyId)
    core.info(`Using the client ID ${clientId} from the tag of the AWS KMS key ${inputs.kmsKeyId}`)
  }

  core.info(`Signing the GitHub App JWT using the AWS KMS key ${inputs.kmsKeyId}`)
  const jwt = await createGitHubAppJwt(clientId, signer)
  core.setSecret(jwt)
  core.info(`Signed the GitHub App JWT using the AWS KMS key ${inputs.kmsKeyId}`)

  const octokit = getOctokit(jwt, inputs.githubApiUrl)
  const installationToken = await createInstallationAccessToken(inputs.installationTarget, inputs.permissions, octokit)
  core.setSecret(installationToken.token)
  core.info(`Created an installation token, expires at ${installationToken.expiresAt}`)
  return installationToken
}
