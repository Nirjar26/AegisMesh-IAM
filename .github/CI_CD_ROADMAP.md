# CI/CD Roadmap

## Notifications

- Slack/Discord webhook on CI or CD failure
- Deploy started / completed / rolled back notifications

## CI Improvements

- Upload test artifacts (JUnit XML reports) on failure
- Coverage reports uploaded to Codecov or similar
- Container image vulnerability scanning (Trivy) in build step
- SBOM generation + attestation (syft + cosign)

## CD Improvements

- Staged rollout: deploy to canary namespace first, wait, then prod
- Auto-rollback: if canary health check fails, revert overlay PR
- Deployment Slack notification with duration + commit link

## Terraform

- `terraform fmt -check` in CI
- `tflint` + `tfsec` (or `checkov`) scans
- Cost estimation (infracost) on PR plan comments
- Approval gate for `terraform apply` (environment protection rule)

## Security

- Container image signing (cosign)
- Supply-chain attestation (SLSA)
- Dependency review action on PRs

## Observability

- Deploy dashboard (GitHub Environments + Deployments API)
- Pipeline SLA metrics — p95 time per workflow, success rate trend
