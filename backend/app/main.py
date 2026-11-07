import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.connection import init_db
from app.services.hindsight_service import hindsight_service
from app.utils.exceptions import register_exception_handlers
from app.routes.incident_routes import router as incident_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.memory_routes import router as memory_router
from app.routes.health_routes import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fixback-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FixBack AI Backend...")
    # Initialize Database Tables
    init_db()

    # Attempt to initialize Hindsight memory bank if credentials are provided
    if hindsight_service.is_configured():
        bank_res = hindsight_service.initialize_bank()
        logger.info("Hindsight bank initialization result: %s", bank_res.get("status", "unknown"))
    else:
        logger.info("Hindsight credentials not configured yet. Memory bank initialization skipped.")

    yield

    logger.info("Shutting down FixBack AI Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FixBack AI: AI-powered engineering incident memory platform powered by Hindsight Cloud and Groq SRE intelligence.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Register Exception Handlers
register_exception_handlers(app)

# Register CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routes under /api prefix
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(incident_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(memory_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
def root():
    return {
        "success": True,
        "message": f"{settings.APP_NAME} v{settings.APP_VERSION} is operational",
        "documentation": "/docs",
        "endpoints": {
            "health": f"{settings.API_PREFIX}/health",
            "incidents": f"{settings.API_PREFIX}/incidents",
            "analyze": f"{settings.API_PREFIX}/incidents/analyze",
            "confirm": f"{settings.API_PREFIX}/incidents/{{incident_id}}/confirm",
            "dashboard_stats": f"{settings.API_PREFIX}/dashboard/stats",
            "memory_search": f"{settings.API_PREFIX}/memory/search",
        },
    }
