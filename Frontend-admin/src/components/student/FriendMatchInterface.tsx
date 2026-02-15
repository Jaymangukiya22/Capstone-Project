import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import QuizHeader from './quiz-interface/QuizHeader';
import QuestionCard from './quiz-interface/QuestionCard';
import QuizNavigation from './quiz-interface/QuizNavigation';
import QuizSidebar from './quiz-interface/QuizSidebar';
import { gameWebSocket } from '@/services/matchService';
import { toast } from '@/lib/toast';

import { Users, Wifi, WifiOff } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useQuizNavigationGuard } from '@/hooks/useNavigationGuard';
import { matchStateManager } from '@/utils/matchStateManager';

// --- OPTIMIZATION 1: Memoized Components to prevent re-renders ---
const MemoizedQuestionCard = memo(QuestionCard);
const MemoizedQuizNavigation = memo(QuizNavigation);
const MemoizedQuizSidebar = memo(QuizSidebar);

// --- OPTIMIZATION 2: Isolated Timer Component ---
// This prevents the main component from re-rendering every second
const MatchTimer = memo(({ timeRemaining, onTimeUp, totalTime, questionKey }: { timeRemaining: number, onTimeUp: () => void, totalTime: number, questionKey: string }) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  
  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (displayTime <= 0) {
      onTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setDisplayTime(prev => {
        if (prev <= 1) {
          onTimeUp();
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [displayTime, onTimeUp]);

  return null; // Timer manages logic only, doesn't render
});

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

// ... (rest of the code remains the same)

const FriendMatchInterface: React.FC = () => {
  console.log(' [COMPONENT] FriendMatchInterface component rendered/mounted');
  
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
  const [isMatchCompleted, setIsMatchCompleted] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [waitingForOpponentName, setWaitingForOpponentName] = useState('opponent');
  const [reconnectDeadline, setReconnectDeadline] = useState<number | null>(null);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number>(0);

  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('autoReconnectEnabled')
      if (stored === null) return true
      return stored === 'true'
    } catch {
      return true
    }
  })

  // Navigation guard to prevent going back during friend match
  const { disableGuard } = useQuizNavigationGuard(!isLoading && !isWaitingForPlayers, isMatchCompleted);
  
  // WebSocket connection / submission refs
  const wsConnected = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedCurrentQuestion = useRef(false); // Prevent double submission
  const hasSentClientReadyRef = useRef(false);

  // Get answered questions set for progress tracking
  const answeredQuestions = new Set(answers.keys());

  // Check for reconnection on mount
  useEffect(() => {
    const savedState = matchStateManager.getMatchState();
    if (savedState && savedState.matchId && savedState.isMatchStarted) {
      console.log(' Reconnection detected! Restoring match state:', savedState);
      
      // Restore state
      setMatchId(savedState.matchId);
      gameWebSocket.setMatchId(savedState.matchId);
      setJoinCode(savedState.joinCode);
      setCurrentQuestion(savedState.currentQuestion);
      setTotalQuestions(savedState.totalQuestions);
      setCurrentQuestionData(savedState.currentQuestionData);
      setQuestionTimeRemaining(savedState.questionTimeRemaining);
      setQuestionStartTime(savedState.questionStartTime);
      setIsWaitingForPlayers(false);
      setIsLoading(false); // Mark as loaded since we have saved state
      
      // Restore answers
      const restoredAnswers = new Map<number, number[]>();
      Object.entries(savedState.answers || {}).forEach(([key, value]) => {
        restoredAnswers.set(parseInt(key), value);
      });
      setAnswers(restoredAnswers);
      
      // Update sessionStorage with reconnection info
      sessionStorage.setItem('friendMatch', JSON.stringify({
        mode: savedState.mode,
        joinCode: savedState.joinCode,
        matchId: savedState.matchId,
        websocketUrl: savedState.websocketUrl
      }));
      
      console.log(' Match state restored! Current question:', savedState.currentQuestion, 'of', savedState.totalQuestions);
      
      toast({
        title: "Reconnecting...",
        description: `Restoring your match progress - Question ${savedState.currentQuestion} of ${savedState.totalQuestions}`,
      });
    }
  }, []);

  // Keep countdown updated when opponent disconnects
  useEffect(() => {
    if (!reconnectDeadline) return

    const timer = window.setInterval(() => {
      const msLeft = reconnectDeadline - Date.now()
      const secondsLeft = Math.max(Math.ceil(msLeft / 1000), 0)
      setReconnectSecondsLeft(secondsLeft)
      if (secondsLeft <= 0) {
        setReconnectDeadline(null)
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [reconnectDeadline])

  const handleToggleAutoReconnect = () => {
    setAutoReconnectEnabled(prev => {
      const next = !prev
      try {
        localStorage.setItem('autoReconnectEnabled', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const handleReconnectNow = async () => {
    try {
      const matchInfo = sessionStorage.getItem('friendMatch')
      if (!matchInfo) {
        toast({
          title: 'Error',
          description: 'No match info found to reconnect.',
          variant: 'destructive',
        })
        return
      }

      const parsed = JSON.parse(matchInfo)
      
      // CRITICAL: Force disconnect existing socket to ensure clean reconnection
      console.log(' Forcing socket disconnect before reconnect...')
      gameWebSocket.disconnect()
      wsConnected.current = false
      setIsConnected(false)
      
      // Wait a bit for socket to fully close
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Now reconnect with fresh socket
      await connectToMatch(parsed.websocketUrl, parsed.mode, parsed.joinCode, true)
    } catch (e) {
      console.error('Reconnect now failed:', e)
      toast({
        title: 'Reconnect failed',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Connection lifecycle
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true)
    }

    const onDisconnect = () => {
      setIsConnected(false)

      const withinGrace = reconnectSecondsLeft > 0

      if (autoReconnectEnabled && withinGrace) {
        window.setTimeout(() => {
          handleReconnectNow().catch(() => {})
        }, 750)
      }
    }

    // Browser online/offline events for network reconnection
    const handleBrowserOnline = () => {
      console.log(' Browser came back online, attempting reconnection...')
      // Force a reconnection attempt when browser detects network is back
      if (!isConnected && matchId) {
        window.setTimeout(() => {
          handleReconnectNow().catch(() => {})
        }, 500)
      }
    }

    const handleBrowserOffline = () => {
      console.log(' Browser went offline')
      setIsConnected(false)
    }

    gameWebSocket.on('connect', onConnect)
    gameWebSocket.on('disconnect', onDisconnect)
    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)

    return () => {
      gameWebSocket.off('connect', onConnect)
      gameWebSocket.off('disconnect', onDisconnect)
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
    }
  }, [reconnectSecondsLeft, autoReconnectEnabled, isConnected, matchId])

  // Initialize friend match from sessionStorage
  useEffect(() => {
    const initializeFriendMatch = async () => {
      try {
        console.log(' [INIT] FriendMatchInterface mounted - checking for friendMatch in sessionStorage');
        const matchInfo = sessionStorage.getItem('friendMatch');
        console.log(' [INIT] friendMatch from sessionStorage:', matchInfo);
        if (!matchInfo) {
          console.error(' [INIT] No friend match info found in sessionStorage');
          return;
        }

        const { mode, joinCode, matchId: storedMatchId, websocketUrl, quizName } = JSON.parse(matchInfo);
        
        // Set quiz title from sessionStorage
        if (quizName) {
          setQuizTitle(quizName);
        }
        
        // Check if we'dreconnecting - if we have a saved matchId, we should reconnect
        const savedState = matchStateManager.getMatchState();
        
        // CRITICAL: If saved matchId doesn't match current matchId, clear old state
        if (savedState && savedState.matchId && savedState.matchId !== storedMatchId) {
          console.log(' Clearing old match state - different match detected');
          matchStateManager.clearMatchState();
          localStorage.removeItem('friendMatchState');
          sessionStorage.removeItem('friendMatchState');
        }
        
        const isReconnecting = savedState && savedState.matchId === storedMatchId;
        
        if (isReconnecting) {
          console.log(' Reconnection detected - matchId exists, reconnecting to WebSocket');
          // Still need to reconnect to WebSocket with the saved match info
          await connectToMatch(websocketUrl, mode, joinCode, true);
          return;
        }

        console.log(' Initializing friend match:', { mode, joinCode, matchId: storedMatchId, quizName });

        // Clear ALL previous match session data to allow replay
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('autostart_') || key.startsWith('started_')) {
            sessionStorage.removeItem(key);
          }
        });

        setJoinCode(joinCode);
        if (storedMatchId) {
          setMatchId(storedMatchId);
          gameWebSocket.setMatchId(storedMatchId);
        }

        // Connect to WebSocket
        await connectToMatch(websocketUrl, mode, joinCode, false);
        
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

  const connectToMatch = async (_websocketUrl: string, mode: 'create' | 'join', joinCode?: string, isReconnecting: boolean = false) => {
    try {
      // Import WEBSOCKET_URL from api config to use the correct environment variable
      const { WEBSOCKET_URL } = await import('@/services/api');
      
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

      // Set up event listeners BEFORE connecting, pass mode, joinCode, and userId
      setupWebSocketListeners(mode, joinCode, isReconnecting, userId);

      // Connect to WebSocket - use the environment-aware WEBSOCKET_URL instead of passed parameter
      // Note: Authentication is handled automatically in the connect method
      console.log('Connecting with user data:', { userId, username, firstName, lastName, isReconnecting, wsUrl: WEBSOCKET_URL });
      await gameWebSocket.connect(WEBSOCKET_URL, userId, username);
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

  const setupWebSocketListeners = (mode: 'create' | 'join', joinCode?: string, isReconnecting: boolean = false, userId?: number) => {
    let hasPerformedAction = false; // Flag to prevent duplicate actions

    // Clear any existing listeners first to prevent duplicates
    gameWebSocket.removeAllListeners();

    // Authentication success - perform actions after authentication
    gameWebSocket.on('authenticated', (data: any) => {
      console.log(' Authenticated:', data);
      // Use saved state matchId on reconnect to avoid race with React state
      const savedState = matchStateManager.getMatchState();
      const reconnectMatchId = isReconnecting && savedState ? savedState.matchId : matchId;
      console.log(' Mode:', mode, 'MatchId:', reconnectMatchId ?? matchId, 'JoinCode:', joinCode, 'Reconnecting:', isReconnecting);

      // If matchId is not yet in React state (common for auto-match navigation),
      // fall back to sessionStorage immediately.
      let sessionMatchId: string | null = null;
      try {
        const friendMatchInfo = sessionStorage.getItem('friendMatch');
        if (friendMatchInfo) {
          const parsed = JSON.parse(friendMatchInfo);
          if (typeof parsed?.matchId === 'string' && parsed.matchId.length > 0) {
            sessionMatchId = parsed.matchId;
          }
        }
      } catch (e) {
        console.error(' Failed to parse friendMatch from sessionStorage', e);
      }

      const effectiveMatchId = reconnectMatchId ?? matchId ?? sessionMatchId;

      // Prevent duplicate actions
      if (hasPerformedAction) {
        console.log('Action already performed, skipping...');
        return;
      }
      hasPerformedAction = true;

      // CRITICAL: Prevent multiple connect_to_match calls
      // Use a flag to ensure we only emit once per authentication
      let connectEmitted = false;

      // If reconnecting, just connect to the existing match using saved matchId
      if (isReconnecting && effectiveMatchId && !connectEmitted) {
        console.log(' Reconnecting to match:', effectiveMatchId);
        gameWebSocket.emit('connect_to_match', { matchId: effectiveMatchId });
        connectEmitted = true;
        return;
      }

      // Now that we're authenticated, perform the appropriate action
      if (mode === 'create' && effectiveMatchId && !connectEmitted) {
        console.log(' Authenticated! Now connecting to match:', effectiveMatchId);
        gameWebSocket.emit('connect_to_match', { matchId: effectiveMatchId });
        connectEmitted = true;
      } else if (mode === 'join' && joinCode && !connectEmitted) {
        console.log(' Authenticated! Now joining match with code:', joinCode);
        gameWebSocket.joinMatchByCode(joinCode);
        connectEmitted = true;
      } else if (joinCode && !effectiveMatchId && !connectEmitted) {
        // Simple fix: treat based on mode

        // Simple fix: If mode is 'create', treat as creator, otherwise join
        if (mode === 'create') {
          console.log(' USER IS CREATOR - Finding match by code first');

          // For creators, we need to get the match ID first, then connect
          apiClient.get(`/friend-matches/code/${joinCode}`)
            .then(response => {
              const data = response.data;
              if (data.success && data.data.match) {
                const realMatchId = data.data.match.id;
                console.log(' Found match ID:', realMatchId, 'Now connecting...');
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
          console.log(' FORCING JOIN MODE - joinCode exists but matchId is null');
          console.log(' Authenticated! Now joining match with code:', joinCode);
          gameWebSocket.joinMatchByCode(joinCode);
        }
        connectEmitted = true;
      } else if (!connectEmitted) {
        console.error(' No valid action after authentication!', { mode, matchId: effectiveMatchId, joinCode });
      }
    });

    // Live score updates
    gameWebSocket.on('score_update', (data: any) => {
      try {
        const updatedPlayers = data.players || [];
        if (Array.isArray(updatedPlayers)) {
          setPlayers([...updatedPlayers]);

          const savedState = matchStateManager.getMatchState();
          if (savedState && savedState.matchId) {
            matchStateManager.saveMatchState({
              ...savedState,
              players: updatedPlayers,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Error handling score_update:', error);
      }
    });

    // Match connected (when creator connects to their match)
    gameWebSocket.on('match_connected', (data: any) => {
      console.log(' Connected to match:', data);
      setJoinCode(data.joinCode);

      // CRITICAL: Store matchId and save to localStorage/session immediately for reconnection
      if (data.matchId && !matchId) {
        console.log(' Setting matchId from match_connected:', data.matchId);
        setMatchId(data.matchId);
        gameWebSocket.setMatchId(data.matchId);

        // Update friendMatch session entry with real matchId
        const friendMatchInfo = sessionStorage.getItem('friendMatch');
        if (friendMatchInfo) {
          try {
            const parsed = JSON.parse(friendMatchInfo);
            parsed.matchId = data.matchId;
            parsed.joinCode = data.joinCode || parsed.joinCode;
            sessionStorage.setItem('friendMatch', JSON.stringify(parsed));
          } catch (e) {
            console.error('Failed to update friendMatch session with matchId:', e);
          }
        }

        // Save to session immediately for reconnection
        const matchInfo = sessionStorage.getItem('friendMatch');
        if (matchInfo) {
          const parsed = JSON.parse(matchInfo);
          const initialPlayers = data.players || [];
          matchStateManager.saveMatchState({
            matchId: data.matchId,
            joinCode: data.joinCode,
            websocketUrl: parsed.websocketUrl,
            mode: parsed.mode,
            currentQuestion: 0,
            totalQuestions: 0,
            answers: {},
            players: initialPlayers,
            isWaitingForPlayers: initialPlayers.length < 2,
            isMatchStarted: false,
            currentQuestionData: null,
            questionStartTime: Date.now(),
            questionTimeRemaining: 30,
            timestamp: Date.now()
          });
        }
      }

      const initialPlayers = data.players || [];
      console.log(' Creator connected, setting players:', initialPlayers);
      setPlayers([...initialPlayers]);
      
      // We're connected, so stop the overall loading state
      setIsLoading(false);
      
      // If we have 2 players, also stop waiting
      if (initialPlayers.length === 2) {
        setIsWaitingForPlayers(false);
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
      console.log(' Match joined:', data);
      const joinedPlayers = data.players || [];
      console.log(' Initial players on join:', joinedPlayers);
      setPlayers([...joinedPlayers]);
      
      // CRITICAL: Save matchId immediately when joined so reconnection works
      if (data.matchId && !matchId) {
        console.log(' Setting matchId from match_joined:', data.matchId);
        setMatchId(data.matchId);
        gameWebSocket.setMatchId(data.matchId);

        // Update friendMatch session entry with real matchId for joiners
        const friendMatchInfo = sessionStorage.getItem('friendMatch');
        if (friendMatchInfo) {
          try {
            const parsed = JSON.parse(friendMatchInfo);
            parsed.matchId = data.matchId;
            parsed.joinCode = parsed.joinCode || joinCode;
            sessionStorage.setItem('friendMatch', JSON.stringify(parsed));
          } catch (e) {
            console.error('Failed to update friendMatch session with matchId (joiner):', e);
          }
        }

        // Save to session immediately for reconnection
        const matchInfo = sessionStorage.getItem('friendMatch');
        if (matchInfo) {
          const parsed = JSON.parse(matchInfo);
          matchStateManager.saveMatchState({
            matchId: data.matchId,
            joinCode: parsed.joinCode,
            websocketUrl: parsed.websocketUrl,
            mode: parsed.mode,
            currentQuestion: 0,
            totalQuestions: 0,
            answers: {},
            players: joinedPlayers,
            isWaitingForPlayers: joinedPlayers.length < 2,
            isMatchStarted: false,
            currentQuestionData: null,
            questionStartTime: Date.now(),
            questionTimeRemaining: 30,
            timestamp: Date.now()
          });
        }
      }
      
      // We're connected, so stop the overall loading state
      setIsLoading(false);
      
      // If we have 2 players, also stop waiting
      if (joinedPlayers.length === 2) {
        setIsWaitingForPlayers(false);
      }
      
      toast({
        title: "Match Joined!",
        description: "Waiting for all players to be ready...",
      });
    });

    // Player joined
    gameWebSocket.on('player_joined', (data: any) => {
      console.log('Player joined:', data);
      // A player joined — we are no longer in a loading state
      setIsLoading(false);
      // If this makes us 2 players, stop waiting
      if (players.length + 1 >= 2) {
        setIsWaitingForPlayers(false);
      }
      toast({
        title: "Player Joined",
        description: `${data.username} joined the match`,
      });
    });

    // Fallback handshake: some clients may miss LOAD_GAME_SCENE due to
    // reconnect timing. Use match_ready_acknowledged as a backup trigger
    // to send CLIENT_READY exactly once per client.
    gameWebSocket.on('match_ready_acknowledged', (data: any) => {
      console.log(' MATCH_READY_ACK received:', data);

      try {
        const targetMatchId = data.matchId || matchId;

        // Get userId from localStorage directly to be safe
        let currentUserId = userId;
        if (!currentUserId) {
          try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            currentUserId = userData.id;
          } catch (e) {
            console.error('User ID parse error in match_ready_acknowledged', e);
          }
        }

        if (targetMatchId && currentUserId) {
          if (hasSentClientReadyRef.current) {
            console.log(' CLIENT_READY already sent - skipping match_ready_acknowledged emit');
            return;
          }

          hasSentClientReadyRef.current = true;
          console.log(' EMIT CLIENT_READY from match_ready_acknowledged', { targetMatchId, currentUserId });
          gameWebSocket.emitClientReady(targetMatchId, currentUserId);
        } else {
          console.error(' Cannot emit CLIENT_READY from match_ready_acknowledged: Missing ID', { targetMatchId, currentUserId });
        }
      } catch (error) {
        console.error(' Error in match_ready_acknowledged handler', error);
      }
    });

    // NEW: LOAD_GAME_SCENE - Server tells us to load the game UI
    // This happens when all players have joined, but before the match starts
    gameWebSocket.onLoadGameScene((data: any) => {
      console.log(' LOAD_GAME_SCENE received - game UI loaded, emitting CLIENT_READY', data);
      
      try {
        // Update players
        const newPlayers = data.players || [];
        setPlayers([...newPlayers]);
        setIsWaitingForPlayers(false);
        setIsLoading(false);
        
        // CRITICAL: Emit CLIENT_READY immediately, bypassing state checks
        // Use the matchId directly from the event data if available, fallback to state
        const targetMatchId = data.matchId || matchId;
        
        // Get userId from localStorage directly to be safe
        let currentUserId = userId;
        if (!currentUserId) {
          try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            currentUserId = userData.id;
          } catch (e) {
            console.error('User ID parse error', e);
          }
        }

        if (targetMatchId && currentUserId) {
          if (hasSentClientReadyRef.current) {
            console.log(' CLIENT_READY already sent - skipping LOAD_GAME_SCENE emit');
          } else {
            hasSentClientReadyRef.current = true;
            console.log(' IMMEDIATE EMIT: CLIENT_READY', { targetMatchId, currentUserId });
            // Force the emit even if React state is lagging
            gameWebSocket.emitClientReady(targetMatchId, currentUserId);
          }
        } else {
          console.error(' Cannot emit CLIENT_READY: Missing ID', { targetMatchId, currentUserId });
        }
      } catch (error) {
        console.error(' Error in LOAD_GAME_SCENE handler', error);
      }
    });

    // Player list updated
    gameWebSocket.on('player_list_updated', (data: any) => {
      const newPlayers = data.players || [];
      
      // Update players without re-render key to avoid loops
      setPlayers([...newPlayers]);
      
      // If we have 2 players, stop waiting and loading spinners
      if (newPlayers.length === 2) {
        setIsWaitingForPlayers(false);
        setIsLoading(false);
        
        // CHANGED: Don't auto-start here anymore
        // Wait for LOAD_GAME_SCENE event from server instead
        // This ensures proper synchronization
        console.log(' 2 players connected - waiting for LOAD_GAME_SCENE from server');
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
        console.log(` Ready status: ${readyCount}/${updated.length} players ready. All ready: ${allReady}`);
        
        return updated;
      });
    });

    // Match started
    gameWebSocket.on('match_started', (data: any) => {
      console.log(' MATCH_STARTED event:', data);
      
      // CRITICAL: Reset submission flag for first question
      hasSubmittedCurrentQuestion.current = false;
      
      // Validate question data exists
      if (!data.question || !data.question.questionText) {
        console.error(' Match started but no question data received!', data);
        toast({
          title: "Error",
          description: "No quiz questions available. Please contact support.",
          variant: "destructive"
        });
        return;
      }
      
      const matchStartKey = `started_${matchId}_${Date.now()}`;
      sessionStorage.setItem(matchStartKey, 'true');
      
      // Set question data FIRST before changing loading states
      setCurrentQuestionData(data.question);
      setCurrentQuestion(1);
      
      // Calculate time remaining if reconnecting
      let timeRemaining = data.question.timeLimit || 30;
      if (data.timeElapsed) {
        timeRemaining = Math.max(0, timeRemaining - Math.floor(data.timeElapsed / 1000));
        console.log(' Reconnecting - time elapsed:', data.timeElapsed, 'ms, remaining:', timeRemaining, 's');
      }
      
      // Set totalQuestions with fallback
      const totalQs = data.totalQuestions || data.questions?.length || 10;
      setTotalQuestions(totalQs);
      console.log(' Total questions set to:', totalQs);
      
      setQuestionTimeRemaining(timeRemaining);
      setQuestionStartTime(Date.now());
      
      // THEN update loading states
      setIsWaitingForPlayers(false);
      setIsLoading(false);

      toast({
        title: "Match Started!",
        description: `Get ready! ${totalQs} questions to go!`,
      });
    });

    // Next question - SAFARI FIX: Ensure proper state update order
    gameWebSocket.on('next_question', (data: any) => {
      console.log(' NEXT QUESTION EVENT:', data);
      
      // SAFARI FIX: Use requestAnimationFrame to ensure UI updates properly
      requestAnimationFrame(() => {
        // CRITICAL: Reset submission flag for new question
        hasSubmittedCurrentQuestion.current = false;
        
        // Reset waiting state
        setIsWaitingForOpponent(false);
        setWaitingForOpponentName('opponent');
        
        // SAFARI FIX: Reset submitting state first
        setIsSubmitting(false);
        
        // Update question data - SAFARI FIX: Ensure all updates happen in single batch
        setCurrentQuestionData(data.question);
        setCurrentQuestion(data.questionIndex + 1);
        setQuestionTimeRemaining(data.question.timeLimit || 30);
        setQuestionStartTime(Date.now());
        
        if (data.totalQuestions) {
          setTotalQuestions(data.totalQuestions);
        }
        
        console.log(` Moving to question ${data.questionIndex + 1} of ${data.totalQuestions || totalQuestions}`);
      });
    });

    gameWebSocket.on('player_next_question', (data: any) => {
      console.log(' INDIVIDUAL NEXT QUESTION:', data);
      
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
            
            console.log(` Individual next question: ${data.questionIndex + 1} of ${data.totalQuestions || totalQuestions}`);
          }
        } catch (e) {}
      }
    });

    // Answer result
    gameWebSocket.on('answer_result', (data: any) => {
      console.log(' Answer result received:', data);
      if (data.isCorrect) {
        // toast({
        //   title: "Correct! ",
        //   description: `+${data.points} points (Total: ${data.totalScore})`,
        // });
      } else {
        // toast({
        //   title: "Incorrect",
        //   description: `0 points (Total: ${data.totalScore})`,
        //   variant: "destructive"
        // });
      }
    });

    // Waiting for opponent
    gameWebSocket.on('waiting_for_opponent', (data: any) => {
      console.log(' Waiting for opponent:', data);

      // Only show "waiting" if we actually submitted the *current* question.
      // After next_question arrives we reset hasSubmittedCurrentQuestion to false,
      // so any late/stale waiting_for_opponent events from the previous question
      // will be ignored and won't lock the Next button on the new question.
      if (!hasSubmittedCurrentQuestion.current) {
        console.log(' Ignoring waiting_for_opponent - no active submission for this question');
        return;
      }

      setIsWaitingForOpponent(true);
      if (data.waitingFor && data.waitingFor.length > 0) {
        setWaitingForOpponentName(data.waitingFor[0]);
      }
      toast({
        title: "Waiting...",
        description: data.message || `Waiting for ${data.waitingFor.join(', ')}...`,
      });
    });

    // Opponent submitted answer - clear waiting state
    gameWebSocket.on('opponent_submitted', (data: any) => {
      console.log(' Opponent submitted answer:', data);
      
      // Clear waiting state since opponent has answered
      setIsWaitingForOpponent(false);
      setWaitingForOpponentName('opponent');
      
      toast({
        title: "Opponent Answered",
        description: `${data.username} submitted their answer`,
      });
    });

    // Player answered (legacy handler)
    gameWebSocket.on('player_answered', (data: any) => {
      console.log('Player answered:', data);
      // Show that opponent answered
      toast({
        title: "Opponent Answered",
        description: `${data.username} submitted their answer`,
      });
    });

    // Match completed - ONLY handler for match completion
    gameWebSocket.on('match_completed', (data: any) => {
      console.log(' MATCH COMPLETED EVENT RECEIVED!');
      console.log('Raw match completion data:', JSON.stringify(data, null, 2));

      // Mark match as completed to disable navigation guard
      setIsMatchCompleted(true);
      disableGuard();
      
      // Clear match state from localStorage
      matchStateManager.clearMatchState();

      // Get current user info for debugging
      const userData = localStorage.getItem('user');
      let currentUser = 'unknown';
      if (userData) {
        try {
          const user = JSON.parse(userData);
          currentUser = user.email || user.username;
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }

      console.log('Current user receiving results:', currentUser);

      // Use the matchId from the server data directly
      const finalMatchId = data.matchId || 'unknown';

      // Store the complete results exactly as received from server
      const results = {
        matchId: finalMatchId,
        results: data.results || [],
        winner: data.winner || null,
        completedAt: data.completedAt || new Date().toISOString(),
        isFriendMatch: !!data.isFriendMatch,
        // Remove individual completion flag - this is the FINAL results
        isIndividualCompletion: false
      };

      console.log(' Storing FINAL match results for both players:', JSON.stringify(results, null, 2));

      // Clear any previous individual completion data
      sessionStorage.removeItem('friendMatchResults');
      
      // Store the final results
      sessionStorage.setItem('friendMatchResults', JSON.stringify(results));
      sessionStorage.setItem('quizResults', JSON.stringify(results));

      toast({
        title: "Match Complete!",
        description: `Winner: ${data.winner?.username || 'Unknown'}`,
      });

      // Clear friend match data before navigating to results
      sessionStorage.removeItem('friendMatch');
      sessionStorage.removeItem('friendMatchState');
      localStorage.removeItem('friendMatchState');
      
      // Navigate to results page
      setTimeout(() => {
        console.log(' Match completed - navigating to final results page');
        // Replace history to prevent going back to match lobby
        window.history.replaceState(null, '', '/quiz-results');
        window.location.pathname = '/quiz-results';
      }, 2000);
    });

    // Remove individual completion handler that was causing premature endings
    // Individual player completed events are not needed - we only handle full match completion
    // gameWebSocket.on('player_completed', ...) - REMOVED TO PREVENT PREMATURE RESULTS

    // Player disconnected
    gameWebSocket.on('player_disconnected', (data: any) => {
      console.log('Player disconnected:', data);

      // Set reconnect deadline from server
      if (typeof data?.deadline === 'number' && typeof data?.reconnectionWindowSeconds === 'number') {
        setReconnectDeadline(data.deadline);
        setReconnectSecondsLeft(data.reconnectionWindowSeconds);
      }
      
      // Only show disconnection toast if the match is still active
      if (!isSubmitting && currentQuestionData) {
        toast({
          title: "Player Disconnected",
          description: data.message || `${data.username || 'A player'} left the match`,
          variant: "destructive"
        });
      }

      // Mark waiting state if grace period active
      if (data?.reconnectionWindowSeconds && data.reconnectionWindowSeconds > 0) {
        setIsWaitingForOpponent(true);
        setWaitingForOpponentName(data.username || 'opponent');
      }
    });

    // Match reconnected (when player refreshes / reconnects mid-game)
    gameWebSocket.on('match_reconnected', (data: any) => {
      console.log(' MATCH_RECONNECTED event:', data);

      try {
        // Unlock UI state only if player hasn't submitted current question
        const hasSubmitted = data.hasSubmittedCurrent === true;
        setIsSubmitting(hasSubmitted);
        hasSubmittedCurrentQuestion.current = hasSubmitted;
        
        // If player already submitted, they should be waiting
        setIsWaitingForOpponent(hasSubmitted);

        // Clear reconnect countdown
        setReconnectDeadline(null);
        setReconnectSecondsLeft(0);

        if (Array.isArray(data.players)) {
          setPlayers([...data.players]);
        }

        if (data.question) {
          setCurrentQuestionData(data.question);
          setCurrentQuestion((data.questionIndex ?? 0) + 1);
          setTotalQuestions(data.totalQuestions ?? 0);
        }

        // Use server-provided timeRemaining or calculate from timeElapsed
        if (typeof data.timeRemaining === 'number') {
          setQuestionTimeRemaining(data.timeRemaining);
        } else if (typeof data.timeElapsed === 'number') {
          const timeLimit = data.question?.timeLimit || 30;
          const remaining = Math.max(0, timeLimit - data.timeElapsed);
          setQuestionTimeRemaining(remaining);
        }

        // Reset local timer baseline to sync with server
        setQuestionStartTime(Date.now());
        setIsWaitingForPlayers(false);
        setIsLoading(false);

        toast({
          title: 'Reconnected',
          description: hasSubmitted 
            ? 'You are back in the match. Waiting for opponent to answer...'
            : 'You are back in the match.',
        });
      } catch (e) {
        console.error('Error handling match_reconnected:', e);
      }
    });

    // Time extended when player reconnects - sync ALL players to same time
    gameWebSocket.on('time_extended', (data: any) => {
      console.log(' TIME_EXTENDED event:', data);
      
      try {
        if (typeof data.newTimeLimit === 'number') {
          // Sync timer to the new time limit (includes bonus time)
          setQuestionTimeRemaining(data.newTimeLimit);
          setQuestionStartTime(Date.now());
          
          toast({
            title: 'Time Extended',
            description: data.message || 'Bonus time added for reconnection',
          });
        }
      } catch (e) {
        console.error('Error handling time_extended:', e);
      }
    });

  };

  // --- OPTIMIZATION 3: UseCallback for heavy handlers ---
  const handleAnswerSelect = useCallback((answer: string) => {
    if (!currentQuestionData) return;

    // Find the selected option ID
    const selectedOption = currentQuestionData.options.find(opt => opt.optionText === answer);
    if (!selectedOption) return;

    setAnswers(prev => new Map(prev.set(currentQuestion, [selectedOption.id])));
  }, [currentQuestionData, currentQuestion]);

  // Submit current answer with useCallback to prevent re-creation
  const submitCurrentAnswer = useCallback(
    async (options?: { allowEmpty?: boolean; reason?: 'timeout' | 'manual' }) => {
      const allowEmpty = options?.allowEmpty ?? false;

      // Prevent double submission for the same question
      if (hasSubmittedCurrentQuestion.current) {
        console.log(' Already submitted this question, ignoring duplicate submission', options);
        return;
      }

      if (!currentQuestionData) {
        console.log(' No current question data to submit');
        return;
      }

      const selectedOptions = answers.get(currentQuestion) || [];
      const optionsToSend = selectedOptions.length > 0 ? selectedOptions : [];

      if (!allowEmpty && optionsToSend.length === 0) {
        toast({
          title: "Please Select an Answer",
          description: "You must select an option before submitting.",
          variant: "destructive"
        });
        console.log(' No options selected - cannot submit');
        return;
      }

      const rawTimeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const questionLimit = currentQuestionData.timeLimit || 30;
      const timeSpent = Math.min(Math.max(rawTimeSpent, 0), questionLimit);

      console.log(' Submitting answer:', {
        questionId: currentQuestionData.id,
        selectedOptions,
        rawTimeSpent,
        timeSpent,
        questionLimit,
        currentQuestion,
        reason: options?.reason || 'manual'
      });

      try {
        setIsSubmitting(true);
        hasSubmittedCurrentQuestion.current = true;

        gameWebSocket.submitAnswer(currentQuestionData.id, optionsToSend, timeSpent);

        // Safety timeout: If server doesn't respond in 5 seconds, unlock the UI
        const safetyTimer = setTimeout(() => {
          console.log(" Safety timeout triggered - Server didn't respond in 5 seconds, unlocking UI");
          setIsSubmitting(false);
          hasSubmittedCurrentQuestion.current = false;
        }, 5000);

        timerRef.current = safetyTimer;
      } catch (error) {
        console.error(' Error submitting answer:', error);
        setIsSubmitting(false);
        hasSubmittedCurrentQuestion.current = false;
        toast({
          title: "Submission Error",
          description: "Failed to submit answer. Please try again.",
          variant: "destructive"
        });
      }
    },
    [answers, currentQuestion, currentQuestionData, questionStartTime]
  );

  // Auto-advance to next question when time runs out
  const handleQuestionTimeUp = useCallback(async () => {
    console.log(' Question time up! Auto-advancing...');

    // If the question just started, this is likely a stale timer from the
    // previous question – ignore it so we don't create a phantom submission.
    const elapsedMs = Date.now() - questionStartTime;
    if (elapsedMs < 500) {
      console.log(' Ignoring stale timeout - question just changed', { elapsedMs });
      return;
    }

    if (!hasSubmittedCurrentQuestion.current) {
      await submitCurrentAnswer({ allowEmpty: true, reason: 'timeout' });
    }

    const isLastQuestion = currentQuestion === totalQuestions;
    if (isLastQuestion) {
      console.log(' Last question - submitting quiz...');
      setIsSubmitting(true);
    } else {
      console.log(' Moving to next question...');
      // The server will send the next question automatically
    }
  }, [currentQuestion, totalQuestions, questionStartTime, submitCurrentAnswer]);

  // Navigation handlers
  const handleNext = () => {
    submitCurrentAnswer();
  };

  // Quiz submission - DISABLE individual completion to wait for both players
  const handleSubmit = () => {
    submitCurrentAnswer();
    setIsSubmitting(true);
    
    // Don't complete quiz individually - wait for server to handle both players
    console.log(' Answer submitted, waiting for server to handle completion...');
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  // Handle time up from header timer – delegate to the main timeout handler
  const handleTimeUp = () => {
    handleQuestionTimeUp();
  };

  // Function to get display name for a player
  const getPlayerDisplayName = (player: MatchPlayer) => {
    if (player.firstName || player.lastName) {
      return `${player.firstName} ${player.lastName}`.trim();
    }
    return player.username;
  };

  const scoreboardPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const aScore = typeof a?.score === 'number' ? a.score : 0;
      const bScore = typeof b?.score === 'number' ? b.score : 0;
      return bScore - aScore;
    });

    return [sorted[0] || null, sorted[1] || null];
  }, [players]);

  // Helper function to save state
  const saveCurrentState = () => {
    if (!matchId || isMatchCompleted || isWaitingForPlayers || !currentQuestionData) {
      return;
    }

    const matchInfo = sessionStorage.getItem('friendMatch');
    if (!matchInfo) {
      return;
    }

    try {
      const { mode, websocketUrl } = JSON.parse(matchInfo);
      
      // Convert answers Map to plain object for storage
      const answersObj: Record<number, number[]> = {};
      answers.forEach((value, key) => {
        answersObj[key] = value;
      });
      
      console.log(' Saving match state - Q' + currentQuestion + '/' + totalQuestions + ', Answers: ' + answers.size);
      
      matchStateManager.saveMatchState({
        matchId,
        joinCode,
        websocketUrl,
        mode,
        currentQuestion,
        totalQuestions,
        answers: answersObj,
        players,
        isWaitingForPlayers,
        isMatchStarted: !isWaitingForPlayers,
        currentQuestionData,
        questionStartTime,
        questionTimeRemaining,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(' Error saving match state:', error);
    }
  };

  // Save match state whenever key values change
  useEffect(() => {
    saveCurrentState();
  }, [matchId, currentQuestion, answers, currentQuestionData, questionTimeRemaining, isMatchCompleted, isWaitingForPlayers]);

  // Timer countdown effect for individual questions
  useEffect(() => {
    if (questionTimeRemaining <= 0 || isLoading || isWaitingForPlayers || !currentQuestionData) return;

    const questionTimer = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-advance to next question when time runs out
          handleQuestionTimeUp();
          return 30; // Reset for next question
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(questionTimer);
  }, [questionTimeRemaining, currentQuestion, totalQuestions, isLoading, isWaitingForPlayers, currentQuestionData]);

  // Remove duplicate timer - using the one above

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only clear state if match is completed
      if (isMatchCompleted) {
        matchStateManager.clearMatchState();
      }
      
      if (wsConnected.current) {
        gameWebSocket.disconnect();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isMatchCompleted]);

  // Show loading state
  if (isLoading) {
    console.log(' STILL LOADING - isLoading:', isLoading, 'isWaitingForPlayers:', isWaitingForPlayers);
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-500">
                        Score: {typeof player.score === 'number' ? player.score : 0}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-green-500/20 text-green-600">
                        Connected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {players.length === 2 && (
                <div className="mt-6 text-center">
                  <div className="text-green-500 font-semibold text-lg animate-pulse">
                    Both players connected!
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Starting match in a moment...
                  </div>
                </div>
              )}
              
              {players.length === 1 && (
                <div className="mt-6 text-center">
                  <div className="text-yellow-500 text-lg">
                    Waiting for your friend to join...
                  </div>
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
          <p className="text-muted-foreground mb-2">Preparing your first question...</p>
          <p className="text-xs text-muted-foreground">
            If this takes too long, please go back and restart the match.
          </p>
          <button 
            onClick={() => window.location.pathname = '/student-quiz'}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Isolated Timer - prevents parent re-renders every second */}
      <MatchTimer 
        timeRemaining={questionTimeRemaining} 
        totalTime={currentQuestionData?.timeLimit || 30}
        onTimeUp={handleQuestionTimeUp}
        questionKey={`${currentQuestion}-${currentQuestionData?.id}`}
      />

      {/* Navigation Warning Banner */}
      {!isLoading && !isWaitingForPlayers && !isMatchCompleted && (
        <div className="bg-amber-50 border-b border-amber-200 p-3">
          <div className="container mx-auto flex items-center gap-2 text-amber-800">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              Friend Match in Progress - Navigation is blocked until completion
            </span>
          </div>
        </div>
      )}

      {/* Reconnect Countdown Banner */}
      {!isLoading && !isWaitingForPlayers && !isMatchCompleted && reconnectSecondsLeft > 0 && (
        <div className="border-b border-red-200 bg-red-50 px-3 py-3">
          <div className="container mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-red-900">
              <span className="font-semibold">{waitingForOpponentName}</span>
              <span> disconnected.</span>
              <span className="ml-2 font-semibold tabular-nums">
                {reconnectSecondsLeft}s
              </span>
              <span> to reconnect before the match ends.</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAutoReconnect}
                className={
                  autoReconnectEnabled
                    ? 'px-3 py-1.5 rounded-md border border-green-300 bg-green-100 text-green-800 text-xs font-medium'
                    : 'px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-xs font-medium'
                }
              >
                Auto reconnect: {autoReconnectEnabled ? 'On' : 'Off'}
              </button>

              <button
                type="button"
                onClick={handleReconnectNow}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
              >
                Reconnect now
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Connection status indicator - Mobile optimized */}
      <div className="absolute top-2 right-2 z-50 flex items-center space-x-1 sm:space-x-2">
        {isConnected ? (
          <>
            <Wifi size={14} className="text-green-500 sm:w-4 sm:h-4" />
            <span className="text-xs text-green-500 hidden sm:inline">Connected</span>
          </>
        ) : (
          <>
            <WifiOff size={14} className="text-red-500 sm:w-4 sm:h-4" />
            <span className="text-xs text-red-500 hidden sm:inline">Disconnected</span>
          </>
        )}
        <div className="bg-primary/10 text-primary text-xs px-2 py-1 sm:px-3 rounded-full border border-primary/20">
          <span className="hidden sm:inline">Friend Match - </span>{joinCode}
        </div>
      </div>

      {/* Mobile-optimized layout matching QuizInterface */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Compact Quiz Header - Fixed height */}
        <div className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-border">
          <QuizHeader
            currentQuestion={currentQuestion}
            totalQuestions={totalQuestions}
            timeRemaining={questionTimeRemaining}
            questionTimeRemaining={questionTimeRemaining}
            onTimeUp={handleTimeUp}
            quizTitle={`${quizTitle} - ${joinCode}`}
          />

          {(scoreboardPlayers[0] || scoreboardPlayers[1]) && (
            <div className="mt-2 flex items-center justify-between gap-2">
              {[scoreboardPlayers[0], scoreboardPlayers[1]].map((p, idx) => (
                <div
                  key={p?.userId || `placeholder-${idx}`}
                  className="flex-1 rounded-md border border-border bg-background/60 px-3 py-2"
                >
                  {p ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">
                          {getPlayerDisplayName(p)}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          @{p.username}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {typeof p.score === 'number' ? p.score : 0}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Waiting for opponent…</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content area - Flexible height */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Quiz Sidebar - hidden on mobile and tablet */}
          <div className="hidden xl:block xl:w-80 2xl:w-96 flex-shrink-0 border-r border-border">
            <div className="h-full overflow-y-auto p-4">
              <MemoizedQuizSidebar
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
          </div>

          {/* Main Quiz Content - Flexible layout */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Question Card - Takes available space, scrollable if needed */}
            <div className="flex-1 px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 overflow-y-auto">
              <MemoizedQuestionCard
                question={questionForCard}
                selectedAnswer={currentAnswer}
                onAnswerSelect={handleAnswerSelect}
                questionNumber={currentQuestion}
                totalQuestions={totalQuestions}
              />
            </div>

            {/* Navigation - Fixed at bottom with ultra-compact padding for iPhone */}
            <div className="flex-shrink-0 px-3 py-1 sm:px-4 sm:py-2 md:px-6 md:py-3 border-t border-border bg-background/95 backdrop-blur-sm">
              <MemoizedQuizNavigation
                currentQuestion={currentQuestion}
                totalQuestions={totalQuestions}
                hasAnswer={!!currentAnswer}
                onNext={handleNext}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isWaitingForOpponent={isWaitingForOpponent}
                opponentName={waitingForOpponentName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendMatchInterface;