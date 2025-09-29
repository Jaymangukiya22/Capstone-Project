import React, { useState } from 'react';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { quizService, categoryService } from '../../services';
import type { Quiz, CreateQuizDto } from '../../services';

/**
 * Example component showing how to use Quiz API services
 */
export const QuizExample: React.FC = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState<CreateQuizDto>({
    title: '',
    description: '',
    categoryId: 1,
    difficulty: 'MEDIUM',
    timeLimit: 30
  });

  // Fetch all quizzes
  const {
    data: quizzesData,
    loading: quizzesLoading,
    error: quizzesError,
    refetch: refetchQuizzes
  } = useApi(() => quizService.getAllQuizzes());

  // Fetch categories for dropdown
  const {
    data: categories,
    loading: categoriesLoading
  } = useApi(() => categoryService.getAllCategories());

  // Create quiz mutation
  const {
    loading: createLoading,
    error: createError,
    mutate: createQuiz
  } = useApiMutation((data: CreateQuizDto) => quizService.createQuiz(data));

  // Update quiz mutation
  const {
    loading: updateLoading,
    error: updateError,
    mutate: updateQuiz
  } = useApiMutation(({ id, data }: { id: number; data: Partial<CreateQuizDto> }) => 
    quizService.updateQuiz(id, data)
  );

  // Delete quiz mutation
  const {
    loading: deleteLoading,
    mutate: deleteQuiz
  } = useApiMutation((id: number) => quizService.deleteQuiz(id));

  const handleCreateQuiz = async () => {
    if (!newQuiz.title.trim()) return;
    
    try {
      await createQuiz(newQuiz);
      setNewQuiz({
        title: '',
        description: '',
        categoryId: 1,
        difficulty: 'MEDIUM',
        timeLimit: 30
      });
      refetchQuizzes();
    } catch (error) {
      console.error('Failed to create quiz:', error);
    }
  };

  const handleUpdateQuiz = async (id: number, data: Partial<CreateQuizDto>) => {
    try {
      await updateQuiz({ id, data });
      refetchQuizzes();
      setSelectedQuiz(null);
    } catch (error) {
      console.error('Failed to update quiz:', error);
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      await deleteQuiz(id);
      refetchQuizzes();
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    }
  };

  if (quizzesLoading || categoriesLoading) return <div>Loading...</div>;
  if (quizzesError) return <div>Error: {quizzesError}</div>;

  const quizzes = quizzesData?.quizzes || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Quiz Management</h1>

      {/* Create Quiz Form */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Create New Quiz</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={newQuiz.title}
            onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
            placeholder="Quiz title"
            className="px-3 py-2 border rounded"
          />
          
          <select
            value={newQuiz.categoryId}
            onChange={(e) => setNewQuiz({ ...newQuiz, categoryId: parseInt(e.target.value) })}
            className="px-3 py-2 border rounded"
          >
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <textarea
            value={newQuiz.description}
            onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
            placeholder="Quiz description"
            className="px-3 py-2 border rounded"
            rows={3}
          />

          <div className="space-y-2">
            <select
              value={newQuiz.difficulty}
              onChange={(e) => setNewQuiz({ ...newQuiz, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            <input
              type="number"
              value={newQuiz.timeLimit}
              onChange={(e) => setNewQuiz({ ...newQuiz, timeLimit: parseInt(e.target.value) })}
              placeholder="Time limit (minutes)"
              min="1"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
        
        <button
          onClick={handleCreateQuiz}
          disabled={createLoading || !newQuiz.title.trim()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {createLoading ? 'Creating...' : 'Create Quiz'}
        </button>
        {createError && <p className="text-red-500 mt-2">{createError}</p>}
      </div>

      {/* Quizzes List */}
      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Quizzes ({quizzes.length})</h2>
        
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-lg">{quiz.title}</h3>
                {quiz.description && (
                  <p className="text-gray-600 mt-1">{quiz.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <span>ID: {quiz.id}</span>
                  <span>Category: {quiz.category?.name || quiz.categoryId}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    quiz.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                    quiz.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {quiz.difficulty}
                  </span>
                  {quiz.timeLimit && <span>Time: {quiz.timeLimit}min</span>}
                  <span>Created: {new Date(quiz.createdAt).toLocaleDateString()}</span>
                </div>
                {quiz.questions && (
                  <p className="text-sm text-blue-600 mt-1">
                    {quiz.questions.length} questions
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setSelectedQuiz(quiz)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  disabled={deleteLoading}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Quiz</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={selectedQuiz.title}
                onChange={(e) => setSelectedQuiz({ ...selectedQuiz, title: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Quiz title"
              />
              
              <textarea
                value={selectedQuiz.description || ''}
                onChange={(e) => setSelectedQuiz({ ...selectedQuiz, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Quiz description"
                rows={3}
              />
              
              <select
                value={selectedQuiz.difficulty}
                onChange={(e) => setSelectedQuiz({ ...selectedQuiz, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
              
              <input
                type="number"
                value={selectedQuiz.timeLimit || ''}
                onChange={(e) => setSelectedQuiz({ ...selectedQuiz, timeLimit: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Time limit (minutes)"
                min="1"
              />
            </div>
            
            {updateError && <p className="text-red-500 mt-4">{updateError}</p>}
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleUpdateQuiz(selectedQuiz.id, {
                  title: selectedQuiz.title,
                  description: selectedQuiz.description,
                  difficulty: selectedQuiz.difficulty,
                  timeLimit: selectedQuiz.timeLimit
                })}
                disabled={updateLoading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {updateLoading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
