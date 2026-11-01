import type { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import type { Context } from '../github.ts'

export type InstallationTargetInputs = {
  owner: string
  repositories: string[]
}

export type InstallationTarget = {
  owner: string
  repositories: string[] | undefined
}

export const parseInstallationTarget = (inputs: InstallationTargetInputs, context: Context): InstallationTarget => {
  if (inputs.repositories.length === 0) {
    if (!inputs.owner) {
      return { owner: context.repo.owner, repositories: [context.repo.repo] }
    }
    return { owner: inputs.owner, repositories: undefined }
  }

  const owner = inputs.owner || context.repo.owner
  const repositories = inputs.repositories.map((input) => {
    const parts = input.split('/')
    if (parts.length === 1 && parts[0]) {
      return parts[0]
    }
    if (parts.length === 2 && parts[0] && parts[1]) {
      if (parts[0].toLowerCase() !== owner.toLowerCase()) {
        throw new Error(
          `Repository '${input}' includes owner '${parts[0]}', which does not match the resolved owner '${owner}'.`,
        )
      }
      return parts[1]
    }
    throw new Error(`Invalid repository '${input}'. Expected 'repository' or 'owner/repository'.`)
  })
  return { owner, repositories }
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
  if (target.repositories === undefined) {
    const { data: installation } = await octokit.apps.getUserInstallation({
      username: target.owner,
    })
    const { data: installationToken } = await octokit.apps.createInstallationAccessToken({
      installation_id: installation.id,
      ...(permissions ? { permissions } : {}),
    })
    return {
      token: installationToken.token,
      expiresAt: installationToken.expires_at,
      installationId: installation.id,
      appSlug: installation.app_slug,
    }
  }

  const { data: installation } = await octokit.apps.getRepoInstallation({
    owner: target.owner,
    repo: target.repositories[0] ?? '',
  })
  const { data: installationToken } = await octokit.apps.createInstallationAccessToken({
    installation_id: installation.id,
    repositories: target.repositories,
    ...(permissions ? { permissions } : {}),
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
