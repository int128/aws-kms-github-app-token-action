import type { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import type { Context } from '../github.ts'

export type InstallationTargetInputs = {
  owner: string
  repositories: string[]
}

export type InstallationTarget = {
  owner: string
  repositories?: string[]
}

export const parseInstallationTarget = (inputs: InstallationTargetInputs, context: Context): InstallationTarget => {
  if (inputs.repositories.length > 0) {
    const owner = inputs.owner || context.repo.owner
    return { owner, repositories: inputs.repositories.map((input) => parseRepository(input, owner)) }
  }
  if (inputs.owner) {
    return { owner: inputs.owner }
  }
  return { owner: context.repo.owner, repositories: [context.repo.repo] }
}

const parseRepository = (input: string, owner: string): string => {
  const [first, second, ...rest] = input.split('/')
  if (first && second === undefined) {
    return first
  }
  if (first && second && rest.length === 0) {
    if (first.toLowerCase() !== owner.toLowerCase()) {
      throw new Error(
        `Repository '${input}' includes owner '${first}', which does not match the resolved owner '${owner}'.`,
      )
    }
    return second
  }
  throw new Error(`Invalid repository '${input}'. Expected 'repository' or 'owner/repository'.`)
}

type InstallationAccessToken = {
  token: string
  expiresAt: string
  installationId: number
  appSlug: string
}

export const createInstallationAccessToken = async (
  target: InstallationTarget,
  permissions: Permissions,
  octokit: Octokit,
): Promise<InstallationAccessToken> => {
  const { data: installation } =
    target.repositories === undefined
      ? await octokit.apps.getUserInstallation({ username: target.owner })
      : await octokit.apps.getRepoInstallation({ owner: target.owner, repo: target.repositories[0] ?? '' })
  const { data: installationToken } = await octokit.apps.createInstallationAccessToken({
    installation_id: installation.id,
    ...(target.repositories && { repositories: target.repositories }),
    ...(permissions && { permissions }),
  })
  return {
    token: installationToken.token,
    expiresAt: installationToken.expires_at,
    installationId: installation.id,
    appSlug: installation.app_slug,
  }
}

export type Permissions = RestEndpointMethodTypes['apps']['createInstallationAccessToken']['parameters']['permissions']

// Collect the permission-* inputs into an object.
// If no permission is set, return undefined to inherit all permissions of the app.
export const getPermissionsFromInputs = (env: NodeJS.ProcessEnv): Permissions | undefined => {
  let permissions: Record<string, string> | undefined
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('INPUT_PERMISSION-') || !value) {
      continue
    }
    const permission = key.slice('INPUT_PERMISSION-'.length).toLowerCase().replaceAll('-', '_')
    permissions = { ...permissions, [permission]: value }
  }
  return permissions
}
