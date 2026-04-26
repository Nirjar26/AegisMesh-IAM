# Jenkins Setup for AegisMesh IAM

This repository includes a root `Jenkinsfile` for CI/CD.

## What the pipeline does

1. Checks out source code.
2. Installs backend and frontend dependencies in parallel.
3. Runs backend tests, frontend lint, and frontend build in parallel.
4. Optionally builds backend/frontend Docker images.
5. Archives frontend build artifacts (`frontend/dist/**`).

## Jenkins Job Configuration

Create a **Pipeline** job and configure:

- **Definition:** Pipeline script from SCM
- **SCM:** Git
- **Repository URL:** your repo URL
- **Branch Specifier:** `*/main` (or your branch)
- **Script Path:** `Jenkinsfile`

## Recommended Jenkins Plugins

Install these plugins:

- Pipeline
- Git
- Credentials Binding
- Timestamper
- Docker Pipeline (only if you will build/push Docker images)

## Jenkins Node Requirements

Your Jenkins agent must have:

- Node.js 22.x and npm
- Git
- Docker (only for `RUN_DOCKER_BUILD=true`)

If you use Jenkins tool management for Node, define a Node.js installation and keep the version at 22.x.

## Environment and Secrets

The pipeline includes safe CI defaults for required backend env vars (for unit-style checks).

For production-like CI/CD, define Jenkins credentials and inject them as environment variables in the job or global Jenkins configuration:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- Any OAuth/SMTP variables you need for integration tests or deployments

## Optional Docker Build

At build time, set parameters:

- `RUN_DOCKER_BUILD=true`
- `BACKEND_IMAGE=your-registry/aegismesh-backend`
- `FRONTEND_IMAGE=your-registry/aegismesh-frontend`
- `IMAGE_TAG=<tag>`

Current pipeline builds images only. If you want push/deploy stages, add registry login and deployment steps in your Jenkins job or extend the `Jenkinsfile`.

## Suggested Triggers

- GitHub webhook: trigger on push/PR
- Optional nightly build for regression checks

## First Run Checklist

1. Ensure Jenkins agent has Node.js 22.x.
2. Run one build with `RUN_DOCKER_BUILD=false`.
3. Fix any lint/test issues surfaced by CI.
4. Enable Docker build parameter and verify image build if needed.
