# Smart-Eval AI

Automated exam grading platform powered by OCR and LLM. Teachers upload answer sheets, the system extracts handwritten text via a vision model, then grades answers against a model answer key using an LLM.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Redux Toolkit, Tailwind CSS |
| Backend | Flask (Python 3.11), Flask-JWT-Extended, Flask-CORS, Flask-Limiter |
| Database | MongoDB (MongoEngine ODM) |
| Queue | Redis + Celery (optional, for async processing) |
| OCR | PyMuPDF + Vision models (Ollama / Groq Cloud / OpenRouter) |
| Grading | LLM via configurable providers (Ollama / Groq / OpenRouter) |

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **MongoDB 6+** (running on `localhost:27017`)
- **Redis** (optional — only needed for async Celery tasks)
- **AI Provider** — one of:
  - [Ollama](https://ollama.ai) (local, free) with `llava` + `llama3` models
  - [Groq Cloud](https://console.groq.com) (cloud, free tier)
  - [OpenRouter](https://openrouter.ai) (cloud, free tier available)

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/Aditya-khndelwal/SmartEval-AI.git
cd SmartEval-AI
```

### 2. Backend setup

```bash
cd smart-eval-backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env — at minimum set your AI provider keys if using cloud APIs

# Run the development server
python run.py
```

The backend starts at **http://localhost:5000**. Verify with:
```bash
curl http://localhost:5000/health
```

### 3. Frontend setup

```bash
cd smart-eval-frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend starts at **http://localhost:3000**.

### 4. Open the app

Go to **http://localhost:3000** in your browser. Register a teacher account and start creating exams.

## Quick Start (Docker)

```bash
# Development (with hot-reload)
docker compose -f docker-compose.dev.yml up --build

# Production
docker compose up --build
```

Development mode exposes:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017

## Environment Variables

All env vars are documented in [`smart-eval-backend/.env.example`](smart-eval-backend/.env.example). Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | `development` or `production` |
| `SECRET_KEY` | dev default | Flask secret key (change in production) |
| `MONGODB_URI` | `mongodb://localhost:27017/smarteval` | MongoDB connection string |
| `REDIS_URL` | none | Redis URL (optional) |
| `JWT_SECRET_KEY` | dev default | JWT signing key (change in production) |
| `VISION_PROVIDER` | `ollama` | OCR provider: `ollama`, `groqcloud`, `openrouter` |
| `LLM_PROVIDER` | `ollama` | Grading provider: `ollama`, `groqcloud`, `openrouter` |
| `GROQ_API_KEY` | none | Groq Cloud API key |
| `OPENROUTER_API_KEY` | none | OpenRouter API key |
| `MAIL_ENABLED` | `false` | Enable email notifications |

## API Overview

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login, get JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/exams` | List teacher's exams |
| POST | `/exams` | Create exam |
| POST | `/exams/:id/question-paper` | Upload question paper |
| POST | `/exams/:id/model-answer` | Upload model answer |
| POST | `/exams/:id/answer-sheets/bulk` | Upload answer sheets |
| POST | `/grading/exams/:id/process` | Run OCR on sheets |
| POST | `/grading/exams/:id/grade` | Run LLM grading |
| GET | `/results` | Student: view published results |
| POST | `/challenges` | Student: submit grade challenge |

Full API docs: [`Project_Docs/API_DOCS.md`](Project_Docs/API_DOCS.md)

## Project Structure

```
SmartEval-AI/
├── smart-eval-backend/        # Flask API server
│   ├── api/v1/                # Route blueprints (auth, exams, grading, students, challenges)
│   ├── app/                   # App factory, config, extensions
│   ├── models/                # MongoEngine models (user, exam, answer_sheet, evaluation, challenge)
│   ├── services/              # Business logic (auth, exam, grading, ocr, llm, storage, notification)
│   ├── tasks/                 # Celery async tasks
│   ├── tests/                 # Test suite
│   ├── utils/                 # Helpers, decorators, exceptions
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── smart-eval-frontend/       # React SPA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── features/          # Redux slices (auth, exams, grading, results)
│   │   ├── pages/             # Page components
│   │   └── services/          # API client layer
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml         # Production Docker setup
├── docker-compose.dev.yml     # Development Docker setup
└── README.md
```

## Troubleshooting

### MongoDB connection refused
Make sure MongoDB is running:
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Start MongoDB (varies by OS)
# macOS: brew services start mongodb-community
# Ubuntu: sudo systemctl start mongod
# Windows: net start MongoDB
```

### OCR/Grading not working
1. Check your AI provider is configured in `.env`
2. If using Ollama, make sure it's running: `ollama serve`
3. Pull required models: `ollama pull llava && ollama pull llama3`
4. If using Groq/OpenRouter, verify your API key is set

### Frontend can't reach backend
- Backend must be running on port 5000
- Check CORS: `CORS_ORIGINS` in `.env` should include `http://localhost:3000`
- Vite proxy is configured to forward `/api` requests to `localhost:5000`

### "Rate limit exceeded" errors
Default limits: 5 registrations/min, 10 logins/min. Wait or adjust `RATELIMIT_DEFAULT` in `.env`.

## Running Tests

```bash
cd smart-eval-backend
python -m pytest tests/ -v
```

## Team

Team T26 - 4th Semester, CSE
- Aditya Khandelwal
- Dhruv Bhadhotiya
- Dhruv Singhal
