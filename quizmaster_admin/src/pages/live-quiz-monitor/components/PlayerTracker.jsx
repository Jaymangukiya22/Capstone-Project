import React, { useState } from 'react';

import Button from '../../../components/ui/Button';

const PlayerTracker = ({ players, onPlayerAction, className = '' }) => {
  const [sortBy, setSortBy] = useState('score');
  const [filterStatus, setFilterStatus] = useState('all');

  const getConnectionColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-primary';
      case 'fair': return 'text-warning';
      case 'poor': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  const getEngagementColor = (level) => {
    switch (level) {
      case 'high': return 'bg-success/20 text-success';
      case 'medium': return 'bg-warning/20 text-warning';
      case 'low': return 'bg-error/20 text-error';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const sortedPlayers = [...players]?.sort((a, b) => {
    switch (sortBy) {
      case 'score': return b?.score - a?.score;
      case 'name': return a?.name?.localeCompare(b?.name);
      case 'responseTime': return a?.avgResponseTime - b?.avgResponseTime;
      case 'accuracy': return b?.accuracy - a?.accuracy;
      default: return 0;
    }
  });

  const filteredPlayers = sortedPlayers?.filter(player => {
    if (filterStatus === 'all') return true;
    return player?.status === filterStatus;
  });

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Player Tracking</h3>
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e?.target?.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-input text-foreground"
            >
              <option value="score">Sort by Score</option>
              <option value="name">Sort by Name</option>
              <option value="responseTime">Sort by Speed</option>
              <option value="accuracy">Sort by Accuracy</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e?.target?.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-input text-foreground"
            >
              <option value="all">All Players</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="bg-primary/10 rounded p-2 text-center">
            <p className="font-semibold text-primary">{players?.filter(p => p?.status === 'active')?.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-warning/10 rounded p-2 text-center">
            <p className="font-semibold text-warning">{players?.filter(p => p?.status === 'idle')?.length}</p>
            <p className="text-xs text-muted-foreground">Idle</p>
          </div>
          <div className="bg-error/10 rounded p-2 text-center">
            <p className="font-semibold text-error">{players?.filter(p => p?.status === 'disconnected')?.length}</p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </div>
          <div className="bg-success/10 rounded p-2 text-center">
            <p className="font-semibold text-success">{Math.round(players?.reduce((acc, p) => acc + p?.accuracy, 0) / players?.length)}%</p>
            <p className="text-xs text-muted-foreground">Avg Accuracy</p>
          </div>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {filteredPlayers?.map((player, index) => (
          <div key={player?.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-smooth">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-foreground">
                    {player?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <p className="font-medium text-card-foreground">{player?.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${getConnectionColor(player?.connection)}`}></div>
                  <span className="text-xs text-muted-foreground capitalize">{player?.connection}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getEngagementColor(player?.engagement)}`}>
                    {player?.engagement}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-card-foreground">{player?.score}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-card-foreground">{player?.accuracy}%</p>
                <p className="text-xs text-muted-foreground">accuracy</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-card-foreground">{player?.avgResponseTime}s</p>
                <p className="text-xs text-muted-foreground">avg time</p>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="MessageSquare"
                  iconSize={14}
                  onClick={() => onPlayerAction('message', player?.id)}
                  className="p-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Volume2"
                  iconSize={14}
                  onClick={() => onPlayerAction('mute', player?.id)}
                  className="p-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="UserX"
                  iconSize={14}
                  onClick={() => onPlayerAction('kick', player?.id)}
                  className="p-1 text-error hover:text-error"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerTracker;