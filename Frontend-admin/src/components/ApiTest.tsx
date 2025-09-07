import React, { useState, useEffect } from 'react';
import { categoryService, quizService, questionService } from '../services';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export const ApiTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'success' | 'error', message: string, data?: any) => {
    setResults(prev => [...prev, { test, status, message, data }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Health Check
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        const data = await response.json();
        addResult('Health Check', 'success', 'Backend server is running', data);
      } else {
        addResult('Health Check', 'error', `Server responded with ${response.status}`);
      }
    } catch (error) {
      addResult('Health Check', 'error', `Cannot connect to backend: ${error}`);
    }

    // Test 2: Get Categories
    try {
      const categories = await categoryService.getAllCategories();
      addResult('Get Categories', 'success', `Found ${categories.length} categories`, categories);
    } catch (error: any) {
      addResult('Get Categories', 'error', error.response?.data?.message || error.message);
    }

    // Test 3: Create Category
    try {
      const newCategory = await categoryService.createCategory({
        name: `Test Category ${Date.now()}`
      });
      addResult('Create Category', 'success', 'Category created successfully', newCategory);

      // Test 4: Update Category
      try {
        const updatedCategory = await categoryService.updateCategory(newCategory.id, {
          name: `Updated ${newCategory.name}`
        });
        addResult('Update Category', 'success', 'Category updated successfully', updatedCategory);
      } catch (error: any) {
        addResult('Update Category', 'error', error.response?.data?.message || error.message);
      }

      // Test 5: Create Quiz
      try {
        const newQuiz = await quizService.createQuiz({
          title: `Test Quiz ${Date.now()}`,
          description: 'API Test Quiz',
          categoryId: newCategory.id,
          difficulty: 'EASY',
          timeLimit: 10
        });
        addResult('Create Quiz', 'success', 'Quiz created successfully', newQuiz);

        // Test 6: Add Question
        try {
          const newQuestion = await questionService.addQuestionToQuiz(newQuiz.id, {
            questionText: 'What is 2 + 2?',
            options: [
              { optionText: '3', isCorrect: false },
              { optionText: '4', isCorrect: true },
              { optionText: '5', isCorrect: false },
              { optionText: '6', isCorrect: false }
            ]
          });
          addResult('Create Question', 'success', 'Question created successfully', newQuestion);
        } catch (error: any) {
          addResult('Create Question', 'error', error.response?.data?.message || error.message);
        }

        // Test 7: Get Quiz with Questions
        try {
          const quizWithQuestions = await quizService.getQuizById(newQuiz.id);
          addResult('Get Quiz Details', 'success', 'Quiz retrieved with questions', quizWithQuestions);
        } catch (error: any) {
          addResult('Get Quiz Details', 'error', error.response?.data?.message || error.message);
        }

      } catch (error: any) {
        addResult('Create Quiz', 'error', error.response?.data?.message || error.message);
      }

    } catch (error: any) {
      addResult('Create Category', 'error', error.response?.data?.message || error.message);
    }

    // Test 8: Database Connection Test
    try {
      const { quizzes } = await quizService.getAllQuizzes();
      addResult('Database Connection', 'success', `Database connected - ${quizzes.length} quizzes found`, { count: quizzes.length });
    } catch (error: any) {
      addResult('Database Connection', 'error', error.response?.data?.message || error.message);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runTests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Connection Test</h1>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getStatusIcon(result.status)}</span>
                <div>
                  <h3 className="font-semibold">{result.test}</h3>
                  <p className="text-sm">{result.message}</p>
                </div>
              </div>
            </div>
            
            {result.data && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">View Data</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && !isRunning && (
        <div className="text-center py-8 text-gray-500">
          Click "Run Tests" to check API connectivity
        </div>
      )}

      {isRunning && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Running API tests...</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Troubleshooting:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Make sure backend server is running: <code>npm run dev</code> in backend folder</li>
          <li>• Check if database is connected and migrated</li>
          <li>• Verify CORS settings allow frontend domain</li>
          <li>• Check browser console for additional errors</li>
        </ul>
      </div>
    </div>
  );
};
