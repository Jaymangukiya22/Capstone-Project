import React, { useState, useEffect } from 'react';
import QuizHeader from './quiz-interface/QuizHeader';
import QuestionCard from './quiz-interface/QuestionCard';
import QuizNavigation from './quiz-interface/QuizNavigation';
import QuizSidebar from './quiz-interface/QuizSidebar';
import { quizAttemptService, type QuizQuestion as BackendQuizQuestion } from '@/services/quizAttemptService';
import { toast } from '@/lib/toast';

const QuizInterface: React.FC = () => {
  
  // Quiz state management
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState(new Map<number, number[]>());
  const [questions, setQuestions] = useState<BackendQuizQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1800); // Will be set from backend
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(30); // Will be set from backend
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizTitle, setQuizTitle] = useState('Quiz');

  // Get answered questions set for progress tracking
  const answeredQuestions = new Set(answers.keys());

  // Initialize quiz from sessionStorage
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        const quizInfo = sessionStorage.getItem('currentQuiz');
        if (!quizInfo) {
          toast({
            title: "Error",
            description: "No quiz information found. Please start a quiz from the quiz selection page.",
            variant: "destructive"
          });
          window.location.pathname = '/student-quiz';
          return;
        }

        const { quizId, quizName } = JSON.parse(quizInfo);
        setQuizTitle(quizName || 'Quiz');

        // Start quiz attempt
        const startResponse = await quizAttemptService.startQuizAttempt(parseInt(quizId));
        if (!startResponse) {
          toast({
            title: "Error",
            description: "Failed to start quiz. Please try again.",
            variant: "destructive"
          });
          return;
        }

        if (startResponse.totalQuestions === 0) {
          toast({
            title: "No Questions Found",
            description: "This quiz doesn't have any questions assigned to it. Please contact your instructor.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        setAttemptId(startResponse.attemptId);
        setQuestions(startResponse.questions);
        setTimeRemaining(startResponse.timeLimit * startResponse.totalQuestions); // Total quiz time
        setQuestionTimeRemaining(startResponse.timeLimit); // Per question time
        setQuestionStartTime(Date.now());
        setIsLoading(false);

        toast({
          title: "Quiz Started!",
          description: `Good luck with your ${quizName} quiz! (${startResponse.totalQuestions} questions)`,
        });

      } catch (error) {
        console.error('Error initializing quiz:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeQuiz();
  }, []);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    const currentQuestionData = questions[currentQuestion - 1];
    if (!currentQuestionData) return;

    // Find the selected option ID
    const selectedOption = currentQuestionData.options.find(opt => opt.optionText === answer);
    if (!selectedOption) return;

    setAnswers(prev => new Map(prev.set(currentQuestion, [selectedOption.id])));
  };

  // Submit current answer to backend
  const submitCurrentAnswer = async () => {
    if (!attemptId) return;

    const currentQuestionData = questions[currentQuestion - 1];
    const selectedOptions = answers.get(currentQuestion) || [];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    if (selectedOptions.length > 0) {
      await quizAttemptService.submitAnswer(
        attemptId,
        currentQuestionData.id,
        selectedOptions,
        timeSpent
      );
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    // Submit current answer
    await submitCurrentAnswer();

    if (currentQuestion < questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionTimeRemaining(30); // Reset question timer
      setQuestionStartTime(Date.now());
    }
  };

  // Auto-advance to next question when time runs out
  const handleQuestionTimeUp = async () => {
    // Submit current answer (even if empty)
    await submitCurrentAnswer();

    if (currentQuestion < questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionTimeRemaining(30);
      setQuestionStartTime(Date.now());
    } else {
      // Last question - submit quiz
      handleSubmit();
    }
  };

  // Quiz submission
  const handleSubmit = async () => {
    if (!attemptId) return;

    setIsSubmitting(true);
    
    try {
      // Submit current answer if not already submitted
      await submitCurrentAnswer();

      // Complete the quiz attempt
      const completedAttempt = await quizAttemptService.completeQuizAttempt(attemptId);
      
      if (completedAttempt) {
        // Store results in sessionStorage for results page
        const quizResults = {
          score: completedAttempt.correctAnswers,
          totalQuestions: completedAttempt.totalQuestions,
          timeSpent: completedAttempt.timeSpent || Math.floor((Date.now() - startTime) / 1000),
          completedAt: completedAttempt.completedAt || new Date().toISOString(),
          studentName: "Current Student",
          attemptId: completedAttempt.id
        };
        
        sessionStorage.setItem('quizResults', JSON.stringify(quizResults));
        
        toast({
          title: "Quiz Completed!",
          description: `You scored ${completedAttempt.correctAnswers}/${completedAttempt.totalQuestions}`,
        });
        
        // Navigate to quiz results page
        window.location.pathname = '/quiz-results';
      } else {
        throw new Error('Failed to complete quiz attempt');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
    if (questionTimeRemaining <= 0 || isLoading) return;

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
  }, [questionTimeRemaining, currentQuestion, isLoading]);

  // Reset question timer when question changes
  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      // Get time limit from quiz data or use default
      const timeLimit = questions[0] ? 30 : 30; // You can get this from quiz settings
      setQuestionTimeRemaining(timeLimit);
    }
  }, [currentQuestion, isLoading, questions]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Show error state if no questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No questions found for this quiz.</p>
          <button 
            onClick={() => window.location.pathname = '/student-quiz'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Quiz Selection
          </button>
        </div>
      </div>
    );
  }

  // Get current question data
  const currentQuestionData = questions[currentQuestion - 1];
  const currentAnswerIds = answers.get(currentQuestion) || [];
  
  // Convert backend question to frontend format for compatibility
  const currentQuestionFormatted = currentQuestionData ? {
    id: currentQuestionData.id,
    question: currentQuestionData.questionText,
    options: currentQuestionData.options.slice(0, 4).map(opt => opt.optionText), // Ensure exactly 4 options
    correctAnswer: currentQuestionData.options.find(opt => opt.isCorrect)?.optionText || ''
  } : null;


  // Get current answer as string for compatibility
  const currentAnswer = currentAnswerIds.length > 0 
    ? currentQuestionData?.options.find(opt => opt.id === currentAnswerIds[0])?.optionText 
    : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Full-screen quiz mode indicator - hidden on mobile */}
      <div className="absolute top-2 right-2 z-50 hidden md:block">
        <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/20">
          Quiz Mode - Full Screen
        </div>
      </div>

      {/* Mobile-optimized layout */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Compact Quiz Header - Fixed height */}
        <div className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-border">
          <QuizHeader
            currentQuestion={currentQuestion}
            totalQuestions={questions.length}
            timeRemaining={timeRemaining}
            questionTimeRemaining={questionTimeRemaining}
            onTimeUp={handleTimeUp}
            quizTitle={quizTitle}
          />
        </div>

        {/* Main content area - Flexible height */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Quiz Sidebar - hidden on mobile and tablet */}
          <div className="hidden xl:block xl:w-80 2xl:w-96 flex-shrink-0 border-r border-border">
            <div className="h-full overflow-y-auto p-4">
              <QuizSidebar
                questions={questions.map(q => ({
                  id: q.id,
                  question: q.questionText,
                  options: q.options.slice(0, 4).map(opt => opt.optionText),
                  correctAnswer: q.options.find(opt => opt.isCorrect)?.optionText || ''
                }))}
                currentQuestion={currentQuestion}
                answeredQuestions={answeredQuestions}
              />
            </div>
          </div>

          {/* Main Quiz Content - Flexible layout */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Question Card - Takes available space, scrollable if needed */}
            <div className="flex-1 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 overflow-y-auto">
              {currentQuestionFormatted && (
                <QuestionCard
                  question={currentQuestionFormatted}
                  selectedAnswer={currentAnswer}
                  onAnswerSelect={handleAnswerSelect}
                  questionNumber={currentQuestion}
                  totalQuestions={questions.length}
                />
              )}
            </div>

            {/* Navigation - Fixed at bottom with ultra-compact padding for iPhone */}
            <div className="flex-shrink-0 px-3 py-1 sm:px-4 sm:py-2 md:px-6 md:py-3 border-t border-border bg-background/95 backdrop-blur-sm">
              <QuizNavigation
                currentQuestion={currentQuestion}
                totalQuestions={questions.length}
                hasAnswer={!!currentAnswer}
                onNext={handleNext}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
