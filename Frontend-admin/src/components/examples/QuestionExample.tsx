import React, { useState } from 'react';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { questionService, quizService } from '../../services';
import type { Question, CreateQuestionDto } from '../../services';

/**
 * Example component showing how to use Question API services
 */
export const QuestionExample: React.FC = () => {
  const [selectedQuizId, setSelectedQuizId] = useState<number>(1);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [newQuestion, setNewQuestion] = useState<CreateQuestionDto>({
    questionText: '',
    options: [
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false }
    ]
  });

  // Fetch all quizzes for dropdown
  const {
    data: quizzesData,
    loading: quizzesLoading
  } = useApi(() => quizService.getAllQuizzes());

  // Fetch questions for selected quiz
  const {
    data: questions,
    loading: questionsLoading,
    error: questionsError,
    refetch: refetchQuestions
  } = useApi(() => questionService.getQuestionsByQuizId(selectedQuizId), [selectedQuizId]);

  // Create question mutation
  const {
    loading: createLoading,
    error: createError,
    mutate: createQuestion
  } = useApiMutation(({ quizId, data }: { quizId: number; data: CreateQuestionDto }) => 
    questionService.addQuestionToQuiz(quizId, data)
  );

  // Update question mutation
  const {
    loading: updateLoading,
    error: updateError,
    mutate: updateQuestion
  } = useApiMutation(({ id, data }: { id: number; data: CreateQuestionDto }) => 
    questionService.updateQuestion(id, data)
  );

  // Delete question mutation
  const {
    loading: deleteLoading,
    mutate: deleteQuestion
  } = useApiMutation((id: number) => questionService.deleteQuestion(id));

  const handleCreateQuestion = async () => {
    const validation = questionService.validateQuestionData(newQuestion);
    if (!validation.isValid) {
      alert('Validation errors:\n' + validation.errors.join('\n'));
      return;
    }
    
    try {
      await createQuestion({ quizId: selectedQuizId, data: newQuestion });
      setNewQuestion({
        questionText: '',
        options: [
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false }
        ]
      });
      refetchQuestions();
    } catch (error) {
      console.error('Failed to create question:', error);
    }
  };

  const handleUpdateQuestion = async (id: number, data: CreateQuestionDto) => {
    const validation = questionService.validateQuestionData(data);
    if (!validation.isValid) {
      alert('Validation errors:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      await updateQuestion({ id, data });
      refetchQuestions();
      setSelectedQuestion(null);
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await deleteQuestion(id);
      refetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const updateNewQuestionOption = (index: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  if (quizzesLoading) return <div>Loading quizzes...</div>;

  const quizzes = quizzesData?.quizzes || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Question Management</h1>

      {/* Quiz Selection */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Select Quiz</h2>
        <select
          value={selectedQuizId}
          onChange={(e) => setSelectedQuizId(parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded"
        >
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.title} (ID: {quiz.id})
            </option>
          ))}
        </select>
      </div>

      {/* Create Question Form */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Add New Question</h2>
        
        <div className="space-y-4">
          <textarea
            value={newQuestion.questionText}
            onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
            placeholder="Enter question text"
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />

          <div className="space-y-3">
            <h3 className="font-medium">Options:</h3>
            {newQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-8 text-center font-medium">{index + 1}.</span>
                <input
                  type="text"
                  value={option.optionText}
                  onChange={(e) => updateNewQuestionOption(index, 'optionText', e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(e) => updateNewQuestionOption(index, 'isCorrect', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Correct</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleCreateQuestion}
          disabled={createLoading}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {createLoading ? 'Adding...' : 'Add Question'}
        </button>
        {createError && <p className="text-red-500 mt-2">{createError}</p>}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Questions for Selected Quiz ({questionsLoading ? '...' : questions?.length || 0})
        </h2>
        
        {questionsLoading && <div>Loading questions...</div>}
        {questionsError && <div className="text-red-500">Error: {questionsError}</div>}
        
        {questions?.map((question) => (
          <div key={question.id} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-lg">{question.questionText}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  ID: {question.id} | Created: {new Date(question.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setSelectedQuestion(question)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  disabled={deleteLoading}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Options:</h4>
              {question.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-3 pl-4">
                  <span className="w-6 text-center text-sm">{index + 1}.</span>
                  <span className="flex-1">{option.optionText}</span>
                  {option.isCorrect && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Question</h3>
            
            <div className="space-y-4">
              <textarea
                value={selectedQuestion.questionText}
                onChange={(e) => setSelectedQuestion({ ...selectedQuestion, questionText: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={3}
              />
              
              <div className="space-y-3">
                <h4 className="font-medium">Options:</h4>
                {selectedQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-8 text-center font-medium">{index + 1}.</span>
                    <input
                      type="text"
                      value={option.optionText}
                      onChange={(e) => {
                        const updatedOptions = [...selectedQuestion.options];
                        updatedOptions[index] = { ...updatedOptions[index], optionText: e.target.value };
                        setSelectedQuestion({ ...selectedQuestion, options: updatedOptions });
                      }}
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(e) => {
                          const updatedOptions = [...selectedQuestion.options];
                          updatedOptions[index] = { ...updatedOptions[index], isCorrect: e.target.checked };
                          setSelectedQuestion({ ...selectedQuestion, options: updatedOptions });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Correct</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {updateError && <p className="text-red-500 mt-4">{updateError}</p>}
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleUpdateQuestion(selectedQuestion.id, {
                  questionText: selectedQuestion.questionText,
                  options: selectedQuestion.options.map(opt => ({
                    optionText: opt.optionText,
                    isCorrect: opt.isCorrect
                  }))
                })}
                disabled={updateLoading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {updateLoading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => setSelectedQuestion(null)}
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
