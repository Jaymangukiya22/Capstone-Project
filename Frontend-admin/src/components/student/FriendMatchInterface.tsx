import React, { useState, useEffect, useRef } from 'react';
import QuizHeader from './quiz-interface/QuizHeader';
import QuestionCard from './quiz-interface/QuestionCard';
import QuizNavigation from './quiz-interface/QuizNavigation';
import QuizSidebar from './quiz-interface/QuizSidebar';
import { gameWebSocket } from '@/services/matchService';
import { toast } from '@/lib/toast';
import { Users, Wifi, WifiOff } from 'lucide-react';

const NET_IP=import.meta.env.VITE_NETWORK_IP
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
  firstName?: string;
  lastName?: string;
  isReady: boolean;
}


const FriendMatchInterface: React.FC = () => {
  // Match state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  // Removed renderKey to prevent infinite loops
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(true);
  
  // Quiz state management
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(new Map<number, number[]>());
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionData, setCurrentQuestionData] = useState<FriendMatchQuestion | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizTitle, setQuizTitle] = useState('Friend Match');
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  // WebSocket connection ref
  const wsConnected = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get answered questions set for progress tracking
  const answeredQuestions = new Set(answers.keys());

  // Initialize friend match from sessionStorage
  useEffect(() => {
    const initializeFriendMatch = async () => {
      try {
        const matchInfo = sessionStorage.getItem('friendMatch');
        if (!matchInfo) {
          console.error('No friend match info found');
          return;
        }

        const { mode, joinCode, matchId: storedMatchId, websocketUrl } = JSON.parse(matchInfo);
        console.log('🎮 Initializing friend match:', { mode, joinCode, matchId: storedMatchId });

        // Clear ALL previous match session data to allow replay
        // Clear all autostart keys
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('autostart_') || key.startsWith('started_')) {
            sessionStorage.removeItem(key);
          }
        });

        setJoinCode(joinCode);
        if (storedMatchId) {
          setMatchId(storedMatchId);
        }

        // Connect to WebSocket
        await connectToMatch(websocketUrl, mode, joinCode);
        
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
      // Get real user info from localStorage
      let userId = 1;
      let username = 'Player1';
      let firstName = '';
      let lastName = '';
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('Raw user data from localStorage:', userData);
          userId = userData.id;
          // Use email as username if available, otherwise use username
          username = userData.email || userData.username;
          firstName = userData.firstName || '';
          lastName = userData.lastName || '';
          console.log('Using real user data:', { userId, username, firstName, lastName });
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }

      // Set up event listeners BEFORE connecting, pass mode and joinCode
      setupWebSocketListeners(mode, joinCode);

      // Connect to WebSocket - pass the full user data
      console.log('Connecting with user data:', { userId, username, firstName, lastName });
      await gameWebSocket.connect(websocketUrl, userId, username);
      setIsConnected(true);
      wsConnected.current = true;

      // Actions will be performed after authentication in the listener

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

  const setupWebSocketListeners = (mode: 'create' | 'join', joinCode?: string) => {
    let hasPerformedAction = false; // Flag to prevent duplicate actions
    
    // Clear any existing listeners first to prevent duplicates
    gameWebSocket.removeAllListeners();
    
    // Authentication success - perform actions after authentication
    gameWebSocket.on('authenticated', (data: any) => {
      console.log('🔐 Authenticated:', data);
      console.log('🔍 Mode:', mode, 'MatchId:', matchId, 'JoinCode:', joinCode);
      
      // Prevent duplicate actions
      if (hasPerformedAction) {
        console.log('Action already performed, skipping...');
        return;
      }
      hasPerformedAction = true;
      
      // Now that we're authenticated, perform the appropriate action
      if (mode === 'create' && matchId) {
        console.log('🎯 Authenticated! Now connecting to match:', matchId);
        gameWebSocket.emit('connect_to_match', { matchId });
      } else if (mode === 'join' && joinCode) {
        console.log('🎯 Authenticated! Now joining match with code:', joinCode);
        gameWebSocket.joinMatchByCode(joinCode);
      } else if (joinCode && !matchId) {
        // Simple fix: treat based on mode
        
        // Simple fix: If mode is 'create', treat as creator, otherwise join
        if (mode === 'create') {
          console.log('🔧 USER IS CREATOR - Finding match by code first');
          // For creators, we need to get the match ID first, then connect
          fetch(`http://${NET_IP}:3000/api/friend-matches/code/${joinCode}`)
            .then(response => response.json())
            .then(data => {
              if (data.success && data.data.match) {
                const realMatchId = data.data.match.id;
                console.log('🎯 Found match ID:', realMatchId, 'Now connecting...');
                gameWebSocket.emit('connect_to_match', { matchId: realMatchId });
              } else {
                console.error('Failed to find match:', data);
                gameWebSocket.joinMatchByCode(joinCode);
              }
            })
            .catch(error => {
              console.error('Error finding match:', error);
              gameWebSocket.joinMatchByCode(joinCode);
            });
        } else {
          console.log('🔧 FORCING JOIN MODE - joinCode exists but matchId is null');
          console.log('🎯 Authenticated! Now joining match with code:', joinCode);
          gameWebSocket.joinMatchByCode(joinCode);
        }
      } else {
        console.error('❌ No valid action after authentication!', { mode, matchId, joinCode });
      }
    });

    // Match connected (when creator connects to their match)
    gameWebSocket.on('match_connected', (data: any) => {
      console.log('🔗 Connected to match:', data);
      setJoinCode(data.joinCode);
      const initialPlayers = data.players || [];
      console.log('📋 Creator connected, setting players:', initialPlayers);
      setPlayers([...initialPlayers]);
      
      // AUTO-START: If we have 2 players when creator connects, auto-start
      const autoStartKey = `autostart_${data.matchId}`;
      const hasAlreadyAutoStarted = sessionStorage.getItem(autoStartKey);
      
      if (initialPlayers.length === 2 && !hasAlreadyAutoStarted) {
        console.log('🚀 AUTO-STARTING: 2 players detected on creator connect');
        sessionStorage.setItem(autoStartKey, 'true');
        setTimeout(() => {
          gameWebSocket.setReady(true);
        }, 1000);
      }
      
      toast({
        title: "Connected to Match!",
        description: `Share code ${data.joinCode} with your friend`,
      });
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
      console.log('🎯 Match joined:', data);
      const joinedPlayers = data.players || [];
      console.log('📋 Initial players on join:', joinedPlayers);
      setPlayers([...joinedPlayers]);
      
      // AUTO-START: If we have 2 players on join, automatically set ready
      const autoStartKey = `autostart_${data.matchId}`;
      const hasAlreadyAutoStarted = sessionStorage.getItem(autoStartKey);
      
      if (joinedPlayers.length === 2 && !hasAlreadyAutoStarted) {
        console.log('🚀 AUTO-STARTING: 2 players detected on match join');
        sessionStorage.setItem(autoStartKey, 'true');
        setTimeout(() => {
          gameWebSocket.setReady(true);
        }, 1000);
      }
      
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

    // Player list updated
    gameWebSocket.on('player_list_updated', (data: any) => {
      const newPlayers = data.players || [];
      
      // Update players without re-render key to avoid loops
      setPlayers([...newPlayers]);
      
      // AUTO-START: If we have 2 players, automatically set both as ready (only once per session)
      const autoStartKey = `autostart_${matchId}`;
      const hasAlreadyAutoStarted = sessionStorage.getItem(autoStartKey);
      
      if (newPlayers.length === 2 && !hasAlreadyAutoStarted) {
        console.log('🚀 AUTO-STARTING: 2 players detected');
        sessionStorage.setItem(autoStartKey, 'true');
        setTimeout(() => {
          gameWebSocket.setReady(true);
        }, 1000);
      }
    });

    // Player ready
    gameWebSocket.on('player_ready', (data: any) => {
      console.log('Player ready:', data);
      setPlayers(prev => {
        const updated = prev.map(p => 
          p.userId === data.userId ? { ...p, isReady: data.isReady } : p
        );
        console.log('Updated players after ready:', updated);
        
        // Check if all players are ready
        const allReady = updated.every(p => p.isReady);
        const readyCount = updated.filter(p => p.isReady).length;
        console.log(`🔍 Ready status: ${readyCount}/${updated.length} players ready. All ready: ${allReady}`);
        
        return updated;
      });
    });

    // Match started
    gameWebSocket.on('match_started', (data: any) => {
      // Prevent duplicate processing with unique timestamp
      const matchStartKey = `started_${matchId}_${Date.now()}`;
      const existingKeys = Object.keys(sessionStorage).filter(key => key.startsWith(`started_${matchId}_`));
      
      if (existingKeys.length > 0) {
        console.log('🚫 Match already started, ignoring duplicate event');
        return;
      }
      
      console.log('🚀 MATCH STARTED EVENT RECEIVED!', data);
      sessionStorage.setItem(matchStartKey, 'true');
      
      setIsWaitingForPlayers(false);
      setIsLoading(false);
      setCurrentQuestionData(data.question);
      setCurrentQuestion(1);
      
      // Set totalQuestions with fallback
      const totalQs = data.totalQuestions || data.questions?.length || 10;
      setTotalQuestions(totalQs);
      console.log('📊 Total questions set to:', totalQs);
      
      setQuestionTimeRemaining(data.question.timeLimit || 30);
      setQuestionStartTime(Date.now());
      
      toast({
        title: "Match Started!",
        description: "Good luck!",
      });
    });

    // Next question
    gameWebSocket.on('next_question', (data: any) => {
      console.log('📝 NEXT QUESTION EVENT:', data);
      
      // Reset timer and update question
      setCurrentQuestionData(data.question);
      setCurrentQuestion(data.questionIndex + 1); // Use server's question index
      setQuestionTimeRemaining(data.question.timeLimit || 30);
      setQuestionStartTime(Date.now());
      setIsSubmitting(false);
      
      // Update totalQuestions if provided in the event
      if (data.totalQuestions) {
        setTotalQuestions(data.totalQuestions);
      }
      
      console.log(`📝 Moving to question ${data.questionIndex + 1} of ${data.totalQuestions || totalQuestions}`);
    });

    // Individual player progression (for independent advancement)
    gameWebSocket.on('player_next_question', (data: any) => {
      console.log('📝 INDIVIDUAL NEXT QUESTION:', data);
      
      // Only advance if this is for the current player
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (data.userId === user.id) {
            setCurrentQuestionData(data.question);
            setCurrentQuestion(data.questionIndex + 1);
            setQuestionTimeRemaining(data.question.timeLimit || 30);
            setQuestionStartTime(Date.now());
            setIsSubmitting(false);
            
            // Update totalQuestions if provided
            if (data.totalQuestions) {
              setTotalQuestions(data.totalQuestions);
            }
            
            console.log(`📝 Individual next question: ${data.questionIndex + 1} of ${data.totalQuestions || totalQuestions}`);
          }
        } catch (e) {}
      }
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
      
      // Store results for the results page
      const results = {
        matchId: data.matchId,
        results: data.results,
        winner: data.winner,
        completedAt: new Date().toISOString(),
        isFriendMatch: true
      };
      
      sessionStorage.setItem('friendMatchResults', JSON.stringify(results));
      sessionStorage.setItem('quizResults', JSON.stringify(results)); // For QuizResults component
      
      toast({
        title: "Match Complete!",
        description: `Winner: ${data.winner.username}`,
      });
      
      // Navigate to results page after a short delay
      setTimeout(() => {
        console.log('🏁 Match completed - navigating to results page');
        window.location.pathname = '/quiz-results';
      }, 2000);
    });

    // Individual player completed (when one player finishes before the other)
    gameWebSocket.on('player_completed', (data: any) => {
      console.log('Player completed individually:', data);
      
      // Check if this is the current player
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (data.userId === user.id) {
            // Store individual results
            const results = {
              matchId: data.matchId,
              playerResults: data.playerResults,
              completedAt: new Date().toISOString(),
              isFriendMatch: true,
              isIndividualCompletion: true
            };
            
            sessionStorage.setItem('friendMatchResults', JSON.stringify(results));
            sessionStorage.setItem('quizResults', JSON.stringify(results));
            
            toast({
              title: "Quiz Complete!",
              description: "Waiting for other player to finish...",
            });
            
            // Navigate to results page
            setTimeout(() => {
              console.log('🏁 Individual completion - navigating to results page');
              window.location.pathname = '/quiz-results';
            }, 1500);
          }
        } catch (e) {}
      }
    });

    // Player disconnected
    gameWebSocket.on('player_disconnected', (data: any) => {
      console.log('Player disconnected:', data);
      
      // Only show disconnection toast if the match is still active
      // Don't show if quiz is completing or already completed
      if (!isSubmitting && currentQuestionData) {
        toast({
          title: "Player Disconnected",
          description: `${data.username || 'A player'} left the match`,
          variant: "destructive"
        });
      }
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
    if (!currentQuestionData) {
      console.log('❌ No current question data to submit');
      return;
    }

    const selectedOptions = answers.get(currentQuestion) || [];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    console.log('📤 Submitting answer:', {
      questionId: currentQuestionData.id,
      selectedOptions,
      timeSpent,
      currentQuestion
    });

    try {
      if (selectedOptions.length > 0) {
        gameWebSocket.submitAnswer(currentQuestionData.id, selectedOptions, timeSpent);
      } else {
        console.log('⚠️ No options selected, submitting empty answer');
        gameWebSocket.submitAnswer(currentQuestionData.id, [], timeSpent);
      }
    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive"
      });
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
    
    // Check if this is the last question
    if (currentQuestion >= totalQuestions) {
      console.log('🏁 Last question submitted - quiz should complete');
      
      // Navigate to results page immediately for better UX
      setTimeout(() => {
        console.log('🏁 Individual completion - navigating to results page');
        
        // Create individual results data
        const individualResults = {
          matchId: matchId,
          playerResults: {
            score: Array.from(answers.values()).reduce((total, answer) => total + (answer.length > 0 ? 1 : 0), 0),
            answers: Array.from(answers.entries()).map(([questionId, selectedOptions]) => ({
              questionId,
              selectedOptions,
              isCorrect: selectedOptions.length > 0 // Simplified - actual correctness would come from backend
            }))
          },
          completedAt: new Date().toISOString(),
          isFriendMatch: true,
          isIndividualCompletion: true
        };
        
        sessionStorage.setItem('friendMatchResults', JSON.stringify(individualResults));
        sessionStorage.setItem('quizResults', JSON.stringify(individualResults));
        
        window.location.pathname = '/quiz-results';
      }, 1000);
    } else {
      console.log(`📝 Question ${currentQuestion} submitted - waiting for next question`);
      
      // For better UX, show a brief "submitted" state then wait for backend
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  // Handle time up
  const handleTimeUp = () => {
    submitCurrentAnswer();
  };

  // Function to get display name for a player
  const getPlayerDisplayName = (player: MatchPlayer) => {
    if (player.firstName || player.lastName) {
      return `${player.firstName} ${player.lastName}`.trim();
    }
    return player.username;
  };

  // Timer countdown effect for individual questions
  useEffect(() => {
    if (questionTimeRemaining <= 0 || isLoading || isWaitingForPlayers) return;

    const questionTimer = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          console.log('⏰ Time up! Auto-submitting current answer...');
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(questionTimer);
  }, [questionTimeRemaining, currentQuestion, isLoading, isWaitingForPlayers]);

  // Remove duplicate timer - using the one above

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsConnected.current) {
        gameWebSocket.disconnect();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Show loading state
  if (isLoading) {
    console.log('🔄 STILL LOADING - isLoading:', isLoading, 'isWaitingForPlayers:', isWaitingForPlayers);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading friend match...</p>
          <div className="mt-4 text-xs text-gray-500">
            <div>isLoading: {isLoading.toString()}</div>
            <div>isWaitingForPlayers: {isWaitingForPlayers.toString()}</div>
            <div>currentQuestionData: {currentQuestionData ? 'Present' : 'Missing'}</div>
          </div>
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
                  <div key={player.userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">{getPlayerDisplayName(player)}</span>
                      <span className="text-xs text-muted-foreground">@{player.username}</span>
                    </div>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${player.isReady ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {player.isReady ? '✓ Ready' : 'Waiting...'}
                    </span>
                  </div>
                ))}
              </div>
              
              {players.length >= 1 && (
                <div className="mt-4">
                  {/* Debug info */}
                  <div className="text-xs text-muted-foreground mb-2 p-2 bg-gray-100 rounded">
                    <div>Players Count: {players.length}</div>
                    <div>All Ready: {players.every(p => p.isReady) ? 'Yes' : 'No'}</div>
                    <div>Players State: {JSON.stringify(players.map(p => ({id: p.userId, name: p.username, ready: p.isReady})))}</div>
                    <div className="text-red-600 font-bold">🔴 READY BUTTON SHOULD BE VISIBLE BELOW</div>
                  </div>
                  
                  {/* Get current user */}
                  {(() => {
                    const userData = localStorage.getItem('user');
                    let currentUserId = 1;
                    if (userData) {
                      try {
                        const user = JSON.parse(userData);
                        currentUserId = user.id;
                      } catch (e) {}
                    }
                    
                    const currentPlayer = players.find(p => p.userId === currentUserId);
                    const isCurrentPlayerReady = currentPlayer?.isReady || false;
                    
                    return (
                      <button
                        onClick={() => {
                          console.log('🔘 READY BUTTON CLICKED!');
                          console.log('Current player:', currentPlayer);
                          console.log('Current ready status:', isCurrentPlayerReady);
                          console.log('Setting ready status to:', !isCurrentPlayerReady);
                          console.log('All players:', players);
                          console.log('🚀 SENDING player_ready event');
                          gameWebSocket.setReady(!isCurrentPlayerReady);
                        }}
                        className={`w-full px-4 py-2 rounded-md transition-colors ${
                          isCurrentPlayerReady 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                        disabled={players.length < 1}
                      >
                        {isCurrentPlayerReady ? '✓ Ready!' : "I'm Ready!"}
                      </button>
                    );
                  })()
                  }
                </div>
              )}
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
          timeRemaining={questionTimeRemaining}
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
