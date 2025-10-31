import React, { useState, useEffect } from 'react';
import QuizHeader from './quiz-interface/QuizHeader';
import QuestionCard from './quiz-interface/QuestionCard';
import QuizNavigation from './quiz-interface/QuizNavigation';
import QuizSidebar from './quiz-interface/QuizSidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { quizAttemptService, type QuizQuestion as BackendQuizQuestion } from '@/services/quizAttemptService';
import { toast } from '@/lib/toast';
import { useQuizNavigationGuard } from '@/hooks/useNavigationGuard';
import { useQuizSession } from '@/utils/quizSessionManager';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  
  // Quiz session management
  const {
    getCurrentSession,
    updateSession,
    completeSession,
    validateQuizAccess,
    forceEndSession
  } = useQuizSession();

  // Navigation guard to prevent going back during quiz
  const { disableGuard } = useQuizNavigationGuard(!isLoading && questions.length > 0, isQuizCompleted);

  // Get answered questions set for progress tracking
  const answeredQuestions = new Set(answers.keys());

  // Initialize quiz from sessionStorage
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        // Validate quiz access using session manager
        const validation = validateQuizAccess();
        if (!validation.canAccess) {
          toast({
            title: "Error",
            description: validation.reason || "Cannot access quiz",
            variant: "destructive"
          });
          window.location.pathname = validation.redirectTo || '/student-quiz';
          return;
        }

        const currentSession = getCurrentSession();
        if (!currentSession) {
          toast({
            title: "Error",
            description: "No active quiz session found. Please start a quiz from the quiz selection page.",
            variant: "destructive"
          });
          window.location.pathname = '/student-quiz';
          return;
        }

        const { quizId, quizName, mode } = currentSession;
        setQuizTitle(quizName || 'Quiz');
        
        console.log(`🎯 Initializing ${mode} quiz:`, { quizId, quizName });

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
        
        // Update session with attempt ID
        updateSession({ attemptId: startResponse.attemptId });
        
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

      // Prepare submission data
      const submissionData = {
        answers: Array.from(answers.entries()).map(([questionId, optionIds]) => ({
          questionId,
          selectedOptionIds: optionIds
        }))
      };

      // Submit the quiz attempt
      const result = await quizAttemptService.submitQuizAttempt(attemptId, submissionData);
      
      // Store results in sessionStorage for results page
      const quizResults = {
        score: result.score,
        totalQuestions: result.totalQuestions,
        timeSpent: result.timeSpent,
        completedAt: new Date().toISOString(),
        studentName: "Current Student",
        leaderboard: result.leaderboard || []
      };
        
      // Mark quiz as completed and disable navigation guard
      setIsQuizCompleted(true);
      disableGuard();
      
      // Complete session using session manager
      completeSession(quizResults);
      
      toast({
        title: "Quiz Completed!",
        description: `You scored ${result.score}/${result.totalQuestions}`,
      });
      
      // Replace current history entry to prevent going back to quiz
      window.history.replaceState(null, '', '/quiz-results');
      
      // Navigate to quiz results page
      window.location.pathname = '/quiz-results';
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
    <div className="min-h-screen bg-background relative">
      {/* Mobile Header with Menu Button - Only on mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-40">
        <h1 className="text-lg font-semibold truncate flex-1">{quizTitle}</h1>
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4 mr-2" />
              Progress
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-4">
            <SheetHeader>
              <SheetTitle>Quiz Progress</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
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
          </SheetContent>
        </Sheet>
      </div>

      {/* Full-screen quiz mode indicator - Desktop only */}
      <div className="hidden lg:block absolute top-4 right-4 z-50">
        <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/20">
          Quiz Mode
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
        {/* Quiz Header - Responsive */}
        <div className="mb-4 md:mb-6">
          <QuizHeader
            currentQuestion={currentQuestion}
            totalQuestions={questions.length}
            timeRemaining={timeRemaining}
            questionTimeRemaining={questionTimeRemaining}
            onTimeUp={handleTimeUp}
            quizTitle={quizTitle}
          />
        </div>

        {/* Navigation Warning Banner */}
        {!isLoading && questions.length > 0 && !isQuizCompleted && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                Quiz in Progress - Navigation is blocked until completion
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
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

          {/* Main Quiz Content - Responsive */}
          <div className="lg:col-span-3 space-y-4 md:space-y-6">
            {/* Question Card */}
            {currentQuestionFormatted && (
              <QuestionCard
                question={currentQuestionFormatted}
                selectedAnswer={currentAnswer}
                onAnswerSelect={handleAnswerSelect}
                questionNumber={currentQuestion}
                totalQuestions={questions.length}
              />
            )}

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
