import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

// Import all components
import SessionOverview from './components/SessionOverview';
import PlayerTracker from './components/PlayerTracker';
import SessionControls from './components/SessionControls';
import QuestionDisplay from './components/QuestionDisplay';
import LiveChatModeration from './components/LiveChatModeration';
import SystemNotifications from './components/SystemNotifications';
import PerformanceMetrics from './components/PerformanceMetrics';

const LiveQuizMonitor = () => {
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for active sessions
  const mockSessions = [
    {
      id: 'session-1',
      title: 'JavaScript Fundamentals Quiz',
      category: 'Programming',
      status: 'active',
      activeUsers: 24,
      maxUsers: 30,
      currentQuestion: 8,
      totalQuestions: 25,
      duration: 1847, // seconds
      avgResponseTime: 12.3,
      questionTimeLeft: 18,
      questionTimeLimit: 30,
      autoAdvance: true,
      showAnswers: false,
      allowLateJoins: true,
      startTime: new Date(Date.now() - 1847000)
    },
    {
      id: 'session-2',
      title: 'World History Challenge',
      category: 'History',
      status: 'waiting',
      activeUsers: 8,
      maxUsers: 20,
      currentQuestion: 1,
      totalQuestions: 30,
      duration: 0,
      avgResponseTime: 0,
      questionTimeLeft: 30,
      questionTimeLimit: 30,
      autoAdvance: false,
      showAnswers: true,
      allowLateJoins: true,
      startTime: new Date()
    }
  ];

  // Mock players data
  const mockPlayers = [
    {
      id: 1,
      name: 'Alex Johnson',
      score: 185,
      accuracy: 92,
      avgResponseTime: 8.5,
      status: 'active',
      connection: 'excellent',
      engagement: 'high'
    },
    {
      id: 2,
      name: 'Sarah Chen',
      score: 172,
      accuracy: 88,
      avgResponseTime: 11.2,
      status: 'active',
      connection: 'good',
      engagement: 'high'
    },
    {
      id: 3,
      name: 'Mike Rodriguez',
      score: 156,
      accuracy: 84,
      avgResponseTime: 13.8,
      status: 'idle',
      connection: 'fair',
      engagement: 'medium'
    },
    {
      id: 4,
      name: 'Emma Wilson',
      score: 143,
      accuracy: 79,
      avgResponseTime: 15.1,
      status: 'active',
      connection: 'good',
      engagement: 'medium'
    },
    {
      id: 5,
      name: 'David Kim',
      score: 128,
      accuracy: 75,
      avgResponseTime: 18.3,
      status: 'disconnected',
      connection: 'poor',
      engagement: 'low'
    }
  ];

  // Mock current question
  const mockCurrentQuestion = {
    number: 8,
    total: 25,
    text: "Which of the following is NOT a valid way to declare a variable in JavaScript?",
    difficulty: 'Medium',
    category: 'JavaScript Basics',
    points: 10,
    timeLimit: 30,
    correctAnswer: 2,
    options: [
      'var myVariable = "hello";',
      'let myVariable = "hello";',
      'const myVariable = "hello";',
      'variable myVariable = "hello";'
    ],
    image: null,
    code: null
  };

  // Mock question responses
  const mockResponses = [
    { count: 3 }, // Option A
    { count: 5 }, // Option B
    { count: 2 }, // Option C
    { count: 14 } // Option D (correct)
  ];

  // Mock chat messages
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'System',
      content: 'Quiz session started. Good luck everyone!',
      timestamp: new Date(Date.now() - 1800000),
      type: 'system',
      flagged: false
    },
    {
      id: 2,
      sender: 'Alex Johnson',
      content: 'Ready to go! This looks challenging.',
      timestamp: new Date(Date.now() - 1750000),
      type: 'player',
      flagged: false
    },
    {
      id: 3,
      sender: 'Admin',
      content: 'Remember to read each question carefully. Take your time!',
      timestamp: new Date(Date.now() - 1700000),
      type: 'admin',
      flagged: false
    },
    {
      id: 4,
      sender: 'Sarah Chen',
      content: 'Great quiz so far! Learning a lot.',
      timestamp: new Date(Date.now() - 900000),
      type: 'player',
      flagged: false
    }
  ]);

  // Mock system notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warning',
      priority: 'medium',
      title: 'High Response Time Detected',
      message: 'Average response time has increased to 15.2 seconds',
      details: 'Consider adjusting question difficulty or providing hints',
      timestamp: new Date(Date.now() - 300000),
      read: false,
      actionRequired: true,
      source: 'Performance Monitor'
    },
    {
      id: 2,
      type: 'player',
      priority: 'low',
      title: 'Player Disconnected',
      message: 'David Kim has lost connection',
      details: 'Last seen 2 minutes ago. Connection quality was poor.',
      timestamp: new Date(Date.now() - 120000),
      read: false,
      actionRequired: false,
      source: 'Connection Monitor'
    },
    {
      id: 3,
      type: 'info',
      priority: 'low',
      title: 'Question 8 Started',
      message: 'Current question is now active',
      details: 'Medium difficulty, 30 second time limit',
      timestamp: new Date(Date.now() - 60000),
      read: true,
      actionRequired: false,
      source: 'Quiz Engine'
    }
  ]);

  // Mock performance metrics
  const mockMetrics = {
    overallAccuracy: 84,
    accuracyTrend: 2,
    avgResponseTime: 12.3,
    responseTimeTrend: -1.2,
    retentionRate: 92,
    retentionTrend: 3,
    engagementScore: 87,
    engagementTrend: 5,
    questionsAnswered: 168,
    totalResponseTime: 2067,
    fastestResponse: 3.2,
    slowestResponse: 28.9,
    perfectScores: 3,
    streakLeaders: 7
  };

  useEffect(() => {
    // Simulate loading and set initial data
    const timer = setTimeout(() => {
      setSessions(mockSessions);
      setSelectedSessionId('session-1');
      setActiveSession(mockSessions?.[0]);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      setActiveSession(prev => ({
        ...prev,
        duration: prev?.duration + 1,
        questionTimeLeft: Math.max(0, prev?.questionTimeLeft - 1)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleSessionSelect = (sessionId) => {
    const session = sessions?.find(s => s?.id === sessionId);
    setSelectedSessionId(sessionId);
    setActiveSession(session);
  };

  const handleControlAction = (action, data) => {
    console.log('Control action:', action, data);
    
    switch (action) {
      case 'pause':
        setActiveSession(prev => ({ ...prev, status: 'paused' }));
        break;
      case 'resume':
        setActiveSession(prev => ({ ...prev, status: 'active' }));
        break;
      case 'nextQuestion':
        setActiveSession(prev => ({
          ...prev,
          currentQuestion: Math.min(prev?.currentQuestion + 1, prev?.totalQuestions),
          questionTimeLeft: prev?.questionTimeLimit
        }));
        break;
      case 'end': navigate('/quiz-dashboard');
        break;
      case 'adjustTimer':
        setActiveSession(prev => ({
          ...prev,
          questionTimeLeft: Math.max(0, prev?.questionTimeLeft + data)
        }));
        break;
      default:
        break;
    }
  };

  const handlePlayerAction = (action, playerId) => {
    console.log('Player action:', action, playerId);
    // Handle player-specific actions
  };

  const handleSendMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleModerateMessage = (messageId, action) => {
    setChatMessages(prev =>
      prev?.map(msg =>
        msg?.id === messageId
          ? { ...msg, flagged: action === 'flag' ? true : msg?.flagged }
          : msg
      )?.filter(msg => !(msg?.id === messageId && action === 'delete'))
    );
  };

  const handleDismissNotification = (notificationId) => {
    setNotifications(prev => prev?.filter(n => n?.id !== notificationId));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev?.map(n => ({ ...n, read: true })));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar onToggleCollapse={() => {}} />
          <main className="flex-1 lg:ml-60">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Icon name="Loader2" size={32} className="text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading live quiz sessions...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar onToggleCollapse={() => {}} />
        <main className="flex-1 lg:ml-60">
          <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <Breadcrumbs />
                <h1 className="text-2xl font-bold text-foreground mt-2">Live Quiz Monitor</h1>
                <p className="text-muted-foreground">Real-time oversight and control of active quiz sessions</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => handleSessionSelect(e?.target?.value)}
                  className="border border-border rounded-lg px-3 py-2 bg-input text-foreground"
                >
                  <option value="">Select Session</option>
                  {sessions?.map(session => (
                    <option key={session?.id} value={session?.id}>
                      {session?.title} ({session?.status})
                    </option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  iconName="RefreshCw"
                  iconPosition="left"
                  iconSize={16}
                  onClick={() => window.location?.reload()}
                >
                  Refresh
                </Button>
                
                <Button
                  variant="default"
                  iconName="Plus"
                  iconPosition="left"
                  iconSize={16}
                  onClick={() => navigate('/quiz-builder')}
                >
                  New Session
                </Button>
              </div>
            </div>

            {activeSession ? (
              <>
                {/* Session Overview */}
                <SessionOverview session={activeSession} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column - Session Controls & Question Display */}
                  <div className="xl:col-span-2 space-y-6">
                    <SessionControls
                      session={activeSession}
                      onControlAction={handleControlAction}
                    />
                    
                    <QuestionDisplay
                      question={mockCurrentQuestion}
                      responses={mockResponses}
                    />
                    
                    <PerformanceMetrics metrics={mockMetrics} />
                  </div>

                  {/* Right Column - Player Tracking & Communication */}
                  <div className="space-y-6">
                    <PlayerTracker
                      players={mockPlayers}
                      onPlayerAction={handlePlayerAction}
                    />
                    
                    <LiveChatModeration
                      messages={chatMessages}
                      onSendMessage={handleSendMessage}
                      onModerateMessage={handleModerateMessage}
                    />
                    
                    <SystemNotifications
                      notifications={notifications}
                      onDismissNotification={handleDismissNotification}
                      onMarkAllRead={handleMarkAllRead}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* No Active Session */
              (<div className="text-center py-12">
                <Icon name="Monitor" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No Active Session Selected</h2>
                <p className="text-muted-foreground mb-6">
                  Select an active quiz session from the dropdown above or start a new one.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <Button
                    variant="outline"
                    iconName="LayoutDashboard"
                    iconPosition="left"
                    iconSize={16}
                    onClick={() => navigate('/quiz-dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="default"
                    iconName="Plus"
                    iconPosition="left"
                    iconSize={16}
                    onClick={() => navigate('/quiz-builder')}
                  >
                    Create New Quiz
                  </Button>
                </div>
              </div>)
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LiveQuizMonitor;