import os
import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
if os.getenv("DD_APM_ENABLED") == "true":
    from ddtrace import patch_all; patch_all()
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import APIKeyHeader
from .models import AnalyzeRequest, AnalyzeResponse, HealthResponse, TrainResponse
from .anomaly_detector import AnomalyDetector
from prometheus_client import Counter, Histogram, Gauge, make_asgi_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY_HEADER = APIKeyHeader(name="X-Api-Key", auto_error=False)
SECURITY_ENGINE_API_KEY = os.getenv("SECURITY_ENGINE_API_KEY", "")


def verify_api_key(api_key: str = Depends(API_KEY_HEADER)):
    if not api_key or api_key != SECURITY_ENGINE_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")


_rate_limit_store = defaultdict(list)


def _check_rate_limit(ip: str, max_requests: int = 100, window: int = 60):
    now = time.time()
    timestamps = _rate_limit_store[ip]
    while timestamps and timestamps[0] < now - window:
        timestamps.pop(0)
    if len(timestamps) >= max_requests:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    timestamps.append(now)


def rate_limit(request: Request):
    _check_rate_limit(request.client.host)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan handler — runs startup logic then yields."""
    if not SECURITY_ENGINE_API_KEY:
        raise RuntimeError("SECURITY_ENGINE_API_KEY environment variable is required")
    sync_metrics()
    yield


app = FastAPI(title="AegisMesh Security Engine", lifespan=lifespan)

# Metrics
RISK_SCORE = Histogram(
    "security_engine_risk_score",
    "Risk score predicted by the model",
    buckets=[
        0.1,
        0.3,
        0.5,
        0.7,
        0.9,
        1.0])
PREDICTION_LATENCY = Histogram(
    "security_engine_prediction_duration_seconds",
    "Total time spent processing risk prediction",
    buckets=[
        0.01,
        0.05,
        0.1,
        0.5,
        1.0,
        2.0,
        5.0])
PREP_LATENCY = Histogram(
    "security_engine_preprocessing_duration_seconds",
    "Time spent in feature engineering",
    buckets=[
        0.001,
        0.005,
        0.01,
        0.05,
        0.1])
INF_LATENCY = Histogram(
    "security_engine_inference_duration_seconds",
    "Time spent in model inference",
    buckets=[
        0.001,
        0.005,
        0.01,
        0.05,
        0.1])
PREDICTION_COUNTER = Counter("security_engine_predictions_total",
                             "Total number of risk predictions", ["outcome", "version"])
MODEL_INFO = Gauge("security_engine_model_info", "Metadata about the active model", ["version"])

detector = AnomalyDetector()


def sync_metrics():
    # Reset model info gauge and set current version
    MODEL_INFO.clear()
    MODEL_INFO.labels(version=detector.active_version).set(1)


# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/health", response_model=HealthResponse, responses={
    500: {"description": "Internal Server Error"}})
def health(_auth = Depends(verify_api_key)):
    return {
        "status": "healthy",
        "model_loaded": detector.model is not None,
        "active_version": detector.active_version
    }


@app.post("/analyze", response_model=AnalyzeResponse, responses={
    400: {"description": "Bad Request"},
    500: {"description": "Internal Server Error"}})
async def analyze(data: AnalyzeRequest, _auth = Depends(verify_api_key), _rl = Depends(rate_limit)):
    start_total = time.time()
    try:
        risk_score, prep_time, inf_time = detector.predict_risk(data.model_dump())
    except Exception:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail="Prediction failed")
    total_duration = time.time() - start_total

    # Record detailed metrics
    RISK_SCORE.observe(risk_score)
    PREDICTION_LATENCY.observe(total_duration)
    PREP_LATENCY.observe(prep_time)
    INF_LATENCY.observe(inf_time)

    outcome = "anomalous" if risk_score > 0.7 else "normal"
    PREDICTION_COUNTER.labels(outcome=outcome, version=detector.active_version).inc()

    return {
        "risk_score": risk_score,
        "is_anomaly": risk_score > 0.7,
        "analysis_time_ms": total_duration * 1000,
        "active_version": detector.active_version
    }


@app.post("/train", response_model=TrainResponse, responses={
    500: {"description": "Internal Server Error"}})
def train(_auth = Depends(verify_api_key)):
    try:
        detector.train()
        sync_metrics()
        return {"message": "Model trained successfully", "new_version": detector.active_version}
    except Exception:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail="Training failed")


if __name__ == "__main__":
    import uvicorn
    # Host is configurable via DD_BIND_HOST; defaults to 127.0.0.1 for local dev.
    # In Kubernetes, the Deployment sets DD_BIND_HOST=0.0.0.0 so the pod is
    # reachable through the Service — external exposure is handled by the Service,
    # not by this process directly.
    _host = os.getenv("DD_BIND_HOST", "127.0.0.1")
    uvicorn.run(app, host=_host, port=int(os.getenv("PORT", "8000")))
