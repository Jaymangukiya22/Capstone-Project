# Quiz System API Testing Guide

## Base URL
```
http://localhost:3000
```

## Authentication Endpoints

### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User",
  "role": "PLAYER"
}
```

### 2. Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 3. Get Current User Profile
```http
GET /api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

## Category Management Endpoints

### 1. Create Category
```http
POST /api/categories
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Science",
  "description": "Science related questions",
  "parentId": null
}
```

### 2. Get All Categories
```http
GET /api/categories
Authorization: Bearer YOUR_JWT_TOKEN
```

### 3. Get Category by ID
```http
GET /api/categories/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Update Category
```http
PUT /api/categories/1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Updated Science",
  "description": "Updated description"
}
```

### 5. Delete Category
```http
DELETE /api/categories/1
Authorization: Bearer YOUR_JWT_TOKEN
```

## Question Bank Endpoints

### 1. Create Question
```http
POST /api/question-bank
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "question": "What is the capital of France?",
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "correctAnswer": 2,
  "explanation": "Paris is the capital of France",
  "difficulty": "EASY",
  "categoryId": 1,
  "tags": ["geography", "capitals"]
}
```

### 2. Get Questions with Filters
```http
GET /api/question-bank?categoryId=1&difficulty=EASY&page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### 3. Get Question by ID
```http
GET /api/question-bank/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Update Question
```http
PUT /api/question-bank/1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "question": "Updated question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctAnswer": 0,
  "explanation": "Updated explanation"
}
```

### 5. Delete Question
```http
DELETE /api/question-bank/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Import Questions from Excel
```http
POST /api/question-bank/import
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- file: [Excel file]
- categoryId: 1
```

### 7. Export Questions to Excel
```http
GET /api/question-bank/export?categoryId=1
Authorization: Bearer YOUR_JWT_TOKEN
```

## Quiz Management Endpoints

### 1. Create Quiz
```http
POST /api/quizzes
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Science Quiz",
  "description": "A quiz about basic science",
  "difficulty": "MEDIUM",
  "timeLimit": 30,
  "maxQuestions": 10,
  "categoryId": 1
}
```

### 2. Get All Quizzes
```http
GET /api/quizzes?page=1&limit=10&difficulty=MEDIUM&categoryId=1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 3. Get Quiz by ID
```http
GET /api/quizzes/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Update Quiz
```http
PUT /api/quizzes/1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Updated Science Quiz",
  "description": "Updated description",
  "timeLimit": 45
}
```

### 5. Delete Quiz
```http
DELETE /api/quizzes/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Search Quizzes
```http
GET /api/quizzes/search?q=science&difficulty=EASY
Authorization: Bearer YOUR_JWT_TOKEN
```

### 7. Get Quiz Statistics
```http
GET /api/quizzes/1/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

## Quiz Attempt Endpoints

### 1. Start Quiz Attempt
```http
POST /api/quiz-attempts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "quizId": 1
}
```

### 2. Submit Answer
```http
POST /api/quiz-attempts/1/answer
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "questionId": 1,
  "selectedAnswer": 2,
  "timeSpent": 15
}
```

### 3. Complete Quiz Attempt
```http
POST /api/quiz-attempts/1/complete
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Get Quiz Attempt Details
```http
GET /api/quiz-attempts/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### 5. Get User's Quiz History
```http
GET /api/quiz-attempts/history?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Get Leaderboard
```http
GET /api/quiz-attempts/leaderboard?quizId=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### 7. Get User Statistics
```http
GET /api/quiz-attempts/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

## Health Check Endpoints

### 1. Health Check
```http
GET /health
```

### 2. Metrics
```http
GET /metrics
```

## Sample Test Flow

1. **Register a new user**
2. **Login to get JWT token**
3. **Create a category**
4. **Create questions in that category**
5. **Create a quiz using those questions**
6. **Start a quiz attempt**
7. **Submit answers**
8. **Complete the quiz**
9. **Check leaderboard and statistics**

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2025-09-17T18:55:00.000Z"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

## Notes

- All protected endpoints require `Authorization: Bearer <token>` header
- JWT tokens expire after 24 hours
- File uploads use `multipart/form-data`
- Pagination uses `page` and `limit` query parameters
- Search endpoints support various filters
