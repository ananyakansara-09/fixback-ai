from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.incident import IncidentResponse


class IncidentOverTimeItem(BaseModel):
    date: str
    count: int


class ActivityItem(BaseModel):
    id: str
    incident_code: str
    title: str
    service: str
    action: str
    timestamp: datetime
    details: Optional[str] = None


class DashboardStatsData(BaseModel):
    total_incidents: int = Field(..., description="Total number of recorded incidents")
    resolved_incidents: int = Field(..., description="Number of fully resolved incidents")
    pending_incidents: int = Field(..., description="Incidents awaiting resolution confirmation")
    analyzing_incidents: int = Field(..., description="Incidents actively being analyzed")
    successfully_retained_memories: int = Field(
        ..., description="Number of incidents retained into Hindsight memory"
    )
    incidents_by_status: Dict[str, int] = Field(
        ..., description="Count of incidents grouped by status"
    )
    incidents_over_time: List[IncidentOverTimeItem] = Field(
        ..., description="Trend of incidents grouped by day"
    )
    recent_incidents: List[IncidentResponse] = Field(
        ..., description="List of most recently created incidents"
    )
    recent_activity: List[ActivityItem] = Field(
        ..., description="Chronological log of recent incident events"
    )
