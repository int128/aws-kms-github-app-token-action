export type Signer = (message: Buffer) => Promise<Buffer>

// https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
export const createGitHubAppJwt = async (
  clientId: string,
  signer: Signer,
  now: number = Date.now(),
): Promise<string> => {
  // Issue 60 seconds in the past to allow for clock drift
  const iat = Math.floor(now / 1000) - 60
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ iat, exp: iat + 600, iss: clientId }))
  const signingInput = `${header}.${payload}`
  const signature = await signer(Buffer.from(signingInput))
  return `${signingInput}.${base64url(signature)}`
}

const base64url = (s: string | Buffer) => Buffer.from(s).toString('base64url')
