import React, { useState, useEffect, useRef } from 'react';
import QuizHeader from './quiz-interface/QuizHeader';
import QuestionCard from './quiz-interface/QuestionCard';
import QuizNavigation from './quiz-interface/QuizNavigation';
import QuizSidebar from './quiz-interface/QuizSidebar';
import { gameWebSocket } from '@/services/matchService';
import { toast } from '@/lib/toast';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface FriendMatchQuestion {
  id: number;
  questionText: string;
  options: Array<{
    id: number;
    optionText: string;
  }>;
  timeLimit: number;
}

interface MatchPlayer {
  userId: number;
  username: string;
  isReady: boolean;
}

const FriendMatchInterface: React.FC = () => {
  // Match state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(true);
  
  // Quiz state management
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState(new Map<number, number[]>());
  const [questions, setQuestions] = useState<FriendMatchQuestion[]>([]);
  const [currentQuestionData, setCurrentQuestionData] = useState<FriendMatchQuestion | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizTitle, setQuizTitle] = useState('Friend Match');
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  // WebSocket connection ref
  const wsConnected = useRef(false);

  // Get answered questions set for progress tracking
  const answeredQuestions = new Set(answers.keys());

  // Initialize friend match from sessionStorage
  useEffect(() => {
    const initializeFriendMatch = async () => {
      try {
        const matchInfo = sessionStorage.getItem('friendMatch');
        if (!matchInfo) {
          toast({
            title: "Error",
            description: "No friend match information found. Please start a match from the quiz selection page.",
            variant: "destructive"
          });
          window.location.pathname = '/student-quiz';
          return;
        }

        const { matchId: storedMatchId, joinCode: storedJoinCode, websocketUrl, quizName, mode } = JSON.parse(matchInfo);
        setMatchId(storedMatchId);
        setJoinCode(storedJoinCode);
        setQuizTitle(quizName || 'Friend Match');

        // Connect to WebSocket
        await connectToMatch(websocketUrl, mode, storedJoinCode);
        
      } catch (error) {
        console.error('Error initializing friend match:', error);
        toast({
          title: "Error",
          description: "Failed to initialize friend match. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeFriendMatch();
  }, []);

  const connectToMatch = async (websocketUrl: string, mode: 'create' | 'join', joinCode?: string) => {
    try {
      // Get user info (in a real app, this would come from auth context)
      const userId = 1; // Mock user ID
      const username = `Player${userId}`;

      await gameWebSocket.connect(websocketUrl, userId, username);
      setIsConnected(true);
      wsConnected.current = true;

      // Set up event listeners
      setupWebSocketListeners();

      if (mode === 'create') {
        // If creating, the match should already be created via HTTP API
        gameWebSocket.setReady();
      } else if (mode === 'join' && joinCode) {
        // Join the match by code
        gameWebSocket.joinMatchByCode(joinCode);
      }

    } catch (error) {
      console.error('Failed to connect to match:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to match. Please try again.",
        variant: "destructive"
      });
      setIsConnected(false);
    }
  };

  const setupWebSocketListeners = () => {
    // Authentication success
    gameWebSocket.on('authenticated', (data: any) => {
      console.log('Authenticated:', data);
    });

    // Friend match created
    gameWebSocket.on('friend_match_created', (data: any) => {
      console.log('Friend match created:', data);
      setJoinCode(data.joinCode);
      toast({
        title: "Match Created!",
        description: `Share code ${data.joinCode} with your friend`,
      });
    });

    // Match joined
    gameWebSocket.on('match_joined', (data: any) => {
      console.log('Match joined:', data);
      setPlayers(data.players || []);
      toast({
        title: "Match Joined!",
        description: "Waiting for all players to be ready...",
      });
    });

    // Player joined
    gameWebSocket.on('player_joined', (data: any) => {
      console.log('Player joined:', data);
      toast({
        title: "Player Joined",
        description: `${data.username} joined the match`,
      });
    });

    // Player ready
    gameWebSocket.on('player_ready', (data: any) => {
      console.log('Player ready:', data);
      setPlayers(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, isReady: true } : p
      ));
    });

    // Match started
    gameWebSocket.on('match_started', (data: any) => {
      console.log('Match started:', data);
      setIsWaitingForPlayers(false);
      setIsLoading(false);
      setCurrentQuestionData(data.question);
      setCurrentQuestion(1);
      setTotalQuestions(data.totalQuestions);
      setQuestionTimeRemaining(data.question.timeLimit);
      setQuestionStartTime(Date.now());
      
      toast({
        title: "Match Started!",
        description: "Good luck!",
      });
    });

    // Next question
    gameWebSocket.on('next_question', (data: any) => {
      console.log('Next question:', data);
      setCurrentQuestionData(data.question);
      setCurrentQuestion(data.questionIndex + 1);
      setQuestionTimeRemaining(data.question.timeLimit);
      setQuestionStartTime(Date.now());
    });

    // Answer result
    gameWebSocket.on('answer_result', (data: any) => {
      console.log('Answer result:', data);
      // Show feedback to user
      if (data.isCorrect) {
        toast({
          title: "Correct!",
          description: `+${data.points} points`,
        });
      }
    });

    // Player answered
    gameWebSocket.on('player_answered', (data: any) => {
      console.log('Player answered:', data);
      // Show that opponent answered
      toast({
        title: "Opponent Answered",
        description: `${data.username} submitted their answer`,
      });
    });

    // Match completed
    gameWebSocket.on('match_completed', (data: any) => {
      console.log('Match completed:', data);
      
      // Store results for leaderboard
      const results = {
        matchId: matchId,
        rankings: data.rankings,
        winner: data.winner,
        isFriendMatch: true,
        completedAt: new Date().toISOString()
      };
      
      sessionStorage.setItem('friendMatchResults', JSON.stringify(results));
      
      toast({
        title: "Match Complete!",
        description: `Winner: ${data.winner.username}`,
      });
      
      // Navigate to results
      setTimeout(() => {
        window.location.pathname = '/quiz-results';
      }, 2000);
    });

    // Player disconnected
    gameWebSocket.on('player_disconnected', (data: any) => {
      console.log('Player disconnected:', data);
      toast({
        title: "Player Disconnected",
        description: `${data.username} left the match`,
        variant: "destructive"
      });
    });

    // Error handling
    gameWebSocket.on('error', (data: any) => {
      console.error('WebSocket error:', data);
      toast({
        title: "Error",
        description: data.message || "An error occurred",
        variant: "destructive"
      });
    });
  };

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestionData) return;

    // Find the selected option ID
    const selectedOption = currentQuestionData.options.find(opt => opt.optionText === answer);
    if (!selectedOption) return;

    setAnswers(prev => new Map(prev.set(currentQuestion, [selectedOption.id])));
  };

  // Submit current answer
  const submitCurrentAnswer = () => {
    if (!currentQuestionData) return;

    const selectedOptions = answers.get(currentQuestion) || [];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    if (selectedOptions.length > 0) {
      gameWebSocket.submitAnswer(currentQuestionData.id, selectedOptions, timeSpent);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    submitCurrentAnswer();
  };

  // Quiz submission
  const handleSubmit = () => {
    submitCurrentAnswer();
    setIsSubmitting(true);
  };

  // Handle time up
  const handleTimeUp = () => {
    submitCurrentAnswer();
  };

  // Timer countdown effect for individual questions
  useEffect(() => {
    if (questionTimeRemaining <= 0 || isLoading || isWaitingForPlayers) return;

    const questionTimer = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(questionTimer);
  }, [questionTimeRemaining, currentQuestion, isLoading, isWaitingForPlayers]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsConnected.current) {
        gameWebSocket.disconnect();
      }
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to match...</p>
        </div>
      </div>
    );
  }

  // Show waiting for players state
  if (isWaitingForPlayers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <Users size={64} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for Players</h2>
            <p className="text-muted-foreground">
              Share the join code with your friend to start the match
            </p>
          </div>
          
          {joinCode && (
            <div className="bg-card border rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Join Code</p>
              <div className="text-3xl font-mono font-bold text-primary tracking-wider">
                {joinCode}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-sm">
            {isConnected ? (
              <>
                <Wifi size={16} className="text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-red-500" />
                <span className="text-red-500">Disconnected</span>
              </>
            )}
          </div>

          {players.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Players ({players.length}/2)</h3>
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.userId} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>{player.username}</span>
                    <span className={`text-sm ${player.isReady ? 'text-green-500' : 'text-yellow-500'}`}>
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state if no question
  if (!currentQuestionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No question data available.</p>
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

  // Convert to format expected by QuestionCard
  const questionForCard = {
    id: currentQuestionData.id,
    question: currentQuestionData.questionText,
    options: currentQuestionData.options.map(opt => opt.optionText),
    correctAnswer: '' // Not needed for display
  };

  // Get current answer as string
  const currentAnswerIds = answers.get(currentQuestion) || [];
  const currentAnswer = currentAnswerIds.length > 0 
    ? currentQuestionData.options.find(opt => opt.id === currentAnswerIds[0])?.optionText 
    : undefined;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Connection status indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        {isConnected ? (
          <>
            <Wifi size={16} className="text-green-500" />
            <span className="text-xs text-green-500">Connected</span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="text-red-500" />
            <span className="text-xs text-red-500">Disconnected</span>
          </>
        )}
        <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/20">
          Friend Match - {joinCode}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Quiz Header */}
        <QuizHeader
          currentQuestion={currentQuestion}
          totalQuestions={totalQuestions}
          timeRemaining={timeRemaining}
          questionTimeRemaining={questionTimeRemaining}
          onTimeUp={handleTimeUp}
          quizTitle={quizTitle}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Quiz Sidebar */}
          <div className="xl:col-span-1">
            <QuizSidebar
              questions={Array(totalQuestions).fill(null).map((_, i) => ({
                id: i + 1,
                question: `Question ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A'
              }))}
              currentQuestion={currentQuestion}
              answeredQuestions={answeredQuestions}
            />
          </div>

          {/* Main Quiz Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Question Card */}
            <QuestionCard
              question={questionForCard}
              selectedAnswer={currentAnswer}
              onAnswerSelect={handleAnswerSelect}
              questionNumber={currentQuestion}
              totalQuestions={totalQuestions}
            />

            {/* Navigation */}
            <QuizNavigation
              currentQuestion={currentQuestion}
              totalQuestions={totalQuestions}
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

export default FriendMatchInterface;
