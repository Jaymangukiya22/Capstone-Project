import React from 'react';
import Icon from '../../../components/AppIcon';

const SessionOverview = ({ session, className = '' }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-success bg-success/10 border-success/20';
      case 'waiting': return 'text-warning bg-warning/10 border-warning/20';
      case 'paused': return 'text-error bg-error/10 border-error/20';
      default: return 'text-text-secondary bg-muted border-border';
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs?.toString()?.padStart(2, '0')}`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 shadow-elevation-1 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-card-foreground">{session?.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{session?.category}</p>
        </div>
        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(session?.status)}`}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
            <span className="capitalize">{session?.status}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Users" size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Players</span>
          </div>
          <p className="text-2xl font-bold text-card-foreground">{session?.activeUsers}</p>
          <p className="text-xs text-muted-foreground">of {session?.maxUsers} max</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="HelpCircle" size={16} className="text-secondary" />
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
          </div>
          <p className="text-2xl font-bold text-card-foreground">{session?.currentQuestion}</p>
          <p className="text-xs text-muted-foreground">of {session?.totalQuestions}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Clock" size={16} className="text-warning" />
            <span className="text-sm font-medium text-muted-foreground">Duration</span>
          </div>
          <p className="text-2xl font-bold text-card-foreground">{formatDuration(session?.duration)}</p>
          <p className="text-xs text-muted-foreground">elapsed</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Zap" size={16} className="text-success" />
            <span className="text-sm font-medium text-muted-foreground">Avg Response</span>
          </div>
          <p className="text-2xl font-bold text-card-foreground">{session?.avgResponseTime}s</p>
          <p className="text-xs text-muted-foreground">per question</p>
        </div>
      </div>
      <div className="mt-4 bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Question Progress</span>
          <span className="text-sm font-medium text-card-foreground">
            {Math.round((session?.currentQuestion / session?.totalQuestions) * 100)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(session?.currentQuestion / session?.totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SessionOverview;