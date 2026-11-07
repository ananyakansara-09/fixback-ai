from fastapi import APIRouter, Query, status

from app.schemas.incident import APIResponse
from app.schemas.memory import MemorySearchData, MemoryItem
from app.services.hindsight_service import hindsight_service
from app.utils.exceptions import ValidationError

router = APIRouter(prefix="/memory", tags=["Memory"])


@router.get(
    "/search",
    response_model=APIResponse[MemorySearchData],
    status_code=status.HTTP_200_OK,
    summary="Memory Search",
    description="Search retained engineering memories in Hindsight Cloud using semantic and keyword recall.",
)
def search_memories(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit: int = Query(10, ge=1, le=50, description="Max memories to return"),
):
    if not q or not q.strip():
        raise ValidationError("Query parameter 'q' must not be empty.")

    result = hindsight_service.recall_incidents(query=q.strip(), limit=limit)
    raw_memories = result.get("memories", [])

    memory_items = [
        MemoryItem(
            id=mem.get("id"),
            content=mem.get("content", ""),
            memory_type=mem.get("memory_type"),
            metadata=mem.get("metadata"),
            context=mem.get("context"),
            tags=mem.get("tags"),
        )
        for mem in raw_memories
    ]

    response_data = MemorySearchData(
        query=q.strip(),
        count=len(memory_items),
        memories=memory_items,
    )

    msg = (
        f"Recalled {len(memory_items)} historical memories from Hindsight"
        if result.get("success")
        else f"Hindsight memory search failed or unconfigured: {result.get('error')}"
    )

    return APIResponse[MemorySearchData](
        success=result.get("success", False),
        message=msg,
        data=response_data,
    )
