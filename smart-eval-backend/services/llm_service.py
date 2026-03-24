"""
LLM Service

Grades student answers against model answers using an LLM.
Supports the same 4 providers as OCR service:
  - 'ollama'      : Ollama native API
  - 'openai'      : OpenAI-compatible API (LM Studio, vLLM, etc.)
  - 'lmstudio'    : LM Studio native API
  - 'openrouter'  : OpenRouter API (cloud, free tier available)

Configure via environment variables:
  LLM_PROVIDER, LLM_API_URL, LLM_MODEL, OPENROUTER_API_KEY
"""

import json
import requests
from flask import current_app
from utils.exceptions import ValidationError


class LLMService:
    """Grades student answers via a configurable LLM provider."""

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    @staticmethod
    def grade_answer(student_text: str, model_answer: str, max_marks: float,
                     strictness: str = 'moderate',
                     keywords: list = None, concepts: list = None,
                     question_number: int = 1) -> dict:
        """
        Grade a single student answer against the model answer.

        Returns dict:
            marks_awarded, max_marks, feedback, confidence,
            keywords_found, keywords_missing, concepts_covered, concepts_missing
        """
        provider = current_app.config.get('LLM_PROVIDER', 'ollama')
        api_url = current_app.config.get('LLM_API_URL')
        model = current_app.config.get('LLM_MODEL')

        prompt = LLMService._build_grading_prompt(
            student_text=student_text,
            model_answer=model_answer,
            max_marks=max_marks,
            strictness=strictness,
            keywords=keywords or [],
            concepts=concepts or [],
            question_number=question_number,
        )

        print(f"[LLMService] Grading Q{question_number} via {provider} ({model})")

        if provider == 'openrouter':
            api_key = current_app.config.get('OPENROUTER_API_KEY')
            raw = LLMService._call_openrouter(api_url, model, prompt, api_key)
        elif provider == 'openai':
            raw = LLMService._call_openai(api_url, model, prompt)
        elif provider == 'lmstudio':
            raw = LLMService._call_lmstudio(api_url, model, prompt)
        else:
            raw = LLMService._call_ollama(api_url, model, prompt)

        return LLMService._parse_grading_response(raw, max_marks, keywords or [], concepts or [])

    @staticmethod
    def grade_full_sheet(ocr_text: str, parsed_answers: list,
                         strictness: str = 'moderate') -> list:
        """
        Grade all questions for a single answer sheet.

        Args:
            ocr_text: Full OCR-extracted text (all pages concatenated)
            parsed_answers: list of dict with question_number, max_marks, answer_text, keywords, concepts
            strictness: 'lenient', 'moderate', or 'strict'

        Returns:
            list of per-question result dicts
        """
        results = []
        for pa in parsed_answers:
            result = LLMService.grade_answer(
                student_text=ocr_text,
                model_answer=pa.get('answer_text', ''),
                max_marks=pa.get('max_marks', 0),
                strictness=strictness,
                keywords=pa.get('keywords', []),
                concepts=pa.get('concepts', []),
                question_number=pa.get('question_number', 1),
            )
            results.append(result)
        return results

    # -----------------------------------------------------------------
    # Prompt engineering
    # -----------------------------------------------------------------

    @staticmethod
    def _build_grading_prompt(student_text: str, model_answer: str,
                               max_marks: float, strictness: str,
                               keywords: list, concepts: list,
                               question_number: int) -> str:

        strictness_guide = {
            'lenient': "Be generous with partial credit. Award marks if the student shows understanding even with minor errors or missing details.",
            'moderate': "Award marks fairly. Give partial credit for partial understanding, but deduct for significant gaps or errors.",
            'strict': "Be rigorous. Only award marks for precise, complete, and accurate answers. Deduct points for any inaccuracies.",
        }

        prompt = f"""You are an expert exam grader. Grade the following student answer for Question {question_number}.

GRADING STRICTNESS: {strictness.upper()}
{strictness_guide.get(strictness, strictness_guide['moderate'])}

MAXIMUM MARKS: {max_marks}

MODEL ANSWER:
{model_answer}

KEYWORDS TO CHECK: {', '.join(keywords) if keywords else 'None specified'}
CONCEPTS TO CHECK: {', '.join(concepts) if concepts else 'None specified'}

STUDENT'S ANSWER (extracted via OCR from handwritten sheet):
{student_text}

INSTRUCTIONS:
1. Compare the student answer with the model answer.
2. Check for presence of the listed keywords and concepts.
3. Award marks out of {max_marks} based on correctness, completeness, and the strictness level.
4. Provide brief, constructive feedback (max 100 words).

RESPOND IN EXACTLY THIS JSON FORMAT (no extra text before or after):
{{
  "question_number": {question_number},
  "marks_awarded": <number between 0 and {max_marks}>,
  "max_marks": {max_marks},
  "feedback": "<brief constructive feedback>",
  "confidence": <number between 0.0 and 1.0>,
  "keywords_found": [<list of keywords found in student answer>],
  "keywords_missing": [<list of keywords missing from student answer>],
  "concepts_covered": [<list of concepts the student covered>],
  "concepts_missing": [<list of concepts the student missed>]
}}"""
        return prompt

    # -----------------------------------------------------------------
    # Provider implementations
    # -----------------------------------------------------------------

    @staticmethod
    def _call_ollama(api_url: str, model: str, prompt: str) -> str:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
        try:
            resp = requests.post(api_url, json=payload, timeout=300)
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")
        except requests.exceptions.ConnectionError:
            raise ValidationError(f"Cannot connect to Ollama at {api_url}. Is the server running?")
        except requests.exceptions.Timeout:
            raise ValidationError("LLM request timed out (5 min).")
        except Exception as e:
            raise ValidationError(f"LLM grading failed: {str(e)}")

    @staticmethod
    def _call_openai(api_url: str, model: str, prompt: str) -> str:
        url = api_url.rstrip('/')
        if not url.endswith('/chat/completions'):
            url += '/chat/completions'

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096,
            "temperature": 0.1,
            "stream": False
        }
        try:
            resp = requests.post(url, json=payload, timeout=300)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.ConnectionError:
            raise ValidationError(f"Cannot connect to LLM API at {url}. Is the server running?")
        except requests.exceptions.Timeout:
            raise ValidationError("LLM request timed out (5 min).")
        except Exception as e:
            raise ValidationError(f"LLM grading failed: {str(e)}")

    @staticmethod
    def _call_lmstudio(api_url: str, model: str, prompt: str) -> str:
        url = api_url.rstrip('/')
        if not url.endswith('/api/v1/chat'):
            url = url.rstrip('/') + '/api/v1/chat'

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "stream": False
        }
        try:
            resp = requests.post(url, json=payload, timeout=300)
            resp.raise_for_status()
            data = resp.json()
            # LM Studio may return in different formats
            if "choices" in data:
                return data["choices"][0]["message"]["content"]
            return data.get("message", {}).get("content", "")
        except requests.exceptions.ConnectionError:
            raise ValidationError(f"Cannot connect to LM Studio at {url}. Is the server running?")
        except requests.exceptions.Timeout:
            raise ValidationError("LLM request timed out (5 min).")
        except Exception as e:
            raise ValidationError(f"LLM grading failed: {str(e)}")

    @staticmethod
    def _call_openrouter(api_url: str, model: str, prompt: str, api_key: str) -> str:
        if not api_key:
            raise ValidationError("OPENROUTER_API_KEY is required for OpenRouter provider.")

        url = api_url.rstrip('/') + '/chat/completions'

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096,
            "temperature": 0.1,
            "stream": False
        }
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=300)
            print(f"[LLMService] OpenRouter status={resp.status_code}")
            if resp.status_code != 200:
                print(f"[LLMService] OpenRouter error body: {resp.text[:500]}")
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.ConnectionError:
            raise ValidationError("Cannot connect to OpenRouter API. Check your internet.")
        except requests.exceptions.Timeout:
            raise ValidationError("OpenRouter request timed out (5 min).")
        except Exception as e:
            raise ValidationError(f"LLM grading failed: {str(e)}")

    # -----------------------------------------------------------------
    # Response parser
    # -----------------------------------------------------------------

    @staticmethod
    def _parse_grading_response(raw_text: str, max_marks: float,
                                 keywords: list, concepts: list) -> dict:
        """Parse the LLM JSON response into a structured grading result."""
        # Try to extract JSON from the response
        try:
            # Find JSON block — LLM may wrap it in markdown code fences
            text = raw_text.strip()
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                text = text.split('```')[1].split('```')[0].strip()

            # Find first { and last }
            start = text.index('{')
            end = text.rindex('}') + 1
            json_str = text[start:end]

            result = json.loads(json_str)

            # Clamp marks to valid range
            marks = float(result.get('marks_awarded', 0))
            marks = max(0.0, min(marks, max_marks))

            return {
                'question_number': int(result.get('question_number', 1)),
                'marks_awarded': marks,
                'max_marks': max_marks,
                'feedback': str(result.get('feedback', '')),
                'confidence': float(result.get('confidence', 0.5)),
                'keywords_found': result.get('keywords_found', []),
                'keywords_missing': result.get('keywords_missing', []),
                'concepts_covered': result.get('concepts_covered', []),
                'concepts_missing': result.get('concepts_missing', []),
            }
        except (json.JSONDecodeError, ValueError, IndexError) as e:
            print(f"[LLMService] Failed to parse LLM response: {e}")
            print(f"[LLMService] Raw response: {raw_text[:500]}")
            # Return a safe fallback
            return {
                'question_number': 1,
                'marks_awarded': 0.0,
                'max_marks': max_marks,
                'feedback': f'LLM response could not be parsed. Raw: {raw_text[:200]}',
                'confidence': 0.0,
                'keywords_found': [],
                'keywords_missing': keywords,
                'concepts_covered': [],
                'concepts_missing': concepts,
            }

