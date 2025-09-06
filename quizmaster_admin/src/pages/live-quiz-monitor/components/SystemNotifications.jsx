import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SystemNotifications = ({ notifications, onDismissNotification, onMarkAllRead, className = '' }) => {
  const [filter, setFilter] = useState('all');

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error': return 'AlertCircle';
      case 'warning': return 'AlertTriangle';
      case 'info': return 'Info';
      case 'success': return 'CheckCircle';
      case 'player': return 'User';
      case 'system': return 'Settings';
      default: return 'Bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'error': return 'text-error bg-error/10 border-error/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'info': return 'text-primary bg-primary/10 border-primary/20';
      case 'success': return 'text-success bg-success/10 border-success/20';
      case 'player': return 'text-secondary bg-secondary/10 border-secondary/20';
      case 'system': return 'text-muted-foreground bg-muted/50 border-border';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-error';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted-foreground';
    }
  };

  const filteredNotifications = notifications?.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification?.read;
    return notification?.type === filter;
  });

  const unreadCount = notifications?.filter(n => !n?.read)?.length;

  const formatTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime?.toLocaleDateString();
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-card-foreground">System Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-error text-error-foreground text-xs font-semibold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e?.target?.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-input text-foreground"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="player">Player</option>
            </select>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                iconName="CheckCheck"
                iconSize={14}
                onClick={onMarkAllRead}
                className="text-xs"
              >
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="bg-error/10 rounded p-2 text-center">
            <p className="font-semibold text-error">{notifications?.filter(n => n?.type === 'error')?.length}</p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
          <div className="bg-warning/10 rounded p-2 text-center">
            <p className="font-semibold text-warning">{notifications?.filter(n => n?.type === 'warning')?.length}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>
          <div className="bg-primary/10 rounded p-2 text-center">
            <p className="font-semibold text-primary">{notifications?.filter(n => n?.type === 'info')?.length}</p>
            <p className="text-xs text-muted-foreground">Info</p>
          </div>
          <div className="bg-secondary/10 rounded p-2 text-center">
            <p className="font-semibold text-secondary">{notifications?.filter(n => n?.type === 'player')?.length}</p>
            <p className="text-xs text-muted-foreground">Player</p>
          </div>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {filteredNotifications?.length === 0 ? (
          <div className="p-6 text-center">
            <Icon name="Bell" size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications to display</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredNotifications?.map((notification) => (
              <div
                key={notification?.id}
                className={`p-3 rounded-lg border transition-smooth ${getNotificationColor(notification?.type)} ${
                  !notification?.read ? 'ring-1 ring-primary/20' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex items-center space-x-2">
                    <Icon 
                      name={getNotificationIcon(notification?.type)} 
                      size={16} 
                      className="flex-shrink-0" 
                    />
                    {notification?.priority && (
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification?.priority)}`}></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-card-foreground truncate">
                        {notification?.title}
                      </h4>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatTime(notification?.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification?.message}</p>
                    
                    {notification?.details && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mb-2">
                        {notification?.details}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {notification?.actionRequired && (
                          <span className="text-xs bg-warning text-warning-foreground px-2 py-1 rounded">
                            Action Required
                          </span>
                        )}
                        {notification?.source && (
                          <span className="text-xs text-muted-foreground">
                            from {notification?.source}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {notification?.actionRequired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="ExternalLink"
                            iconSize={12}
                            className="p-1 text-xs"
                          >
                            View
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="X"
                          iconSize={12}
                          onClick={() => onDismissNotification(notification?.id)}
                          className="p-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemNotifications;