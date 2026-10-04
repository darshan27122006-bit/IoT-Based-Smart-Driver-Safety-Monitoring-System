from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import connect_to_mongo, close_mongo_connection
from contextlib import asynccontextmanager
from routes.api import router as api_router
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smart_driver_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Smart Driver IoT Backend...")
    await connect_to_mongo()
    yield
    logger.info("Shutting down Smart Driver IoT Backend...")
    await close_mongo_connection()

app = FastAPI(
    title="Smart Driver IoT API",
    description="IoT-Based Smart Driver Safety and Driving Behavior Monitoring System API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes under /api
app.include_router(api_router)

# Root convenience redirect or status
@app.get("/")
async def root():
    return {
        "service": "Smart Driver IoT Backend",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
