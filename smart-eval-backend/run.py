"""
Development server runner with interactive API provider selection.
"""
import os
from app import create_app


def select_provider():
    """Let the user choose Vision (OCR) and LLM (Grading) providers at startup."""
    providers = {
        '1': ('ollama', 'Ollama (local)'),
        '2': ('openai', 'OpenAI-compatible (LM Studio, vLLM, etc.)'),
        '3': ('lmstudio', 'LM Studio (native API)'),
        '4': ('openrouter', 'OpenRouter (cloud - free tier)'),
        '5': ('groqcloud', 'Groq Cloud (fast cloud inference)'),
    }

    print("\n" + "=" * 60)
    print("  Smart-Eval Server — API Provider Configuration")
    print("=" * 60)

    # ---------- Vision (OCR / Text Extraction) ----------
    current_vision = os.getenv('VISION_PROVIDER', 'ollama')
    print(f"\n--- Vision Provider (OCR / Text Extraction) ---")
    print(f"  Current: {current_vision}")
    for key, (_, label) in providers.items():
        print(f"  [{key}] {label}")
    print(f"  [Enter] Keep current ({current_vision})")

    vision_choice = input("  Select Vision provider: ").strip()
    if vision_choice in providers:
        vision_provider = providers[vision_choice][0]
    else:
        vision_provider = current_vision

    # ---------- LLM (Grading) ----------
    current_llm = os.getenv('LLM_PROVIDER', 'ollama')
    print(f"\n--- LLM Provider (Grading) ---")
    print(f"  Current: {current_llm}")
    for key, (_, label) in providers.items():
        print(f"  [{key}] {label}")
    print(f"  [Enter] Keep current ({current_llm})")

    llm_choice = input("  Select LLM provider: ").strip()
    if llm_choice in providers:
        llm_provider = providers[llm_choice][0]
    else:
        llm_provider = current_llm

    # ---------- Apply overrides ----------
    os.environ['VISION_PROVIDER'] = vision_provider
    os.environ['LLM_PROVIDER'] = llm_provider

    # Set sensible defaults per provider
    provider_defaults = {
        'ollama': {
            'VISION_API_URL': 'http://localhost:11434/api/chat',
            'VISION_MODEL': 'llava',
            'LLM_API_URL': 'http://localhost:11434/api/chat',
            'LLM_MODEL': 'llama3',
        },
        'openai': {
            'VISION_API_URL': 'http://localhost:1234/v1',
            'VISION_MODEL': 'local-model',
            'LLM_API_URL': 'http://localhost:1234/v1',
            'LLM_MODEL': 'local-model',
        },
        'lmstudio': {
            'VISION_API_URL': 'http://localhost:1234',
            'VISION_MODEL': 'local-model',
            'LLM_API_URL': 'http://localhost:1234',
            'LLM_MODEL': 'local-model',
        },
        'openrouter': {
            'VISION_API_URL': 'https://openrouter.ai/api/v1',
            'VISION_MODEL': 'openrouter/free',
            'LLM_API_URL': 'https://openrouter.ai/api/v1',
            'LLM_MODEL': 'openrouter/free',
        },
        'groqcloud': {
            'VISION_API_URL': 'https://api.groq.com/openai/v1',
            'VISION_MODEL': os.getenv('GROQ_VISION_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct'),
            'LLM_API_URL': 'https://api.groq.com/openai/v1',
            'LLM_MODEL': os.getenv('GROQ_LLM_MODEL', 'openai/gpt-oss-120b'),
        },
    }

    # Only set defaults if user didn't already set them in .env
    vision_defaults = provider_defaults.get(vision_provider, {})
    for key in ('VISION_API_URL', 'VISION_MODEL'):
        if key in vision_defaults:
            os.environ[key] = vision_defaults[key]

    llm_defaults = provider_defaults.get(llm_provider, {})
    for key in ('LLM_API_URL', 'LLM_MODEL'):
        if key in llm_defaults:
            os.environ[key] = llm_defaults[key]

    print(f"\n  Vision : {vision_provider} (model: {os.environ.get('VISION_MODEL')})")
    print(f"  LLM    : {llm_provider} (model: {os.environ.get('LLM_MODEL')})")
    print("=" * 60 + "\n")


if __name__ == '__main__':
    select_provider()
    app = create_app('development')
    app.run(host='0.0.0.0', port=5000, debug=True)
