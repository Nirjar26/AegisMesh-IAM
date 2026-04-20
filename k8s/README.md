# AegisMesh IAM on Kubernetes (Minikube)

This directory contains a complete Kubernetes migration for the Docker Compose stack:
- PostgreSQL
- Backend API (with Prisma migration init step)
- Frontend (Nginx)
- Ingress routing for UI + API

## 1. Prerequisites

- Minikube
- kubectl
- Docker available to Minikube runtime

## 2. Start Minikube and Ingress

```powershell
minikube start
minikube addons enable ingress
```

## 3. Build Images into Minikube

Run these from repository root:

```powershell
minikube image build -t aegismesh-backend:local .\backend
minikube image build -t aegismesh-frontend:local .\frontend
```

These image tags are already referenced by the manifests.

## 4. Configure Secrets

Edit [manifests/secret.yaml](manifests/secret.yaml) and replace placeholders, at minimum:
- DB_PASSWORD
- JWT_SECRET
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- OAuth and SMTP credentials as needed

## 5. Deploy

```powershell
kubectl apply -k .\k8s
```

## 6. Verify

```powershell
kubectl get all -n aegismesh
kubectl get ingress -n aegismesh
kubectl logs deployment/backend -n aegismesh
```

## 7. Access the App

Get Minikube IP:

```powershell
minikube ip
```

Add a hosts entry (Windows file: C:\Windows\System32\drivers\etc\hosts):

```text
<MINIKUBE_IP> aegismesh.local
```

Then open:

- http://aegismesh.local

## Notes

- Backend runs `npx prisma migrate deploy` in an initContainer, so migrations are applied before app start.
- Postgres data persists via PVC (`postgres-data`).
- Ingress routes:
  - `/api` and `/uploads` -> backend service
  - `/` -> frontend service

## Cleanup

```powershell
kubectl delete -k .\k8s
```
