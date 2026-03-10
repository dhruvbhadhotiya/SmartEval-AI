# Project Architecture: Dual Offline LLM + Vision Pipeline

## Overview

Two laptops on the same WiFi/LAN, each running one dedicated Ollama model.
The pipeline extracts text from images (Vision) then analyses it (LLM) in a queue.

---

## Infrastructure

| Role | Machine | Model | Port |
|---|---|---|---|
| Vision (OCR/extraction) | Laptop A (RTX 4050) | `<VISION_MODEL>` | `11434` |
| LLM (analysis) | Laptop B (any) | `<LLM_MODEL>` | `11434` |

---

## Setup Instructions

### Laptop A — Vision Server

```bash
# Pull your chosen vision model
ollama pull <VISION_MODEL>

# Expose to network
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

### Laptop B — LLM Server

```bash
# Pull your chosen LLM model
ollama pull <LLM_MODEL>

# Expose to network
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

> Laptop B does not need a GPU. Ollama runs on CPU — slower but functional.

---

## API Endpoints

```
VISION_API = "http://<LAPTOP_A_IP>:11434/api/chat"
LLM_API    = "http://<LAPTOP_B_IP>:11434/api/chat"
```

Replace `<LAPTOP_A_IP>` and `<LAPTOP_B_IP>` with the actual local IPs (e.g. `192.168.1.x`).

---

## Pipeline Flow

```
[Input Image]
      │
      ▼
[Vision Model - Laptop A]
  → Extracts / OCRs text from image
      │
      ▼
[LLM Model - Laptop B]
  → Analyses extracted text
      │
      ▼
[Final Output]
```

---

## Python Integration

```python
import requests
import base64

VISION_API = "http://192.168.x.x:11434/api/chat"   # Laptop A
LLM_API    = "http://192.168.y.y:11434/api/chat"   # Laptop B

def load_image_b64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def extract_text(image_b64: str) -> str:
    response = requests.post(VISION_API, json={
        "model": "<VISION_MODEL>",
        "messages": [
            {
                "role": "user",
                "content": "Extract all text from this image accurately.",
                "images": [image_b64]
            }
        ],
        "stream": False
    })
    return response.json()["message"]["content"]

def analyse_text(text: str) -> str:
    response = requests.post(LLM_API, json={
        "model": "<LLM_MODEL>",
        "messages": [
            {
                "role": "user",
                "content": f"Analyse the following extracted text:\n\n{text}"
            }
        ],
        "stream": False
    })
    return response.json()["message"]["content"]

def pipeline(image_path: str) -> str:
    image_b64 = load_image_b64(image_path)
    extracted_text = extract_text(image_b64)   # Step 1: Vision
    analysis = analyse_text(extracted_text)    # Step 2: LLM
    return analysis
```

---

## If Not on Same Network (Remote Access)

Use **ngrok** on each laptop to expose ports publicly:

```bash
# On Laptop A
ngrok http 11434   # → https://abc123.ngrok.io

# On Laptop B
ngrok http 11434   # → https://xyz456.ngrok.io
```

Then update your endpoints:
```python
VISION_API = "https://abc123.ngrok.io/api/chat"
LLM_API    = "https://xyz456.ngrok.io/api/chat"
```

---

## Model Placeholders

Set these before running:

```python
VISION_MODEL = "<your-vision-model>"   # e.g. any multimodal Ollama model
LLM_MODEL    = "<your-llm-model>"      # e.g. any instruct/chat Ollama model
```

Check available models at: https://ollama.com/library

**What to look for:**
- Vision model: must support `images` field in Ollama API (multimodal)
- LLM model: any instruct/chat model works; pick based on your VRAM/RAM on Laptop B

---

## Key Constraints

- Both laptops must be on the **same WiFi/LAN** for direct IP access
- Laptop A (RTX 4050, 6GB VRAM) — runs vision model on GPU
- Laptop B — can run on CPU; expect slower inference (~2–5x slower than GPU)
- No internet required once models are downloaded
- Models run sequentially in the pipeline (vision → LLM), not truly parallel
