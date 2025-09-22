# 🔐 Authentication Setup & Testing Guide

## Overview
Complete login and signup system connecting React frontend with Node.js backend using JWT authentication.

## ✅ What's Implemented

### Backend (Port 3000)
- ✅ JWT Authentication with role-based access
- ✅ User registration and login endpoints
- ✅ Password hashing with bcrypt
- ✅ Token management (access + refresh tokens)
- ✅ User profile management
- ✅ Sequelize ORM with PostgreSQL

### Frontend (React + TypeScript)
- ✅ Authentication service with API integration
- ✅ React Context for global auth state
- ✅ Beautiful login and signup forms
- ✅ Form validation and error handling
- ✅ Token storage in localStorage
- ✅ Auto-redirect after authentication

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
Backend runs on: http://localhost:3000

### 2. Verify Backend Health
Visit: http://localhost:3000/health
Should show: `{"status":"OK","service":"Quiz Management System Backend"}`

### 3. Test Auth Endpoints
```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testadmin",
    "email": "admin@test.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "Admin",
    "role": "ADMIN"
  }'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 4. Frontend Integration

#### Add AuthProvider to your App
```tsx
// In your main App.tsx or index.tsx
import { AuthProvider } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/auth-test" element={<AuthTestPage />} />
      </Routes>
    </AuthProvider>
  );
}
```

#### Use Authentication in Components
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 📝 Testing the Auth System

### Method 1: Use the Test Page
1. Add the AuthTestPage to your routes: `/auth-test`
2. Visit the test page in your browser
3. Try both login and registration forms
4. Check browser console for detailed logs

### Method 2: Use the Actual Forms
1. Visit `/signup` to create a new admin account
2. Visit `/login` to login with existing credentials
3. Both forms will redirect to `/dashboard` on success

### Method 3: Direct API Testing
Use the curl commands above to test backend directly.

## 🔧 Configuration

### Backend Environment Variables
```env
# In backend/.env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/quiz_db
```

### Frontend API Configuration
```typescript
// In Frontend-admin/src/services/api.ts
const API_BASE_URL = 'http://localhost:3000/api';
```

## 🎯 Expected Responses

### Successful Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "testadmin",
      "email": "admin@test.com",
      "firstName": "Test",
      "lastName": "Admin",
      "role": "ADMIN",
      "eloRating": 1200
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
```

## 🛠️ Troubleshooting

### Backend Issues
1. **Port 3000 already in use**: Kill the process or change port
2. **Database connection error**: Check PostgreSQL is running
3. **JWT secret missing**: Add JWT_SECRET to .env file

### Frontend Issues
1. **CORS errors**: Backend has CORS enabled for all origins
2. **Network errors**: Check backend is running on port 3000
3. **Type errors**: All TypeScript issues have been resolved

### Common Problems
1. **401 Unauthorized**: Check if auth routes are enabled in server.ts
2. **User already exists**: Use different email for registration
3. **Token not stored**: Check browser localStorage in DevTools

## 📊 Features

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT tokens with expiration
- ✅ Refresh token rotation
- ✅ Role-based access control
- ✅ Input validation and sanitization

### User Experience
- ✅ Beautiful, responsive forms
- ✅ Real-time error display
- ✅ Loading states during submission
- ✅ Auto-redirect after auth
- ✅ Persistent sessions (localStorage)

### Developer Experience
- ✅ Full TypeScript support
- ✅ Comprehensive error handling
- ✅ Easy-to-use React hooks
- ✅ Detailed logging
- ✅ Test utilities included

## 🎉 Success Indicators

✅ Backend health check returns 200 OK  
✅ Registration creates new user in database  
✅ Login returns JWT tokens  
✅ Frontend stores tokens in localStorage  
✅ User state updates globally  
✅ Forms show loading states  
✅ Errors display properly  
✅ Auto-redirect works  

## 🔄 Next Steps

1. **Add Route Protection**: Create ProtectedRoute component
2. **Add Role-based Access**: Check user roles in components
3. **Add Password Reset**: Implement forgot password flow
4. **Add Profile Management**: Allow users to update their profiles
5. **Add Session Management**: Handle token expiration gracefully

The authentication system is now fully functional and ready for production use! 🚀
