---

## AegisMesh — The IAM That Ships Itself

> Self-hosted identity & access platform. GitOps-native. ML-powered threat detection. Production-tested on k3s with full zero-trust posture.

---

### The Pitch (One Sentence)

Auth0/Okta for teams that trust their own infrastructure more than they trust SaaS — policy-driven RBAC/PBAC, step-up MFA, session management, and an Isolation Forest scoring every login in real time, all delivered through a fully automated GitOps pipeline from commit to canary rollout.

---

### What Makes This Different

**GitOps, Not Ops.** The deployment pipeline is a directed graph with no human middle: push to `main` → CI builds and pushes SHA-tagged images to ECR → CD patches the Kustomize overlays and opens an auto-merge PR → ArgoCD reconciles the live cluster → canary rollout serves 20% traffic for 60s before proceeding. Every deploy is a Git commit. Every commit is an immutable image tag. No kubectl apply.

**Three Languages, One Trace.** A login flows through React 19 → Express 5 → scikit-learn Inference, stitched together by Datadog APM distributed tracing. Every log line is linked to a trace. Falco sidekick routes container-level security events into the same observability pipeline.

**Zero Trust at the Pod Level.** Default-deny ingress and egress across all pods. Each inter-service connection is explicitly allowed by a NetworkPolicy. Containers run as UID 10001 with `drop: [ALL]`, read-only rootfs, `allowPrivilegeEscalation: false`, and seccomp `RuntimeDefault`. The cluster will reject a pod that doesn't declare its dependencies.

**ML That Retrains Itself.** An Isolation Forest scores every login by IP, time-of-day, and historical behavior. Score > 0.7 triggers step-up MFA. A CronJob retrains the model at midnight from the last 10k audit events, logs the run to MLflow, and hot-swaps the pipeline file — no restart, no deployment.

---

### DevOps Infrastructure

#### Pipeline

```
feature branch → PR → CI (lint, test, build, Docker validate)
                                         ↓ main merge
                          ECR push (SHA tag + v1)
                                         ↓
                    CD: resolve SHA → patch Kustomize → bot/ PR → auto-merge
                                         ↓
                    ArgoCD syncs → canary 20% → 60s → 50% → 60s → 100%
                                         ↓
                    Smoke test (self-hosted runner, real cluster traffic)
```

Key design constraint: only ArgoCD touches the cluster. The CD pipeline only writes Git commits. This makes every deploy auditable and revertable by reverting a commit.

#### Kubernetes (k3s)

| Layer | What |
|-------|------|
| GitOps | ArgoCD + Argo Rollouts (canary) |
| Secrets | SealedSecrets (encrypted in Git, decrypted in-cluster) |
| Networking | MetalLB + ingress-nginx + cert-manager + Let's Encrypt (Cloudflare DNS01) |
| Policy | Kyverno (admission), 12 NetworkPolicies (zero-trust) |
| Autoscaling | HPA (CPU > 50%, 1–3 replicas) |
| Deployments | Init containers for ordered boot: `wait-for-db` → `prisma-migrate` → app |

#### CI/CD

**CI** (`.github/workflows/ci.yml`): Turborepo lint → Jest tests → Vite build → Docker build validation → on main merge: AWS ECR push with commit SHA + `v1` stable tag.

**CD** (`.github/workflows/cd.yml`): Resolves the triggering commit SHA → runs `.github/scripts/update-k8s-images.sh` to patch `patch-backend-image.yaml` and `patch-frontend-image.yaml` → commits to `bot/overlay-update-*` branch → opens a PR with auto-merge → ArgoCD picks it up.

**Security in CI**: CodeQL (weekly + every PR), SonarCloud quality gates, Trivy CVE scanning on images and manifests, Docker multi-stage builds with pinned deps.

#### Infrastructure as Code

`platform/terraform/main.tf` provisions ECR repositories with lifecycle policies (keep last 50 tagged images, expire untagged after 7 days).

#### Observability Stack

| System | Role |
|--------|------|
| Datadog APM | Distributed traces across React → Node → Python + log correlation |
| Prometheus | App metrics (backend:5000/metrics, security-engine:8000/metrics) |
| Grafana | Auth rates, latency, error budgets, ML model version + risk score distributions |
| Loki | Container log aggregation |
| MLflow | Experiment tracking, model registry, hot-swap pipeline versioning |

#### Runtime Security

- **Falco** → syscall monitoring → Datadog Security Signals
- **CrowdSec** → network-level brute-force blocking
- **Trivy** → periodic CVE scanning of running manifests
- **SealedSecrets** → credentials encrypted in Git, decrypted only by the in-cluster controller

#### Backup & DR

`scripts/backup/backup-everything.sh`: captures Git state, K8s resources (manifests, secrets, PVCs, events), EBS snapshots, PostgreSQL `pg_dumpall`, Docker named volumes, Terraform state. Velero + MinIO for S3-compatible scheduled backups.

#### Bootstrap Scripts

A full library of install scripts in `scripts/install/`: ArgoCD, Argo Rollouts, Falco, Kyverno, ingress stack, SealedSecrets, Velero+MinIO, Loki stack, metrics-server, ECR credential provider.

---

### Architecture at a Glance

```
Browser → Nginx Ingress → React Dashboard (static)
                         → Express API (JWT, RBAC/PBAC, sessions, audit)
                              ├── Redis (session cache)
                              ├── PostgreSQL 17 (Prisma ORM)
                              └── FastAPI ML Engine (Isolation Forest scoring)
```

Three containers, one monorepo, a single `docker-compose up` gets you running.

---

### The "Out of the Box" Details

- The CD pipeline guards against unexpected file changes (`grep -vE` whitelist on the diff) — it will abort if something besides the two patch files was modified
- Prisma migrations run from the *new* image as an init container — database schema always matches application code
- The security engine has a fail-open contract: if the ML service is unreachable, login defaults to low risk — identity never becomes a SPOF
- MLflow tracks every model version; Grafana charts which version is live and how risk scores are distributed
- Kubelet credential provider handles ECR auth natively — `imagePullSecrets` are legacy-only
- The observability stack is deploy-time selectable: Prometheus/Grafana/Loki for local, Datadog for production, APM toggleable via env var to manage costs

---

### Technologies

| Domain | Stack |
|--------|-------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, TanStack Query, Recharts, Zod |
| Backend | Node.js 22, Express 5, Prisma 6, PostgreSQL 17, Redis 7 |
| ML Engine | Python 3.11, FastAPI, scikit-learn, pandas, MLflow |
| Auth | JWT, Passport (Google + GitHub OAuth), TOTP MFA, step-up reauth |
| Orchestration | Docker Compose, k3s, Kustomize, ArgoCD, Argo Rollouts, Helm |
| CI/CD | GitHub Actions, AWS ECR, custom overlay patching |
| IaC | Terraform (AWS), Kustomize overlays (K8s) |
| Observability | Datadog APM + Logs, Prometheus, Grafana, Loki, MLflow |
| Security Runtime | Falco, CrowdSec, Kyverno, NetworkPolicies, SealedSecrets |
| Security CI | CodeQL, SonarCloud, Trivy, Docker multi-stage |
| Backup | Velero + MinIO, EBS snapshots, pg_dumpall |

---

*Self-hosted. GitOps-driven. ML-native. Fully observable.*
