import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import httpx

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-realtime")
DEFAULT_VOICE = os.getenv("OPENAI_VOICE", "marin")
DEFAULT_INSTRUCTIONS = os.getenv("OPENAI_INSTRUCTIONS", "You are a helpful voice assistant.")
DEFAULT_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))

OPENAI_BASE_URL = "https://api.openai.com/v1"

app = FastAPI(title="OpenAI Realtime Speech Add-on")

# Serve static UI
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def root():
    return FileResponse("app/static/index.html")


@app.post("/api/client_secret")
async def create_client_secret():
    """
    Generates an ephemeral client secret for browser WebRTC or WebSocket usage.
    This keeps the long-lived OPENAI_API_KEY on the server only.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured in add-on options.")

    payload = {
        "session": {
            "type": "realtime",
            "model": DEFAULT_MODEL,
            "instructions": DEFAULT_INSTRUCTIONS,
            "temperature": DEFAULT_TEMPERATURE,
            "audio": {
                "output": {"voice": DEFAULT_VOICE},
            },
        }
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{OPENAI_BASE_URL}/realtime/client_secrets", headers=headers, json=payload)

    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {r.status_code} {r.text}")

    data = r.json()
    # Return the minimal fields the frontend needs
    return {
        "client_secret": data.get("client_secret"),
        "model": DEFAULT_MODEL,
        "voice": DEFAULT_VOICE,
    }
