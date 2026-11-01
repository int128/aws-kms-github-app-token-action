import * as core from '@actions/core'
import { getDefaultRoleSessionName } from '../aws.ts'
import { getContext } from '../github.ts'
import { getPermissionsFromInputs, parseInstallationTarget } from './installation.ts'
import { run } from './run.ts'

const main = async () => {
  const skipTokenRevoke = core.getBooleanInput('skip-token-revoke')
  const context = getContext()
  const outputs = await run({
    roleToAssume: core.getInput('role-to-assume', { required: true }),
    roleSessionName: core.getInput('role-session-name') || getDefaultRoleSessionName(context),
    awsRegion: core.getInput('aws-region', { required: true }),
    kmsKeyId: core.getInput('kms-key-id', { required: true }),
    clientId: core.getInput('client-id', { required: true }),
    githubApiUrl: core.getInput('github-api-url', { required: true }),
    installationTarget: parseInstallationTarget(
      {
        owner: core.getInput('owner'),
        repositories: core.getMultilineInput('repositories'),
      },
      context,
    ),
    permissions: getPermissionsFromInputs(process.env),
  })
  core.setOutput('token', outputs.token)
  core.setOutput('installation-id', outputs.installationId)
  core.setOutput('app-slug', outputs.appSlug)
  if (!skipTokenRevoke) {
    // Pass the token to the post step to revoke it
    core.saveState('token', outputs.token)
    core.saveState('expiresAt', outputs.expiresAt)
  }
}

try {
  await main()
} catch (e) {
  core.setFailed(e instanceof Error ? e : String(e))
  console.error(e)
}
