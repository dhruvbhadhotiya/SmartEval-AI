"""
Celery application configuration.

Usage:
    Start worker:  celery -A tasks.celery_app.celery worker --loglevel=info --pool=solo
"""

import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

celery = Celery(
    'smart-eval',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    include=['tasks.ocr_tasks']
)

celery.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # one task at a time (heavy GPU work)
)
