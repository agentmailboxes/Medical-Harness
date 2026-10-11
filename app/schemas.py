from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.tools.anatomy import AnatomyContext


class ChatRequest(BaseModel):
    conversation: list[str] = Field(..., min_length=1)
    conversation_id: str | None = Field(default=None, max_length=128)


class ChatResponse(BaseModel):
    type: Literal["follow_up", "answer", "emergency", "conversation"]
    follow_up_questions: list[str] = []
    preliminary_info: str = ""
    answer: str | None = None
    articles: list[dict] = []
    tool_results: list[dict] = []
    followups: list[str] = []
    conversation_id: str
    anatomy_context: AnatomyContext | None = None
    evidence_status: str = "available"
    emergency: bool = False
    emergency_message: str = ""
