import React from 'react';
import { Trophy, Crown, Medal, Award, Users, Zap } from 'lucide-react';

interface FriendMatchPlayer {
  rank: number;
  userId: number;
  username: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
}

interface FriendMatchLeaderboardProps {
  rankings: FriendMatchPlayer[];
  winner?: FriendMatchPlayer;
  matchId: string;
}

const FriendMatchLeaderboard: React.FC<FriendMatchLeaderboardProps> = ({ 
  rankings = [], 
  winner, 
  matchId 
}) => {
  // Debug logging
  console.log('FriendMatchLeaderboard received:', { rankings, winner, matchId });
  
  const getPercentage = (correct: number, total: number) => {
    if (total === 0) return 0; // Prevent division by zero
    return Math.round((correct / total) * 100);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={24} className="text-yellow-500" />;
      case 2:
        return <Medal size={24} className="text-gray-400" />;
      default:
        return <span className="text-muted-foreground font-bold text-lg">{rank}</span>;
    }
  };

  
  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center">
            <Users size={24} className="mr-3 text-primary" />
            Friend Match Results
          </h2>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Match ID</p>
            <p className="text-xs font-mono text-muted-foreground">{matchId}</p>
          </div>
        </div>
        
        {/* Winner announcement */}
        {winner && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center">
              <Trophy size={24} className="text-yellow-600 mr-3" />
              <div className="text-center">
                <p className="text-yellow-800 dark:text-yellow-200 font-semibold text-lg">
                  🎉 {winner.username} Wins! 🎉
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  {winner.score} points • {winner.correctAnswers}/{winner.totalAnswers} correct
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {rankings && Array.isArray(rankings) && rankings.length > 0 ? rankings.map((player, index) => {
          const rank = player?.rank || (index + 1);
          const percentage = getPercentage(player?.correctAnswers || 0, player?.totalAnswers || 1);
          const isWinner = rank === 1;
          
          return (
            <div
              key={player?.userId || index}
              className={`
                flex items-center justify-between p-6 rounded-lg border-2 transition-all duration-200
                ${isWinner 
                  ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 shadow-lg' 
                  : 'border-border bg-background hover:bg-muted/50'
                }
              `}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12">
                  {getRankIcon(rank)}
                </div>
                
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className={`text-xl font-bold ${isWinner ? 'text-yellow-700 dark:text-yellow-300' : 'text-foreground'}`}>
                      {player?.username || `Player ${index + 1}`}
                    </h3>
                    {isWinner && (
                      <div className="flex items-center space-x-1">
                        <Crown size={16} className="text-yellow-500" />
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          WINNER
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span>{player?.correctAnswers || 0}/{player?.totalAnswers || 1} correct</span>
                    <span>•</span>
                    <span>{percentage}% accuracy</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isWinner ? 'text-yellow-600' : 'text-foreground'}`}>
                      {player?.score || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                  
                  {isWinner && (
                    <Zap size={20} className="text-yellow-500" />
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No ranking data available</p>
          </div>
        )}
      </div>
      
      {/* Match statistics */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{rankings?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Players</div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">
              {rankings?.[0]?.totalAnswers || 0}
            </div>
            <div className="text-sm text-muted-foreground">Questions</div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">1v1</div>
            <div className="text-sm text-muted-foreground">Friend Match</div>
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>Great match! Challenge your friend to a rematch anytime.</p>
        </div>
      </div>
    </div>
  );
};

export default FriendMatchLeaderboard;
