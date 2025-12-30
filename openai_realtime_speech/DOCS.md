# OpenAI Realtime Speech (WebRTC)

## Setup
1. Install the add-on repository in Home Assistant.
2. Open the add-on configuration and set `api_key`.
3. Start the add-on.
4. Open the UI via Ingress.

## Security model
- Your long-lived OpenAI API key is stored in the add-on options.
- The browser requests a short-lived `client_secret` from the add-on.
- The browser uses that secret to establish a WebRTC call with OpenAI.

## Troubleshooting
- Ensure microphone permissions are allowed.
- If audio does not play, check browser autoplay settings.
- If your environment uses an external reverse proxy, ensure it supports WebRTC-related traffic and upgrades as needed.
