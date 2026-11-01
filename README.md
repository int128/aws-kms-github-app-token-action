# aws-kms-github-app-token-action [![ts](https://github.com/int128/aws-kms-github-app-token-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/aws-kms-github-app-token-action/actions/workflows/ts.yaml)

This action creates a GitHub App installation access token using the private key stored in AWS KMS.
It is a drop-in replacement of [actions/create-github-app-token](https://github.com/actions/create-github-app-token),
but the private key never leaves AWS KMS.

## Why

When you pass the private key of a GitHub App to `actions/create-github-app-token`,

- The private key is exposed on the runner.
  Any step or third-party action in the workflow can read it.
- You cannot audit which workflow used the private key.

This action signs the JWT of the GitHub App using AWS KMS.

- The private key is never exposed on the runner.
- CloudTrail records `AssumeRoleWithWebIdentity` and `kms:Sign` events.
- The AWS credentials are kept in the memory of this action.
  They are not exported to the subsequent steps, unlike `aws-actions/configure-aws-credentials`.

## Getting Started

### Import the private key into AWS KMS

GitHub generates the private key of a GitHub App.
You need to import it into an AWS KMS key with the external key material.

1. Create a KMS key with `KeySpec=RSA_2048`, `KeyUsage=SIGN_VERIFY` and `Origin=EXTERNAL`.
2. Generate a private key in the GitHub App settings.
3. Import the private key into the KMS key.
   See [Importing key material](https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys.html).
4. Delete the private key from your computer.

To rotate the key, create a new KMS key and switch the alias.
A GitHub App can have multiple private keys, so you can rotate it without downtime.

### Create an IAM role

Create an IAM role with the trust policy for the GitHub OIDC provider.
You should restrict the `sub` claim to the repositories which are allowed to use the GitHub App.

```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"
    }
  }
}
```

Allow the role to sign with the KMS key.

```json
{
  "Effect": "Allow",
  "Action": "kms:Sign",
  "Resource": "arn:aws:kms:ap-northeast-1:123456789012:key/...",
  "Condition": {
    "StringEquals": { "kms:SigningAlgorithm": "RSASSA_PKCS1_V1_5_SHA_256" }
  }
}
```

Note that the role can create a token for any installation of the GitHub App with any permission.
Consider separating the roles (or GitHub Apps) by the use-case.

### Create a workflow

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - uses: int128/aws-kms-github-app-token-action@v0
        id: app-token
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-app-signer
          aws-region: ap-northeast-1
          kms-key-id: alias/github-app-key
          client-id: ${{ vars.APP_CLIENT_ID }}
          permission-contents: read
      - run: gh api /repos/${{ github.repository }}
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

## How it works

1. Get an OIDC token of GitHub Actions.
2. Assume the IAM role by `AssumeRoleWithWebIdentity`.
3. Sign the JWT of the GitHub App by `kms:Sign` with `RSASSA_PKCS1_V1_5_SHA_256`.
4. Create an installation access token.
5. Revoke the token in the post step.

## Specification

### Inputs

| Name                | Default                                 | Description                                                                             |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `role-to-assume`    | (required)                              | IAM role to assume via GitHub OIDC                                                      |
| `role-session-name` | `<owner>.<repo>@<run_id>`               | Role session name                                                                       |
| `aws-region`        | (required)                              | AWS region of the KMS key                                                               |
| `kms-key-id`        | (required)                              | ID, ARN or alias of the KMS key                                                         |
| `client-id`         | (required)                              | GitHub App Client ID                                                                    |
| `owner`             | current repository owner                | The owner of the GitHub App installation                                                |
| `repositories`      | current repository, if `owner` is unset | Newline-separated list of repositories to grant the token access to                     |
| `skip-token-revoke` | `false`                                 | If true, the token will not be revoked when the current job is complete                 |
| `permission-*`      | all permissions of the app              | The level of permission to grant the token. See [action.yaml](action.yaml) for the list |

The inputs are based on [actions/create-github-app-token](https://github.com/actions/create-github-app-token) and [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials).

### Outputs

| Name              | Description                      |
| ----------------- | -------------------------------- |
| `token`           | GitHub installation access token |
| `installation-id` | GitHub App installation ID       |
| `app-slug`        | GitHub App slug                  |
