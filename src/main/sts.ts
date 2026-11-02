import type { Context } from '../github.ts'

// https://docs.aws.amazon.com/IAM/latest/APIReference/API_AssumeRoleWithWebIdentity.html
export const getDefaultRoleSessionName = (context: Context): string => {
  const suffix = `@${context.runId}`
  const owner = context.repo.owner.replaceAll(/[^\w+=,.@-]/g, '_')
  const repo = context.repo.repo.replaceAll(/[^\w+=,.@-]/g, '_')
  return `${owner}.${repo}`.slice(0, 64 - suffix.length) + suffix
}
