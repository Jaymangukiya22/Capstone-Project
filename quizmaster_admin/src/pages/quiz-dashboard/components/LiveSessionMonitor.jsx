import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const LiveSessionMonitor = ({ className = '' }) => {
  const [sessions, setSessions] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const navigate = useNavigate();

  // Simulate live session data with WebSocket-like updates
  useEffect(() => {
    const generateSessions = () => {
      const sessionCount = Math.floor(Math.random() * 4);
      const newSessions = Array.from({ length: sessionCount }, (_, i) => ({
        id: `session-${i + 1}`,
        title: `Quiz Session ${i + 1}`,
        participants: Math.floor(Math.random() * 50) + 10,
        status: Math.random() > 0.3 ? 'active' : 'waiting',
        startTime: new Date(Date.now() - Math.random() * 3600000)?.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        category: ['Science', 'History', 'Mathematics', 'Literature']?.[Math.floor(Math.random() * 4)],
        progress: Math.floor(Math.random() * 100)
      }));
      
      setSessions(newSessions);
      setTotalPlayers(newSessions?.reduce((sum, session) => sum + session?.participants, 0));
    };

    generateSessions();
    const interval = setInterval(generateSessions, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToMonitor = () => {
    navigate('/live-quiz-monitor');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-success';
      case 'waiting': return 'text-warning';
      default: return 'text-text-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'Play';
      case 'waiting': return 'Clock';
      default: return 'Pause';
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Monitor" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Live Sessions</h3>
            {sessions?.length > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-success">
                  {sessions?.length} Active
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="Monitor"
            iconPosition="left"
            iconSize={14}
            onClick={handleNavigateToMonitor}
          >
            Monitor All
          </Button>
        </div>
      </div>
      <div className="p-6">
        {sessions?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Monitor" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No active sessions</p>
            <Button
              variant="outline"
              size="sm"
              iconName="Play"
              iconPosition="left"
              iconSize={14}
              onClick={() => navigate('/quiz-builder')}
            >
              Start New Session
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="text-2xl font-bold text-success">{sessions?.length}</div>
                <div className="text-xs text-success/80">Active Sessions</div>
              </div>
              <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">{totalPlayers}</div>
                <div className="text-xs text-primary/80">Total Players</div>
              </div>
            </div>

            {/* Session List */}
            <div className="space-y-3">
              {sessions?.slice(0, 3)?.map((session) => (
                <div
                  key={session?.id}
                  className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-accent transition-smooth cursor-pointer"
                  onClick={handleNavigateToMonitor}
                >
                  <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${getStatusColor(session?.status)}`}>
                    <Icon name={getStatusIcon(session?.status)} size={14} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-text-primary truncate">
                      {session?.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-text-secondary">{session?.category}</span>
                      <span className="text-xs text-text-secondary">•</span>
                      <span className="text-xs text-text-secondary">Started {session?.startTime}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">
                      {session?.participants}
                    </div>
                    <div className="text-xs text-text-secondary">players</div>
                  </div>
                  
                  {session?.status === 'active' && (
                    <div className="w-16">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-success h-2 rounded-full transition-all duration-300"
                          style={{ width: `${session?.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-text-secondary mt-1 text-center">
                        {session?.progress}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {sessions?.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={handleNavigateToMonitor}
                  className="mt-2"
                >
                  View {sessions?.length - 3} More Sessions
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveSessionMonitor;