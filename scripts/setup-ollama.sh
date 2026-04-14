#!/bin/sh
# Pull Ollama model after container is running
echo "Waiting for Ollama to be ready..."
until docker exec nckhai-ollama ollama list 2>/dev/null; do
  sleep 2
done

MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
echo "Pulling model: $MODEL ..."
docker exec nckhai-ollama ollama pull "$MODEL"
echo "Done! Model $MODEL is ready."
