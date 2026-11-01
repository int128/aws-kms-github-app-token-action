import * as core from '@actions/core'
import { STATE_EXPIRES_AT, STATE_TOKEN } from '../state.ts'
import { run } from './run.ts'

const post = async () =>
  await run({
    token: core.getState(STATE_TOKEN),
    expiresAt: core.getState(STATE_EXPIRES_AT),
    githubApiUrl: core.getInput('github-api-url', { required: true }),
  })

try {
  await post()
} catch (e) {
  core.warning(`Failed to revoke the token: ${e instanceof Error ? e.message : String(e)}`)
}
