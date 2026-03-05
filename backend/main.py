from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routes.chat import router as chat_router
from schemas.complaint import ComplaintCreate
from services.supabase_client import supabase
from pydantic import BaseModel

app = FastAPI(title="Justice AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include chat router
app.include_router(chat_router)

# Home route
@app.get("/")
def home():
    return {"message": "Justice AI Backend Running"}

# Test DB
@app.get("/test-db")
def test_db():
    response = supabase.table("profiles").select("*").execute()
    return response.data
@app.post("/create-complaint")
def create_complaint(
    complaint: ComplaintCreate,
    authorization: str = Header(None)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.split(" ")[1]
    user_response = supabase.auth.get_user(token)
    user = user_response.user

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 🔥 AI analysis happens here
    strength_score, urgency_level = analyze_complaint(complaint.description)

    response = supabase.table("complaints").insert({
        "user_id": user.id,
        "title": complaint.title,
        "description": complaint.description,
        "crime_type": complaint.crime_type,
        "jurisdiction": complaint.jurisdiction,
        "is_anonymous": complaint.is_anonymous,
        "case_strength_score": strength_score,
        "urgency_level": urgency_level,
        "status": "submitted"
    }).execute()

    return response.data
# LoginRequest model
class LoginRequest(BaseModel):
    email: str
    password: str

# Signup route (fixed, no duplicates)
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

# Login route
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
def analyze_complaint(description: str):

    description = description.lower()

    # Simple keyword-based scoring
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

    # Cap strength score at 100
    strength_score = min(strength_score, 100)

    return strength_score, urgency_level    
@app.get("/my-complaints")
def get_my_complaints(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.split(" ")[1]

    # Get logged-in user from Supabase
    user_response = supabase.auth.get_user(token)
    user = user_response.user

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Fetch complaints for this user only
    response = supabase.table("complaints") \
        .select("*") \
        .eq("user_id", user.id) \
        .execute()

    return response.data    