param(
    [string]$Namespace = "aegismesh",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

Write-Host "Starting Minikube (if not running)..."
minikube start | Out-Host

Write-Host "Ensuring ingress addon is enabled..."
minikube addons enable ingress | Out-Host

if (-not $SkipBuild) {
    Write-Host "Building backend image in Minikube runtime..."
    minikube image build -t aegismesh-backend:local (Join-Path $RepoRoot "backend") | Out-Host

    Write-Host "Building frontend image in Minikube runtime..."
    minikube image build -t aegismesh-frontend:local (Join-Path $RepoRoot "frontend") | Out-Host
}

Write-Host "Applying Kubernetes manifests..."
kubectl apply -k $ScriptDir | Out-Host

Write-Host "Current resources in namespace $Namespace:"
kubectl get all -n $Namespace | Out-Host
kubectl get ingress -n $Namespace | Out-Host

$ip = minikube ip
Write-Host "`nMinikube IP: $ip"
Write-Host "Add this to your hosts file:"
Write-Host "$ip aegismesh.local"
Write-Host "Then open http://aegismesh.local"
