import assert from 'node:assert'
import { retry } from '@octokit/plugin-retry'
import { Octokit } from '@octokit/rest'

export const getOctokit = (auth: string) => {
  const baseUrl = process.env['GITHUB_API_URL']
  return new (Octokit.plugin(retry))({
    auth,
    ...(baseUrl ? { baseUrl } : {}),
  })
}

export type Context = {
  repo: {
    owner: string
    repo: string
  }
  runId: string
}

export const getContext = (): Context => {
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  return {
    repo: getRepo(),
    runId: getEnv('GITHUB_RUN_ID'),
  }
}

const getRepo = () => {
  const [owner, repo] = getEnv('GITHUB_REPOSITORY').split('/')
  assert(owner, 'GITHUB_REPOSITORY must have an owner part')
  assert(repo, 'GITHUB_REPOSITORY must have a repo part')
  return { owner, repo }
}

const getEnv = (name: string): string => {
  assert(process.env[name], `${name} is required`)
  return process.env[name]
}
