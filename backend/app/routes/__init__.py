from app.routes.incident_routes import router as incident_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.memory_routes import router as memory_router
from app.routes.health_routes import router as health_router

__all__ = ["incident_router", "dashboard_router", "memory_router", "health_router"]
