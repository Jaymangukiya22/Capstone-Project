import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Check, X, Copy, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Player {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  ready: boolean;
  isHost?: boolean;
}

interface MatchLobbyProps {
  matchId: string;
  joinCode?: string;
  quizTitle: string;
  currentUserId: number;
  onMatchStart: () => void;
  onLeave: () => void;
  websocket: any; // Your WebSocket instance
}

export function MatchLobby({
  matchId,
  joinCode,
  quizTitle,
  currentUserId,
  onMatchStart,
  onLeave,
  websocket
}: MatchLobbyProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'starting' | 'started'>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Listen for WebSocket events
    const handlePlayerJoined = (data: any) => {
      console.log('Player joined:', data);
      setPlayers(data.players || []);
      toast({
        title: "Player Joined",
        description: `${data.username || 'A player'} has joined the match!`,
      });
    };

    const handlePlayerReady = (data: any) => {
      console.log('Player ready status:', data);
      setPlayers(data.players || []);
      
      // Check if all players are ready
      const allReady = data.players.every((p: Player) => p.ready);
      if (allReady && data.players.length >= 2) {
        setMatchStatus('starting');
        startCountdown();
      }
    };

    const handlePlayerLeft = (data: any) => {
      console.log('Player left:', data);
      setPlayers(data.players || []);
      toast({
        title: "Player Left",
        description: `${data.username || 'A player'} has left the match.`,
        variant: "destructive"
      });
    };

    const handleMatchStart = () => {
      console.log('Match starting!');
      setMatchStatus('started');
      onMatchStart();
    };

    const handleMatchUpdate = (data: any) => {
      console.log('Match update:', data);
      if (data.players) {
        setPlayers(data.players);
      }
      if (data.status) {
        setMatchStatus(data.status);
      }
    };

    // Register event listeners
    websocket.on('player_joined', handlePlayerJoined);
    websocket.on('player_ready', handlePlayerReady);
    websocket.on('player_left', handlePlayerLeft);
    websocket.on('match_starting', handleMatchStart);
    websocket.on('match_update', handleMatchUpdate);

    // Request current match state
    websocket.send('get_match_state', { matchId });

    return () => {
      // Cleanup listeners
      websocket.off('player_joined', handlePlayerJoined);
      websocket.off('player_ready', handlePlayerReady);
      websocket.off('player_left', handlePlayerLeft);
      websocket.off('match_starting', handleMatchStart);
      websocket.off('match_update', handleMatchUpdate);
    };
  }, [websocket, matchId, onMatchStart]);

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        onMatchStart();
      }
    }, 1000);
  };

  const handleReady = () => {
    setIsReady(!isReady);
    websocket.send('player_ready', {
      matchId,
      ready: !isReady
    });
  };

  const copyJoinCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      toast({
        title: "Code Copied!",
        description: `Join code ${joinCode} copied to clipboard.`,
      });
    }
  };

  const getPlayerDisplayName = (player: Player) => {
    if (player.firstName || player.lastName) {
      return `${player.firstName || ''} ${player.lastName || ''}`.trim();
    }
    return player.username || `Player ${player.userId}`;
  };

  const currentPlayer = players.find(p => p.userId === currentUserId);
  const isHost = currentPlayer?.isHost || players[0]?.userId === currentUserId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {quizTitle}
            </CardTitle>
            <div className="text-center text-gray-600">
              {matchStatus === 'waiting' && 'Waiting for players...'}
              {matchStatus === 'starting' && 'Match starting soon!'}
              {matchStatus === 'started' && 'Match in progress'}
            </div>
          </CardHeader>
        </Card>

        {/* Join Code Display */}
        {joinCode && matchStatus === 'waiting' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Share this code with your friend:</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-3xl font-bold tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {joinCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyJoinCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Countdown Display */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-9xl font-bold text-white animate-pulse">
              {countdown || 'GO!'}
            </div>
          </div>
        )}

        {/* Players List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players ({players.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {players.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Waiting for players to join...
                </div>
              ) : (
                players.map((player) => (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      player.userId === currentUserId
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {getPlayerDisplayName(player)}
                          {player.userId === currentUserId && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                          {player.isHost && (
                            <Badge variant="default" className="text-xs">Host</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {player.ready ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-orange-600">Not ready</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Waiting for more players message */}
            {players.length === 1 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-sm text-yellow-800">
                  Waiting for another player to join...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {matchStatus === 'waiting' && players.length >= 2 && (
            <Button
              size="lg"
              onClick={handleReady}
              disabled={matchStatus !== 'waiting'}
              className={isReady ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isReady ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Ready!
                </>
              ) : (
                "I'm Ready!"
              )}
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={onLeave}
            disabled={matchStatus === 'starting'}
          >
            <X className="mr-2 h-5 w-5" />
            Leave Match
          </Button>
        </div>

        {/* Status Messages */}
        {matchStatus === 'waiting' && players.length >= 2 && !isReady && (
          <p className="text-center mt-4 text-gray-600">
            Click "I'm Ready!" when you're prepared to start
          </p>
        )}

        {matchStatus === 'waiting' && players.length >= 2 && isReady && (
          <p className="text-center mt-4 text-green-600 font-semibold">
            Waiting for other player to be ready...
          </p>
        )}
      </div>
    </div>
  );
}
