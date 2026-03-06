import os
import sys

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import (  # noqa: E402
    ChatRequest,
    ChatResponse,
    ChatbotResponse,
    ComplaintRequest,
    HealthResponse,
)
from services.chatbot_service import ChatbotService  # noqa: E402

app = FastAPI(
    title="Justice AI",
    description="AI-powered legal guidance chatbot for Indian justice system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=HealthResponse)
def home():
    return {"status": "active", "message": "Justice AI Backend Running"}


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "healthy", "message": "Justice AI is operational"}


@app.post("/api/v1/chatbot/process", response_model=ChatbotResponse)
def process_complaint(request: ComplaintRequest):
    try:
        result = ChatbotService.process_complaint(request.complaint)
        return ChatbotResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing complaint: {str(e)}")


@app.get("/api/v1/chatbot/categories")
def get_categories():
    return {
        "categories": [
            "Cyber Fraud",
            "Harassment",
            "Domestic Violence",
            "Theft",
            "General Complaint",
        ]
    }


@app.post("/api/v1/chatbot/test")
def test_chatbot(request: ComplaintRequest):
    return process_complaint(request)


@app.post("/api/v1/chatbot/chat", response_model=ChatResponse)
def gpt_chat(request: ChatRequest):
    try:
        result = ChatbotService.chat_with_gpt(request.messages, request.model)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failure: {str(e)}")


# Optional Supabase-enabled routes. These are only enabled when all imports and
# environment variables are available.
SUPABASE_FEATURES_ENABLED = False

try:
    from routes.chat import router as chat_router  # noqa: E402
    from schemas.complaint import ComplaintCreate  # noqa: E402
    from services.supabase_client import supabase  # noqa: E402

    app.include_router(chat_router)
    SUPABASE_FEATURES_ENABLED = True
except Exception:
    supabase = None


if SUPABASE_FEATURES_ENABLED:
    @app.get("/test-db")
    def test_db():
        response = supabase.table("profiles").select("*").execute()
        return response.data


    @app.post("/create-complaint")
    def create_complaint(complaint: ComplaintCreate, authorization: str = Header(None)):
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        token = authorization.split(" ")[1]
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        strength_score, urgency_level = analyze_complaint(complaint.description)
        response = supabase.table("complaints").insert(
            {
                "user_id": user.id,
                "title": complaint.title,
                "description": complaint.description,
                "crime_type": complaint.crime_type,
                "jurisdiction": complaint.jurisdiction,
                "is_anonymous": complaint.is_anonymous,
                "case_strength_score": strength_score,
                "urgency_level": urgency_level,
                "status": "submitted",
            }
        ).execute()
        return response.data


    class LoginRequest(BaseModel):
        email: str
        password: str


    @app.post("/signup-test")
    def signup_test(data: LoginRequest):
        try:
            response = supabase.auth.sign_up(
                {
                    "email": data.email,
                    "password": data.password,
                }
            )
            return {"status": "success", "data": response}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")


    @app.post("/login-test")
    def login_test(data: LoginRequest):
        try:
            response = supabase.auth.sign_in_with_password(
                {
                    "email": data.email,
                    "password": data.password,
                }
            )
            return {"status": "success", "data": response}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")


    @app.get("/my-complaints")
    def get_my_complaints(authorization: str = Header(None)):
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        token = authorization.split(" ")[1]
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        response = (
            supabase.table("complaints")
            .select("*")
            .eq("user_id", user.id)
            .execute()
        )
        return response.data


def analyze_complaint(description: str):
    description = description.lower()
    strong_keywords = ["bribe", "corruption", "violence", "threat", "harassment"]
    urgent_keywords = ["immediately", "urgent", "life", "danger", "threat"]

    strength_score = 50
    urgency_level = "low"

    for word in strong_keywords:
        if word in description:
            strength_score += 10

    for word in urgent_keywords:
        if word in description:
            urgency_level = "high"

    return min(strength_score, 100), urgency_level
