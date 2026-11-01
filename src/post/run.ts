import * as core from '@actions/core'
import { getOctokit } from '../github.ts'

export type Inputs = {
  token: string
  expiresAt: string
}

export const run = async (inputs: Inputs) => {
  if (!inputs.token) {
    return
  }
  const expiresAt = new Date(inputs.expiresAt).getTime()
  if (Number.isNaN(expiresAt)) {
    core.info(`Ignored the invalid expiresAt: ${inputs.expiresAt}`)
    return
  }
  if (expiresAt < Date.now()) {
    core.info('The token has already expired')
    return
  }
  const octokit = getOctokit(inputs.token)
  await octokit.apps.revokeInstallationAccessToken()
}
