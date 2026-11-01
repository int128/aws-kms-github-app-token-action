import * as core from '@actions/core'
import { run } from './run.ts'

const post = async () => {
  await run({
    token: core.getState('token'),
    expiresAt: core.getState('expiresAt'),
    githubApiUrl: core.getInput('github-api-url', { required: true }),
  })
}

try {
  await post()
} catch (e) {
  core.warning(`Failed to revoke the token: ${e instanceof Error ? e.message : String(e)}`)
}
