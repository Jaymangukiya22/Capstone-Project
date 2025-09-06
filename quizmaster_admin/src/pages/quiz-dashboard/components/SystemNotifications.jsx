import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SystemNotifications = ({ notifications = [], className = '' }) => {
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return 'AlertTriangle';
      case 'error': return 'AlertCircle';
      case 'info': return 'Info';
      case 'success': return 'CheckCircle';
      default: return 'Bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'error': return 'text-error bg-error/10 border-error/20';
      case 'info': return 'text-primary bg-primary/10 border-primary/20';
      case 'success': return 'text-success bg-success/10 border-success/20';
      default: return 'text-text-secondary bg-muted border-border';
    }
  };

  const handleDismiss = (notificationId) => {
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  const visibleNotifications = notifications?.filter(
    notification => !dismissedNotifications?.has(notification?.id)
  );

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Bell" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">System Notifications</h3>
            {visibleNotifications?.length > 0 && (
              <span className="w-5 h-5 bg-error text-white text-xs rounded-full flex items-center justify-center">
                {visibleNotifications?.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="Settings"
            iconSize={14}
          />
        </div>
      </div>
      <div className="p-6">
        {visibleNotifications?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="CheckCircle" size={32} className="text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications?.map((notification) => (
              <div
                key={notification?.id}
                className={`p-4 border rounded-lg ${getNotificationColor(notification?.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <Icon 
                    name={getNotificationIcon(notification?.type)} 
                    size={16} 
                    className="flex-shrink-0 mt-0.5" 
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-1">
                      {notification?.title}
                    </h4>
                    <p className="text-sm opacity-90 mb-2">
                      {notification?.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-75">
                        {formatTimeAgo(notification?.timestamp)}
                      </span>
                      {notification?.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-1 text-current hover:text-current/80"
                        >
                          {notification?.action}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="X"
                    iconSize={14}
                    onClick={() => handleDismiss(notification?.id)}
                    className="p-1 opacity-60 hover:opacity-100"
                  />
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