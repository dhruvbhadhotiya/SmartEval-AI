"""
OCR Service

Extracts text from answer sheet images using a Vision model.
Supports five providers:
  - 'ollama'      : Ollama native API (POST /api/chat with images[] field)
  - 'openai'      : OpenAI-compatible API (POST /v1/chat/completions)
  - 'lmstudio'    : LM Studio native API (POST /api/v1/chat with input[] field)
  - 'openrouter'  : OpenRouter API (OpenAI-compatible with API key)
  - 'groqcloud'   : Groq Cloud API (OpenAI-compatible with API key)

Configure via environment variables:
  VISION_PROVIDER, VISION_API_URL, VISION_MODEL, OPENROUTER_API_KEY, GROQ_API_KEY
"""

import base64
import io
import os
import requests
from flask import current_app
from datetime import datetime

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from utils.exceptions import ValidationError


class OCRService:
    """Extracts text from images via a configurable Vision model."""

    SUPPORTED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    @staticmethod
    def extract_text(image_path: str) -> list:
        """
        Extract text from an image or PDF file.

        Args:
            image_path: Absolute path to the image/PDF file on disk.

        Returns:
            list of dicts, one per page:
                [{page_number, text, confidence, processed_at}, ...]
        """
        if not os.path.exists(image_path):
            raise ValidationError(f"Image file not found: {image_path}")

        ext = image_path.rsplit('.', 1)[-1].lower()
        if ext not in OCRService.SUPPORTED_EXTENSIONS:
            raise ValidationError(
                f"Unsupported file type '.{ext}'. Supported: {OCRService.SUPPORTED_EXTENSIONS}"
            )

        # PDFs must be converted to images first
        if ext == 'pdf':
            pages_b64 = OCRService._pdf_to_images_b64(image_path)
        else:
            pages_b64 = [(OCRService._load_image_b64(image_path), 'image/png' if ext == 'png' else 'image/jpeg')]

        provider = current_app.config.get('VISION_PROVIDER', 'ollama')
        api_url = current_app.config.get('VISION_API_URL')
        model = current_app.config.get('VISION_MODEL')

        results = []
        for idx, (image_b64, mime_type) in enumerate(pages_b64):
            print(f"[OCRService] Processing page {idx + 1}/{len(pages_b64)}")
            if provider == 'groqcloud':
                api_key = current_app.config.get('GROQ_API_KEY')
                groq_model = current_app.config.get('GROQ_VISION_MODEL', model)
                text = OCRService._call_groqcloud(groq_model, image_b64, mime_type, api_key)
            elif provider == 'openrouter':
                api_key = current_app.config.get('OPENROUTER_API_KEY')
                text = OCRService._call_openrouter(api_url, model, image_b64, mime_type, api_key)
            elif provider == 'openai':
                text = OCRService._call_openai(api_url, model, image_b64, mime_type)
            elif provider == 'lmstudio':
                text = OCRService._call_lmstudio(api_url, model, image_b64, mime_type)
            else:
                text = OCRService._call_ollama(api_url, model, image_b64)
            results.append({
                'page_number': idx + 1,
                'text': text,
                'confidence': 1.0,
                'processed_at': datetime.utcnow()
            })

        return results

    @staticmethod
    def extract_text_from_multiple(image_paths: list) -> list:
        """Extract text from multiple files. Each file may produce multiple pages."""
        results = []
        for path in image_paths:
            results.extend(OCRService.extract_text(path))
        return results

    # -----------------------------------------------------------------
    # Provider implementations
    # -----------------------------------------------------------------

    @staticmethod
    def _call_ollama(api_url: str, model: str, image_b64: str) -> str:
        """Call Ollama native chat API with image."""
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "Extract all handwritten and printed text from this image accurately. "
                        "Preserve the structure: if answers are labeled by question numbers "
                        "(e.g., Q1, Q2, Ans 1, 1., 1)), keep those labels intact. "
                        "Return only the extracted text, no commentary."
                    ),
                    "images": [image_b64]
                }
            ],
            "stream": False
        }

        try:
            resp = requests.post(api_url, json=payload, timeout=600)
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")
        except requests.exceptions.ConnectionError:
            raise ValidationError(
                f"Cannot connect to Ollama at {api_url}. Is the server running?"
            )
        except requests.exceptions.Timeout:
            raise ValidationError("Vision model request timed out (10 min).")
        except Exception as e:
            raise ValidationError(f"OCR extraction failed: {str(e)}")

    @staticmethod
    def _call_openai(api_url: str, model: str, image_b64: str, mime_type: str) -> str:
        """Call OpenAI-compatible chat completions API (LM Studio, vLLM, etc.)."""
        if not api_url.rstrip('/').endswith('/chat/completions'):
            api_url = api_url.rstrip('/') + '/chat/completions'

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Extract all handwritten and printed text from this image accurately. "
                                "Preserve the structure: if answers are labeled by question numbers "
                                "(e.g., Q1, Q2, Ans 1, 1., 1)), keep those labels intact. "
                                "Return only the extracted text, no commentary."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 7096,
            "stream": False
        }

        try:
            resp = requests.post(api_url, json=payload, timeout=600)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.ConnectionError:
            raise ValidationError(
                f"Cannot connect to Vision API at {api_url}. Is the server running?"
            )
        except requests.exceptions.Timeout:
            raise ValidationError("Vision model request timed out (10 min).")
        except Exception as e:
            raise ValidationError(f"OCR extraction failed: {str(e)}")

    @staticmethod
    def _call_openrouter(api_url: str, model: str, image_b64: str, mime_type: str, api_key: str) -> str:
        """Call OpenRouter API (OpenAI-compatible with API key auth)."""
        if not api_key:
            raise ValidationError("OPENROUTER_API_KEY is required for OpenRouter provider.")

        url = api_url.rstrip('/') + '/chat/completions'

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Extract all handwritten and printed text from this image accurately. "
                                "Preserve the structure: if answers are labeled by question numbers "
                                "(e.g., Q1, Q2, Ans 1, 1., 1)), keep those labels intact. "
                                "Return only the extracted text, no commentary."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 7096,
            "stream": False
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=600)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.ConnectionError:
            raise ValidationError("Cannot connect to OpenRouter API. Check your internet connection.")
        except requests.exceptions.Timeout:
            raise ValidationError("OpenRouter request timed out (10 min).")
        except Exception as e:
            raise ValidationError(f"OCR extraction failed: {str(e)}")

    # -----------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------

    @staticmethod
    def _call_groqcloud(model: str, image_b64: str, mime_type: str, api_key: str) -> str:
        """Call Groq Cloud API (OpenAI-compatible with API key auth)."""
        if not api_key:
            raise ValidationError("GROQ_API_KEY is required for Groq Cloud provider.")

        url = "https://api.groq.com/openai/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Extract all handwritten and printed text from this image accurately. "
                                "Preserve the structure: if answers are labeled by question numbers "
                                "(e.g., Q1, Q2, Ans 1, 1., 1)), keep those labels intact. "
                                "Return only the extracted text, no commentary."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 1,
            "max_completion_tokens": 1024,
            "top_p": 1,
            "stream": False
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=600)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.ConnectionError:
            raise ValidationError("Cannot connect to Groq Cloud API. Check your internet connection.")
        except requests.exceptions.Timeout:
            raise ValidationError("Groq Cloud request timed out (10 min).")
        except Exception as e:
            raise ValidationError(f"OCR extraction failed: {str(e)}")

    @staticmethod
    def _call_lmstudio(api_url: str, model: str, image_b64: str, mime_type: str) -> str:
        """Call LM Studio native API (POST /api/v1/chat)."""
        # Ensure URL ends with /api/v1/chat
        if not api_url.rstrip('/').endswith('/api/v1/chat'):
            api_url = api_url.rstrip('/') + '/api/v1/chat'

        payload = {
            "model": model,
            "input": [
                {
                    "type": "text",
                    "content": (
                        "Extract all handwritten and printed text from this image accurately. "
                        "Preserve the structure: if answers are labeled by question numbers "
                        "(e.g., Q1, Q2, Ans 1, 1., 1)), keep those labels intact. "
                        "Return only the extracted text, no commentary."
                    )
                },
                {
                    "type": "image",
                    "data_url": f"data:{mime_type};base64,{image_b64}"
                }
            ],
            "temperature": 0,
            "stream": False
        }

        try:
            resp = requests.post(api_url, json=payload, timeout=600)
            resp.raise_for_status()
            data = resp.json()
            # LM Studio native response: {"message": "...", ...} or {"choices": [...]}
            if "message" in data:
                return data["message"] if isinstance(data["message"], str) else data["message"].get("content", "")
            if "choices" in data:
                return data["choices"][0]["message"]["content"]
            return str(data)
        except requests.exceptions.ConnectionError:
            raise ValidationError(
                f"Cannot connect to LM Studio at {api_url}. Is the server running?"
            )
        except requests.exceptions.Timeout:
            raise ValidationError("Vision model request timed out (10 min).")
        except Exception as e:
            raise ValidationError(f"OCR extraction failed: {str(e)}")

    @staticmethod
    def _load_image_b64(image_path: str) -> str:
        """Read a file and return its base64-encoded string."""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    @staticmethod
    def _pdf_to_images_b64(pdf_path: str) -> list:
        """
        Convert each page of a PDF to a PNG image.
        Returns list of (base64_str, mime_type) tuples.
        Requires PyMuPDF (fitz).
        """
        if not HAS_PYMUPDF:
            raise ValidationError(
                "PyMuPDF is required for PDF processing. "
                "Install it with: pip install PyMuPDF"
            )

        doc = fitz.open(pdf_path)
        pages = []
        for page in doc:
            # Render at 200 DPI for good OCR quality
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            pages.append((b64, "image/png"))
        doc.close()
        print(f"[OCRService] Converted PDF to {len(pages)} page image(s)")
        return pages
