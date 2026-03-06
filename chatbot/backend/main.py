from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.chat import router as chat_router
from routes.chatbot import router as chatbot_router


app = FastAPI(title="Justice AI Chatbot Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "chatbot-backend"}


app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(chatbot_router, prefix="/api/v1/chatbot", tags=["chatbot"])
