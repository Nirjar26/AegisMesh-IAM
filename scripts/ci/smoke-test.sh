#!/usr/bin/env bash
set -euo pipefail

# Wait for deployments to roll out
kubectl rollout status deployment/backend -n Bastion --timeout=120s
kubectl rollout status deployment/frontend -n Bastion --timeout=120s

# Run an in-cluster curl from a temporary pod against the frontend service
kubectl run smoke-test --rm -n Bastion --image=curlimages/curl --restart=Never --command -- sh -c '
  echo "Running HTTP check against frontend service..."
  curl -sS -f http://frontend:80/ || curl -sS -f http://frontend.Bastion.svc.cluster.local:80/ || exit 1
'

echo "Smoke tests passed."
