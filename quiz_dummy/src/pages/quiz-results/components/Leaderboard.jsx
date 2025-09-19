// Leaderboard component
import React from 'react';
import { motion } from 'framer-motion';
import Icon from '../../../components/AppIcon';

const Leaderboard = ({ currentScore, totalQuestions }) => {
  // Mock leaderboard data - in real app this would come from database
  const mockLeaderboard = [
    { id: 1, name: "Alice Johnson", score: 10, totalQuestions: 10, timeSpent: 420, completedAt: "2024-01-20T10:30:00Z" },
    { id: 2, name: "Bob Smith", score: 9, totalQuestions: 10, timeSpent: 380, completedAt: "2024-01-20T11:15:00Z" },
    { id: 3, name: "Carol Davis", score: 9, totalQuestions: 10, timeSpent: 445, completedAt: "2024-01-20T09:20:00Z" },
    { id: 4, name: "Current Student", score: currentScore, totalQuestions, timeSpent: 480, completedAt: new Date()?.toISOString() },
    { id: 5, name: "Eve Wilson", score: 8, totalQuestions: 10, timeSpent: 510, completedAt: "2024-01-19T16:45:00Z" },
    { id: 6, name: "Frank Miller", score: 7, totalQuestions: 10, timeSpent: 390, completedAt: "2024-01-19T14:30:00Z" },
    { id: 7, name: "Grace Lee", score: 7, totalQuestions: 10, timeSpent: 465, completedAt: "2024-01-19T13:20:00Z" },
    { id: 8, name: "Henry Brown", score: 6, totalQuestions: 10, timeSpent: 520, completedAt: "2024-01-19T11:10:00Z" },
  ];

  // Sort leaderboard by score (descending), then by time (ascending for same scores)
  const sortedLeaderboard = mockLeaderboard?.sort((a, b) => {
    if (b?.score === a?.score) {
      return a?.timeSpent - b?.timeSpent; // Faster time wins for same score
    }
    return b?.score - a?.score; // Higher score wins
  });

  const currentStudentRank = sortedLeaderboard?.findIndex(entry => entry?.name === "Current Student") + 1;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds?.toString()?.padStart(2, '0')}`;
  };

  const getPercentage = (score, total) => Math.round((score / total) * 100);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Icon name="Crown" size={20} className="text-yellow-500" />;
      case 2:
        return <Icon name="Medal" size={20} className="text-gray-400" />;
      case 3:
        return <Icon name="Award" size={20} className="text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-bold">{rank}</span>;
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center">
            <Icon name="Trophy" size={24} className="mr-3 text-yellow-500" />
            Leaderboard
          </h2>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Your Rank</p>
            <p className="text-2xl font-bold text-primary">#{currentStudentRank}</p>
          </div>
        </div>
        
        {currentStudentRank <= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center">
              <Icon name="Star" size={20} className="text-success mr-2" />
              <span className="text-success font-semibold">
                Congratulations! You're in the top 3!
              </span>
            </div>
          </motion.div>
        )}
      </div>
      <div className="space-y-3">
        {sortedLeaderboard?.map((entry, index) => {
          const rank = index + 1;
          const isCurrentStudent = entry?.name === "Current Student";
          const percentage = getPercentage(entry?.score, entry?.totalQuestions);
          
          return (
            <motion.div
              key={entry?.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center justify-between p-4 rounded-lg border transition-all duration-200
                ${isCurrentStudent 
                  ? 'bg-primary/10 border-primary/30 shadow-md' 
                  : 'bg-background border-border hover:bg-muted/50'
                }
              `}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(rank)}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-semibold ${isCurrentStudent ? 'text-primary' : 'text-foreground'}`}>
                      {entry?.name}
                    </h3>
                    {isCurrentStudent && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Completed in {formatTime(entry?.timeSpent)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-foreground">
                    {entry?.score}/{entry?.totalQuestions}
                  </span>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      percentage >= 80 ? 'text-success' 
                      : percentage >= 60 ? 'text-warning' :'text-error'
                    }`}>
                      {percentage}%
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-center text-sm text-muted-foreground">
          <p>Rankings are based on score first, then completion time</p>
          <p className="mt-1">Keep practicing to improve your ranking!</p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;