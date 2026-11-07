from datetime import datetime
from typing import Optional, List, Any, Generic, TypeVar
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Request successful"
    data: Optional[T] = None


class APIErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[Any] = None


class IncidentAnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Brief summary of the incident")
    service: str = Field(..., min_length=1, max_length=100, description="Affected service or component name")
    environment: str = Field(..., min_length=1, max_length=50, description="Environment where incident occurred")
    error_message: str = Field(..., min_length=3, description="Exact error message or exception header")
    logs: Optional[str] = Field(None, description="Relevant stack traces or error logs")


class IncidentConfirmRequest(BaseModel):
    root_cause: str = Field(..., min_length=3, description="Confirmed root cause identified by engineering team")
    resolution: str = Field(..., min_length=3, description="Verified steps taken to resolve the incident")


class AIDiagnosisSchema(BaseModel):
    summary: str = Field(..., description="High-level incident summary")
    possible_root_cause: str = Field(..., description="AI diagnosis of possible root causes")
    historical_context: str = Field(..., description="Historical context derived from past incident memories")
    recommended_steps: List[str] = Field(default_factory=list, description="Prescribed investigation or remediation steps")
    memory_used: bool = Field(False, description="Whether previous incidents were retrieved and factored into diagnosis")
    related_memories: List[Any] = Field(default_factory=list, description="Historical incident memories referenced")


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_code: str
    title: str
    service: str
    environment: str
    error_message: str
    logs: Optional[str] = None
    ai_diagnosis: Optional[AIDiagnosisSchema] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    status: str
    memory_retained: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None


class IncidentAnalyzeResult(BaseModel):
    incident: IncidentResponse
    diagnosis: AIDiagnosisSchema
    historical_memories: List[Any]
    hindsight_status: dict[str, Any]


class IncidentConfirmResult(BaseModel):
    incident: IncidentResponse
    memory_retained: bool
    retention_details: Optional[dict[str, Any]] = None


class PaginatedIncidentsData(BaseModel):
    items: List[IncidentResponse]
    total: int
    page: int
    limit: int
    total_pages: int
