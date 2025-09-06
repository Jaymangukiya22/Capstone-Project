import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuizPreview = ({ quizData = {}, questions = [], gameConfig = {}, className = '' }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [previewMode, setPreviewMode] = useState('player'); // 'player' or 'admin'

  // Mock quiz data
  const mockQuizData = {
    title: "JavaScript Fundamentals Quiz",
    description: "Test your knowledge of JavaScript basics",
    category: "Programming",
    difficulty: "intermediate",
    estimatedTime: 15,
    ...quizData
  };

  const mockQuestions = [
    {
      id: 1,
      text: "What is the correct way to declare a variable in JavaScript?",
      type: "multiple_choice",
      difficulty: "easy",
      points: 10,
      timeLimit: 30,
      answers: [
        { text: "var myVariable;", isCorrect: true },
        { text: "variable myVariable;", isCorrect: false },
        { text: "v myVariable;", isCorrect: false },
        { text: "declare myVariable;", isCorrect: false }
      ]
    },
    {
      id: 2,
      text: "JavaScript is a compiled language.",
      type: "true_false",
      difficulty: "easy",
      points: 5,
      timeLimit: 20,
      answers: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true }
      ]
    },
    {
      id: 3,
      text: "What does DOM stand for?",
      type: "fill_blank",
      difficulty: "intermediate",
      points: 15,
      timeLimit: 45,
      answers: [
        { text: "Document Object Model", isCorrect: true },
        { text: "document object model", isCorrect: true }
      ]
    }
  ];

  const previewQuestions = questions?.length > 0 ? questions : mockQuestions;
  const currentQuestion = previewQuestions?.[currentQuestionIndex];

  const mockGameConfig = {
    timePerQuestion: 30,
    showCorrectAnswer: true,
    autoAdvance: false,
    pointsPerCorrect: 10,
    ...gameConfig
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining]);

  const startPreview = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTimeRemaining(mockGameConfig?.timePerQuestion);
    setIsTimerActive(true);
    setShowResults(false);
    setScore(0);
  };

  const handleAnswerSelect = (answerIndex) => {
    if (!isTimerActive) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion?.id]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < previewQuestions?.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeRemaining(mockGameConfig?.timePerQuestion);
    } else {
      finishQuiz();
    }
  };

  const handleTimeUp = () => {
    setIsTimerActive(false);
    if (mockGameConfig?.autoAdvance) {
      setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    }
  };

  const finishQuiz = () => {
    setIsTimerActive(false);
    calculateScore();
    setShowResults(true);
  };

  const calculateScore = () => {
    let totalScore = 0;
    previewQuestions?.forEach(question => {
      const selectedIndex = selectedAnswers?.[question?.id];
      if (selectedIndex !== undefined && question?.answers?.[selectedIndex]?.isCorrect) {
        totalScore += question?.points;
      }
    });
    setScore(totalScore);
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / previewQuestions?.length) * 100;
  };

  const getTotalPossibleScore = () => {
    return previewQuestions?.reduce((total, question) => total + question?.points, 0);
  };

  const getScorePercentage = () => {
    return Math.round((score / getTotalPossibleScore()) * 100);
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    return (
      <div className="space-y-6">
        {/* Question Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
              Question {currentQuestionIndex + 1} of {previewQuestions?.length}
            </span>
            <span className="px-3 py-1 bg-accent text-accent-foreground text-sm rounded-full">
              {currentQuestion?.points} points
            </span>
          </div>
          
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            timeRemaining <= 10 ? 'bg-error text-error-foreground' : 'bg-warning text-warning-foreground'
          }`}>
            <Icon name="Clock" size={16} />
            <span className="font-mono font-medium">{timeRemaining}s</span>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        {/* Question Text */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-xl font-semibold text-text-primary mb-4 whitespace-pre-wrap">
            {currentQuestion?.text}
          </h3>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion?.answers?.map((answer, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={!isTimerActive}
                className={`w-full p-4 text-left border rounded-lg transition-smooth hover-scale ${
                  selectedAnswers?.[currentQuestion?.id] === index
                    ? 'border-primary bg-primary/10 text-primary' :'border-border hover:border-primary/50 hover:bg-accent'
                } ${!isTimerActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswers?.[currentQuestion?.id] === index
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border'
                  }`}>
                    {selectedAnswers?.[currentQuestion?.id] === index && (
                      <Icon name="Check" size={14} />
                    )}
                  </div>
                  <span className="text-sm font-medium">{answer?.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            iconName="ChevronLeft"
            iconPosition="left"
            iconSize={16}
          >
            Previous
          </Button>

          <div className="flex items-center space-x-3">
            {mockGameConfig?.allowSkip && (
              <Button
                variant="ghost"
                onClick={handleNextQuestion}
                iconName="SkipForward"
                iconPosition="left"
                iconSize={16}
              >
                Skip
              </Button>
            )}
            
            <Button
              variant="default"
              onClick={handleNextQuestion}
              disabled={selectedAnswers?.[currentQuestion?.id] === undefined}
              iconName={currentQuestionIndex === previewQuestions?.length - 1 ? "Flag" : "ChevronRight"}
              iconPosition="right"
              iconSize={16}
            >
              {currentQuestionIndex === previewQuestions?.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Trophy" size={32} color="white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Quiz Complete!</h2>
          <p className="text-text-secondary">Here's how you performed</p>
        </div>
        {/* Score Summary */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">{score}</div>
              <div className="text-sm text-text-secondary">Total Points</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">{getScorePercentage()}%</div>
              <div className="text-sm text-text-secondary">Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning mb-2">
                {Object.keys(selectedAnswers)?.length}
              </div>
              <div className="text-sm text-text-secondary">Questions Answered</div>
            </div>
          </div>
        </div>
        {/* Question Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Question Review</h3>
          
          {previewQuestions?.map((question, index) => {
            const selectedIndex = selectedAnswers?.[question?.id];
            const isCorrect = selectedIndex !== undefined && question?.answers?.[selectedIndex]?.isCorrect;
            
            return (
              <div key={question?.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedIndex === undefined 
                      ? 'bg-muted text-text-secondary'
                      : isCorrect 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-error text-error-foreground'
                  }`}>
                    {selectedIndex === undefined ? (
                      <Icon name="Minus" size={16} />
                    ) : isCorrect ? (
                      <Icon name="Check" size={16} />
                    ) : (
                      <Icon name="X" size={16} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-text-primary mb-2">
                      {question?.text}
                    </p>
                    
                    {selectedIndex !== undefined && (
                      <p className="text-sm text-text-secondary">
                        Your answer: {question?.answers?.[selectedIndex]?.text}
                      </p>
                    )}
                    
                    {mockGameConfig?.showCorrectAnswer && (
                      <p className="text-sm text-success">
                        Correct answer: {question?.answers?.find(a => a?.isCorrect)?.text}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">
                      {isCorrect ? question?.points : 0} / {question?.points}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            onClick={startPreview}
            iconName="RotateCcw"
            iconPosition="left"
            iconSize={16}
          >
            Retake Quiz
          </Button>
          
          <Button
            variant="default"
            onClick={() => setShowResults(false)}
            iconName="ArrowLeft"
            iconPosition="left"
            iconSize={16}
          >
            Back to Preview
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Quiz Preview</h3>
          <p className="text-text-secondary">Test your quiz before publishing</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={previewMode === 'player' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('player')}
            >
              Player View
            </Button>
            <Button
              variant={previewMode === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode('admin')}
            >
              Admin View
            </Button>
          </div>
        </div>
      </div>
      {/* Quiz Info */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              {mockQuizData?.title}
            </h2>
            <p className="text-text-secondary mb-4">
              {mockQuizData?.description}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-text-secondary">
              <div className="flex items-center space-x-1">
                <Icon name="FolderTree" size={14} />
                <span>{mockQuizData?.category}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="BarChart3" size={14} />
                <span className="capitalize">{mockQuizData?.difficulty}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Clock" size={14} />
                <span>~{mockQuizData?.estimatedTime} min</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="HelpCircle" size={14} />
                <span>{previewQuestions?.length} questions</span>
              </div>
            </div>
          </div>
          
          {!isTimerActive && !showResults && (
            <Button
              variant="default"
              onClick={startPreview}
              iconName="Play"
              iconPosition="left"
              iconSize={16}
            >
              Start Preview
            </Button>
          )}
        </div>
      </div>
      {/* Preview Content */}
      {showResults ? (
        renderResults()
      ) : isTimerActive ? (
        renderQuestion()
      ) : (
        <div className="text-center py-12">
          <Icon name="Play" size={48} className="text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Ready to Preview</h3>
          <p className="text-text-secondary mb-6">
            Click "Start Preview" to experience your quiz as a player would
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
            <div className="p-4 bg-accent rounded-lg">
              <Icon name="Timer" size={20} className="text-primary mx-auto mb-2" />
              <div className="font-medium text-text-primary">Timed Questions</div>
              <div className="text-text-secondary">{mockGameConfig?.timePerQuestion}s per question</div>
            </div>
            
            <div className="p-4 bg-accent rounded-lg">
              <Icon name="Target" size={20} className="text-primary mx-auto mb-2" />
              <div className="font-medium text-text-primary">Scoring System</div>
              <div className="text-text-secondary">Points-based scoring</div>
            </div>
            
            <div className="p-4 bg-accent rounded-lg">
              <Icon name="Shuffle" size={20} className="text-primary mx-auto mb-2" />
              <div className="font-medium text-text-primary">Question Order</div>
              <div className="text-text-secondary">
                {mockGameConfig?.shuffleQuestions ? 'Randomized' : 'Sequential'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPreview;