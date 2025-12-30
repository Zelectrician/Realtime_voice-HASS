#!/usr/bin/with-contenv bashio
set -e

export PYTHONUNBUFFERED=1

export OPENAI_API_KEY="$(bashio::config 'api_key')"
export OPENAI_MODEL="$(bashio::config 'model')"
export OPENAI_VOICE="$(bashio::config 'voice')"
export OPENAI_INSTRUCTIONS="$(bashio::config 'instructions')"
export OPENAI_TEMPERATURE="$(bashio::config 'temperature')"

bashio::log.info "Starting OpenAI Realtime Speech add-on..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8099
