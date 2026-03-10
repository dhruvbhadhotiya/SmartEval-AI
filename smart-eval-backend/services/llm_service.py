"""
LLM Service (Sprint 5 Placeholder)

Will handle grading analysis by comparing OCR-extracted student answers
against model answers using an LLM.

Supports two providers (same abstraction as OCR service):
  - 'ollama'  : Ollama native API
  - 'openai'  : OpenAI-compatible API (LM Studio, vLLM, etc.)

Configure via environment variables:
  LLM_PROVIDER, LLM_API_URL, LLM_MODEL
"""


class LLMService:
    """Placeholder — full implementation in Sprint 5."""

    @staticmethod
    def grade_answer(student_text: str, model_answer: str, max_marks: float,
                     strictness: str = 'moderate') -> dict:
        """
        Grade a student answer against the model answer.

        Returns:
            dict with: score, feedback, confidence
        """
        # Sprint 5: will call the configured LLM provider
        return {
            'score': 0.0,
            'max_marks': max_marks,
            'feedback': 'Grading not yet implemented (Sprint 5).',
            'confidence': 0.0
        }
