import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
import httpx

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-realtime")
DEFAULT_VOICE = os.getenv("OPENAI_VOICE", "marin")
DEFAULT_INSTRUCTIONS = os.getenv("OPENAI_INSTRUCTIONS", "You are a helpful voice assistant.")
DEFAULT_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))

OPENAI_BASE_URL = "https://api.openai.com/v1"

app = FastAPI(title="OpenAI Realtime Speech Add-on")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def root():
    return FileResponse("app/static/index.html")


@app.post("/api/session", response_class=PlainTextResponse)
async def create_session(req: Request):
    """
    Browser posts SDP offer (text/plain or application/sdp).
    Add-on creates a Realtime WebRTC call via OpenAI /v1/realtime/calls
    and returns SDP answer as plain text.

    This follows OpenAI's "unified interface" WebRTC pattern. :contentReference[oaicite:4]{index=4}
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured in add-on options.")

    offer_sdp = (await req.body()).decode("utf-8", errors="ignore").strip()
    if not offer_sdp.startswith("v="):
        raise HTTPException(status_code=400, detail="Invalid SDP offer posted to /api/session.")

    # Session config (same shape as documented for /v1/realtime/calls 'session' field). :contentReference[oaicite:5]{index=5}
    session = {
        "type": "realtime",
        "model": DEFAULT_MODEL,
        "instructions": DEFAULT_INSTRUCTIONS,
        "temperature": DEFAULT_TEMPERATURE,
        "audio": {"output": {"voice": DEFAULT_VOICE}},
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
    }

    files = {
        "sdp": ("offer.sdp", offer_sdp, "application/sdp"),
        "session": ("session.json", json.dumps(session), "application/json"),
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{OPENAI_BASE_URL}/realtime/calls", headers=headers, files=files)

    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {r.status_code} {r.text}")

    # OpenAI returns SDP answer as text. :contentReference[oaicite:6]{index=6}
    return r.text
