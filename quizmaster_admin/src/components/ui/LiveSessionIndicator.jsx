import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const LiveSessionIndicator = ({ className = '' }) => {
  const [sessions, setSessions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  // Simulate live session data
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
        })
      }));
      setSessions(newSessions);
    };

    generateSessions();
    const interval = setInterval(generateSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToMonitor = () => {
    navigate('/live-quiz-monitor');
    setIsExpanded(false);
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

  if (sessions?.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Compact Indicator */}
      <div 
        className="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 rounded-lg cursor-pointer hover:bg-success/15 transition-smooth"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <Icon name="Monitor" size={16} className="text-success" />
          <span className="text-sm font-medium text-success">
            {sessions?.length} Active Session{sessions?.length > 1 ? 's' : ''}
          </span>
        </div>
        <Icon 
          name={isExpanded ? "ChevronUp" : "ChevronDown"} 
          size={14} 
          className="text-success" 
        />
      </div>
      {/* Expanded Session List */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-elevation-2 z-200 max-h-80 overflow-y-auto">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-popover-foreground">Live Sessions</h3>
              <Button
                variant="ghost"
                size="sm"
                iconName="Monitor"
                iconPosition="left"
                iconSize={14}
                onClick={handleNavigateToMonitor}
                className="text-xs"
              >
                Monitor All
              </Button>
            </div>
          </div>
          
          <div className="p-2 space-y-1">
            {sessions?.map((session) => (
              <div
                key={session?.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-smooth cursor-pointer"
                onClick={handleNavigateToMonitor}
              >
                <div className="flex items-center space-x-3">
                  <Icon 
                    name={getStatusIcon(session?.status)} 
                    size={16} 
                    className={getStatusColor(session?.status)} 
                  />
                  <div>
                    <p className="text-sm font-medium text-popover-foreground">
                      {session?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started at {session?.startTime}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-popover-foreground">
                    {session?.participants}
                  </p>
                  <p className="text-xs text-muted-foreground">participants</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              iconName="Plus"
              iconPosition="left"
              iconSize={14}
              onClick={() => navigate('/quiz-builder')}
            >
              Start New Session
            </Button>
          </div>
        </div>
      )}
      {/* Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-100"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default LiveSessionIndicator;