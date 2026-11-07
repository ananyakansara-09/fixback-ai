from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class MemoryItem(BaseModel):
    id: Optional[str] = None
    content: str = Field(..., description="The recalled memory text")
    memory_type: Optional[str] = Field(None, description="Available type/category of the memory")
    metadata: Optional[Dict[str, Any]] = None
    context: Optional[str] = None
    tags: Optional[List[str]] = None


class MemorySearchData(BaseModel):
    query: str
    count: int
    memories: List[MemoryItem]
