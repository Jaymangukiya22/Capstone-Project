# API Testing Commands

## Test Category Hierarchy Endpoint

### 1. Test Backend API Directly
```bash
# Test if backend is running
curl http://localhost:3000/health

# Test category hierarchy endpoint
curl "http://localhost:3000/api/categories?hierarchy=true&depth=5&limit=1000"
```

### 2. Expected Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mathematics",
      "description": "Mathematical concepts and problem solving",
      "parentId": null,
      "isActive": true,
      "createdAt": "2025-01-21T06:46:43.000Z",
      "updatedAt": "2025-01-21T06:46:43.000Z",
      "createdById": 1,
      "children": [
        {
          "id": 2,
          "name": "Algebra",
          "description": "Linear and quadratic equations",
          "parentId": 1,
          "isActive": true,
          "createdAt": "2025-01-21T06:46:43.000Z",
          "updatedAt": "2025-01-21T06:46:43.000Z",
          "createdById": 1,
          "children": []
        }
      ]
    }
  ],
  "pagination": {
    "total": 6,
    "page": 1,
    "totalPages": 1,
    "limit": 1000
  },
  "message": "Categories retrieved successfully"
}
```

### 3. Test Question Bank Endpoint
```bash
# Test question bank endpoint
curl "http://localhost:3000/api/question-bank"
```

### 4. Frontend Console Debug
Open browser console and look for these logs:
```
🔍 Requesting categories with hierarchy...
🔍 Full API Response: {...}
🔍 API Response Categories: [...]
🔍 Final apiCategories: [...]
🔍 QuestionTreePanel received treeNodes: [...]
```

## Quick Fix Commands

### 1. Restart Backend
```bash
cd d:\Projects\Capstone-Project\backend
npm run dev
```

### 2. Restart Frontend
```bash
cd d:\Projects\Capstone-Project\Frontend-admin
npm run dev
```

### 3. Seed Database (if needed)
```bash
cd d:\Projects\Capstone-Project\backend
npm run ts-node src/scripts/seedCategoriesWithHierarchy.ts
```
