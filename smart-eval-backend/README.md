# Smart-Eval AI - Backend

Flask backend for the Smart-Eval AI automated exam grading system.

## 🚀 Sprint 1 Complete - Authentication API

### Features Implemented
✅ User Registration (POST /api/v1/auth/register)  
✅ User Login (POST /api/v1/auth/login)  
✅ Token Refresh (POST /api/v1/auth/refresh)  
✅ Get Current User (GET /api/v1/auth/me)  
✅ Logout (POST /api/v1/auth/logout)  
✅ Role-Based Access Control (teacher, student, admin)  
✅ JWT Authentication  
✅ Password Hashing (bcrypt)  

## 📋 Prerequisites

- Python 3.11+
- MongoDB (local or Atlas)
- Redis (local or cloud)

## 🛠️ Setup Instructions

### 1. Create Virtual Environment
```bash
cd smart-eval-backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your settings
# Minimum required:
# - MONGODB_URI
# - JWT_SECRET_KEY
# - SECRET_KEY
```

### 4. Start MongoDB
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud) - update MONGODB_URI in .env
```

### 5. Start Redis
```bash
# If using local Redis
redis-server

# Or use Redis Cloud - update REDIS_URL in .env
```

### 6. Run the Application
```bash
python run.py
```

Server will start at: `http://localhost:5000`

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Register a Teacher
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@university.edu",
    "password": "TeacherPass123",
    "role": "teacher",
    "profile": {
      "name": "Dr. Sharma",
      "department": "Computer Science"
    }
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@university.edu",
    "password": "TeacherPass123"
  }'
```

### Get Current User (requires token)
```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📁 Project Structure

```
smart-eval-backend/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # Configuration classes
│   └── extensions.py        # Flask extensions
├── api/
│   └── v1/
│       ├── auth/           # Authentication endpoints
│       │   ├── routes.py
│       │   └── schemas.py
│       └── __init__.py
├── models/
│   └── user.py             # User model
├── services/
│   └── auth_service.py     # Authentication business logic
├── utils/
│   ├── decorators.py       # Custom decorators (@role_required)
│   ├── exceptions.py       # Custom exceptions
│   └── helpers.py          # Helper functions
├── run.py                  # Development server
├── wsgi.py                 # Production entry point
└── requirements.txt        # Python dependencies
```

## 🔑 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/v1/auth/register` | Register user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/refresh` | Refresh token | Yes (Refresh) |
| POST | `/api/v1/auth/logout` | Logout user | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |

## 🔒 Role-Based Access

Use the `@role_required` decorator to protect routes:

```python
from utils.decorators import role_required

@app.route('/teacher-only')
@role_required('teacher')
def teacher_route():
    return "Only teachers can access"

@app.route('/admin-or-teacher')
@role_required(['admin', 'teacher'])
def admin_teacher_route():
    return "Admins and teachers can access"
```

## 🧪 Running Tests

```bash
# Install test dependencies (already in requirements.txt)
pip install pytest pytest-cov

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov=models --cov=services
```

## 🐛 Common Issues

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env file
- For Atlas, ensure IP is whitelisted

### Redis Connection Error
- Ensure Redis is running: `redis-server`
- Check REDIS_URL in .env file

### Import Errors
- Ensure virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`

## 📚 Next Steps (Sprint 2)

- Frontend Login UI
- Teacher Dashboard
- Exam Creation API
- File Upload Service

## 🔧 Technology Stack

- **Framework:** Flask 3.0
- **Database:** MongoDB (MongoEngine ODM)
- **Cache:** Redis
- **Authentication:** Flask-JWT-Extended
- **Validation:** Marshmallow
- **Password Hashing:** bcrypt
- **Task Queue:** Celery (for later sprints)

## 📝 License

To be determined
