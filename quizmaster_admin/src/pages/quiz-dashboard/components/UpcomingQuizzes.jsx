import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const UpcomingQuizzes = ({ quizzes = [], className = '' }) => {
  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date?.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date?.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-primary bg-primary/10';
      case 'ready': return 'text-success bg-success/10';
      case 'pending': return 'text-warning bg-warning/10';
      default: return 'text-text-secondary bg-muted';
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Calendar" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-text-primary">Upcoming Quizzes</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="Plus"
            iconPosition="left"
            iconSize={14}
          >
            Schedule New
          </Button>
        </div>
      </div>
      <div className="p-6">
        {quizzes?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Calendar" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No upcoming quizzes</p>
            <Button
              variant="outline"
              size="sm"
              iconName="Plus"
              iconPosition="left"
              iconSize={14}
            >
              Schedule First Quiz
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes?.map((quiz) => {
              const { date, time } = formatDateTime(quiz?.scheduledTime);
              
              return (
                <div key={quiz?.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-accent transition-smooth">
                  <div className="text-center">
                    <div className="text-lg font-bold text-text-primary">{date?.split(' ')?.[1]}</div>
                    <div className="text-xs text-text-secondary">{date?.split(' ')?.[0]}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-text-primary truncate">
                      {quiz?.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Icon name="Clock" size={12} className="text-text-secondary" />
                      <span className="text-xs text-text-secondary">{time}</span>
                      <span className="text-xs text-text-secondary">•</span>
                      <span className="text-xs text-text-secondary">{quiz?.duration} min</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(quiz?.status)}`}>
                      {quiz?.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="MoreHorizontal"
                      iconSize={14}
                      className="p-1"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingQuizzes;