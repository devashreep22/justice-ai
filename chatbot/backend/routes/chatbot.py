from fastapi import APIRouter
from pydantic import BaseModel

from services.chatbot_service import ChatbotService


router = APIRouter()


class ProcessRequest(BaseModel):
    complaint: str


class ChatRequest(BaseModel):
    messages: list[dict]
    model: str = "gpt-3.5-turbo"


@router.post("/process")
def process_complaint(payload: ProcessRequest):
    return ChatbotService.process_complaint(payload.complaint)


@router.post("/chat")
def chat(payload: ChatRequest):
    return ChatbotService.chat_with_gpt(payload.messages, payload.model)
