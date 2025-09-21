import React, { useState, useEffect } from 'react';
import type { QuizQuestion } from '@/types/quiz';
import QuizHeader from './quiz-interface/QuizHeader';
import QuestionCard from './quiz-interface/QuestionCard';
import QuizNavigation from './quiz-interface/QuizNavigation';
import QuizSidebar from './quiz-interface/QuizSidebar';

// Mock quiz data - in real app this would come from API
const mockQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the primary purpose of React's useState hook?",
    options: [
      "To manage component lifecycle methods",
      "To handle state management in functional components",
      "To create class-based components",
      "To optimize component rendering performance"
    ],
    correctAnswer: "To handle state management in functional components"
  },
  {
    id: 2,
    question: "Which of the following is the correct way to pass data from a parent component to a child component in React?",
    options: [
      "Using state variables",
      "Using props",
      "Using context API only",
      "Using local storage"
    ],
    correctAnswer: "Using props"
  },
  {
    id: 3,
    question: "What does the useEffect hook do in React?",
    options: [
      "Manages component state",
      "Handles side effects in functional components",
      "Creates new components",
      "Optimizes component performance"
    ],
    correctAnswer: "Handles side effects in functional components"
  },
  {
    id: 4,
    question: "Which method is used to update state in a class component?",
    options: [
      "updateState()",
      "changeState()",
      "setState()",
      "modifyState()"
    ],
    correctAnswer: "setState()"
  },
  {
    id: 5,
    question: "What is JSX in React?",
    options: [
      "A JavaScript library",
      "A syntax extension for JavaScript",
      "A CSS framework",
      "A database query language"
    ],
    correctAnswer: "A syntax extension for JavaScript"
  },
  {
    id: 6,
    question: "Which of the following is used to handle forms in React?",
    options: [
      "Controlled components",
      "Uncontrolled components",
      "Both controlled and uncontrolled components",
      "Form libraries only"
    ],
    correctAnswer: "Both controlled and uncontrolled components"
  },
  {
    id: 7,
    question: "What is the virtual DOM in React?",
    options: [
      "A copy of the real DOM kept in memory",
      "A new type of HTML element",
      "A CSS styling technique",
      "A JavaScript framework"
    ],
    correctAnswer: "A copy of the real DOM kept in memory"
  },
  {
    id: 8,
    question: "Which hook is used to perform cleanup in React functional components?",
    options: [
      "useCleanup()",
      "useDestroy()",
      "useEffect() with return function",
      "useUnmount()"
    ],
    correctAnswer: "useEffect() with return function"
  },
  {
    id: 9,
    question: "What is the purpose of React Router?",
    options: [
      "To manage component state",
      "To handle navigation in single-page applications",
      "To optimize component rendering",
      "To manage API calls"
    ],
    correctAnswer: "To handle navigation in single-page applications"
  },
  {
    id: 10,
    question: "Which of the following is the correct way to conditionally render elements in React?",
    options: [
      "Using if-else statements only",
      "Using ternary operators and logical AND operators",
      "Using switch statements only",
      "Using for loops"
    ],
    correctAnswer: "Using ternary operators and logical AND operators"
  }
];

const QuizInterface: React.FC = () => {
  
  // Quiz state management
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState(new Map<number, string>());
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(30); // 30 seconds per question

  // Get answered questions set for progress tracking
  const answeredQuestions = new Set(answers.keys());

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => new Map(prev.set(currentQuestion, answer)));
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentQuestion < mockQuestions.length) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionTimeRemaining(30); // Reset question timer
    }
  };

  // Auto-advance to next question when time runs out
  const handleQuestionTimeUp = () => {
    if (currentQuestion < mockQuestions.length) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionTimeRemaining(30);
    } else {
      handleSubmit();
    }
  };

  // Quiz submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate submission delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Calculate results
    let correctCount = 0;
    
    mockQuestions.forEach((question, index) => {
      const questionNumber = index + 1;
      const userAnswer = answers.get(questionNumber);
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) correctCount++;
    });

    const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Store results in sessionStorage for results page
    const quizResults = {
      score: correctCount,
      totalQuestions: mockQuestions.length,
      timeSpent: totalTimeSpent,
      completedAt: new Date().toISOString(),
      studentName: "Current Student"
    };
    
    sessionStorage.setItem('quizResults', JSON.stringify(quizResults));
    
    // Navigate to quiz results page
    window.location.pathname = '/quiz-results';
  };

  // Handle time up
  const handleTimeUp = () => {
    handleSubmit();
  };

  // Prevent accidental navigation during quiz
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your quiz progress will be lost.';
      return 'Are you sure you want to leave? Your quiz progress will be lost.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Timer countdown effect for overall quiz
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Timer countdown effect for individual questions
  useEffect(() => {
    if (questionTimeRemaining <= 0) return;

    const questionTimer = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          handleQuestionTimeUp();
          return 30; // Reset for next question
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(questionTimer);
  }, [questionTimeRemaining, currentQuestion]);

  // Reset question timer when question changes
  useEffect(() => {
    setQuestionTimeRemaining(30);
  }, [currentQuestion]);

  // Get current question data
  const currentQuestionData = mockQuestions[currentQuestion - 1];
  const currentAnswer = answers.get(currentQuestion);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Full-screen quiz mode indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/20">
          Quiz Mode - Full Screen
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Quiz Header */}
        <QuizHeader
          currentQuestion={currentQuestion}
          totalQuestions={mockQuestions.length}
          timeRemaining={timeRemaining}
          questionTimeRemaining={questionTimeRemaining}
          onTimeUp={handleTimeUp}
          quizTitle="React Fundamentals Assessment"
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Quiz Sidebar */}
          <div className="xl:col-span-1">
            <QuizSidebar
              questions={mockQuestions}
              currentQuestion={currentQuestion}
              answeredQuestions={answeredQuestions}
            />
          </div>

          {/* Main Quiz Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Question Card */}
            <QuestionCard
              question={currentQuestionData}
              selectedAnswer={currentAnswer}
              onAnswerSelect={handleAnswerSelect}
              questionNumber={currentQuestion}
              totalQuestions={mockQuestions.length}
            />

            {/* Navigation */}
            <QuizNavigation
              currentQuestion={currentQuestion}
              totalQuestions={mockQuestions.length}
              hasAnswer={!!currentAnswer}
              onNext={handleNext}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
