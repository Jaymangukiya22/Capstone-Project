import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const GameConfiguration = ({ config = {}, onConfigUpdate, className = '' }) => {
  const [gameConfig, setGameConfig] = useState({
    gameFormat: '1v1',
    maxPlayers: 2,
    timePerQuestion: 30,
    totalTimeLimit: 0,
    scoringSystem: 'points',
    pointsPerCorrect: 10,
    pointsPerIncorrect: 0,
    bonusPoints: false,
    speedBonus: false,
    streakBonus: false,
    allowSkip: true,
    showCorrectAnswer: true,
    shuffleQuestions: true,
    shuffleAnswers: true,
    enableHints: false,
    enableLifelines: false,
    autoAdvance: true,
    showLeaderboard: true,
    allowReplay: false,
    requireRegistration: false,
    ...config
  });

  const gameFormats = [
    { value: '1v1', label: '1 vs 1', description: 'Head-to-head competition' },
    { value: 'small_group', label: 'Small Group (2-10)', description: 'Perfect for classroom settings' },
    { value: 'medium_group', label: 'Medium Group (11-20)', description: 'Great for team events' },
    { value: 'large_group', label: 'Large Group (21-30)', description: 'Conference or workshop size' },
    { value: 'massive', label: 'Massive (31-60)', description: 'Large scale competitions' }
  ];

  const scoringSystems = [
    { value: 'points', label: 'Points Based', description: 'Traditional point scoring' },
    { value: 'percentage', label: 'Percentage', description: 'Score as percentage correct' },
    { value: 'ranking', label: 'Ranking', description: 'Rank players by performance' },
    { value: 'time_based', label: 'Time Based', description: 'Faster answers get more points' }
  ];

  const playerCapacityMap = {
    '1v1': { min: 2, max: 2, default: 2 },
    'small_group': { min: 2, max: 10, default: 6 },
    'medium_group': { min: 11, max: 20, default: 15 },
    'large_group': { min: 21, max: 30, default: 25 },
    'massive': { min: 31, max: 60, default: 45 }
  };

  const handleConfigChange = (field, value) => {
    let newConfig = { ...gameConfig, [field]: value };

    // Auto-adjust max players based on game format
    if (field === 'gameFormat') {
      const capacity = playerCapacityMap?.[value];
      newConfig.maxPlayers = capacity?.default;
    }

    // Validate max players against format limits
    if (field === 'maxPlayers') {
      const capacity = playerCapacityMap?.[gameConfig?.gameFormat];
      if (value < capacity?.min) newConfig.maxPlayers = capacity?.min;
      if (value > capacity?.max) newConfig.maxPlayers = capacity?.max;
    }

    setGameConfig(newConfig);
    onConfigUpdate(newConfig);
  };

  const getPlayerCapacityLimits = () => {
    return playerCapacityMap?.[gameConfig?.gameFormat] || { min: 2, max: 60 };
  };

  const calculateEstimatedDuration = () => {
    const questionsCount = 20; // Mock question count
    const timePerQuestion = parseInt(gameConfig?.timePerQuestion) || 30;
    const totalQuestionTime = questionsCount * timePerQuestion;
    const bufferTime = questionsCount * 5; // 5 seconds buffer per question
    const totalMinutes = Math.ceil((totalQuestionTime + bufferTime) / 60);
    return totalMinutes;
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Game Format */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Game Format</h3>
        
        <Select
          label="Game Type"
          options={gameFormats}
          value={gameConfig?.gameFormat}
          onChange={(value) => handleConfigChange('gameFormat', value)}
          required
          description="Choose the type of game experience"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Maximum Players"
            type="number"
            value={gameConfig?.maxPlayers}
            onChange={(e) => handleConfigChange('maxPlayers', parseInt(e?.target?.value))}
            min={getPlayerCapacityLimits()?.min}
            max={getPlayerCapacityLimits()?.max}
            required
            description={`Range: ${getPlayerCapacityLimits()?.min}-${getPlayerCapacityLimits()?.max} players`}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Estimated Duration
            </label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="Clock" size={16} className="text-primary" />
                <span className="text-sm font-medium text-text-primary">
                  ~{calculateEstimatedDuration()} minutes
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Based on {gameConfig?.timePerQuestion}s per question + buffer time
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Timing Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Timing Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Time Per Question (seconds)"
            type="number"
            value={gameConfig?.timePerQuestion}
            onChange={(e) => handleConfigChange('timePerQuestion', parseInt(e?.target?.value))}
            min="10"
            max="300"
            required
            description="How long players have to answer each question"
          />

          <Input
            label="Total Time Limit (minutes)"
            type="number"
            value={gameConfig?.totalTimeLimit}
            onChange={(e) => handleConfigChange('totalTimeLimit', parseInt(e?.target?.value))}
            min="0"
            max="180"
            description="0 = No overall time limit"
          />
        </div>
      </div>
      {/* Scoring System */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Scoring Configuration</h3>
        
        <Select
          label="Scoring System"
          options={scoringSystems}
          value={gameConfig?.scoringSystem}
          onChange={(value) => handleConfigChange('scoringSystem', value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Points for Correct Answer"
            type="number"
            value={gameConfig?.pointsPerCorrect}
            onChange={(e) => handleConfigChange('pointsPerCorrect', parseInt(e?.target?.value))}
            min="1"
            max="100"
            required
          />

          <Input
            label="Points for Incorrect Answer"
            type="number"
            value={gameConfig?.pointsPerIncorrect}
            onChange={(e) => handleConfigChange('pointsPerIncorrect', parseInt(e?.target?.value))}
            min="-50"
            max="0"
            description="Negative values deduct points"
          />
        </div>

        {/* Bonus Options */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-text-primary">Bonus Points</h4>
          
          <Checkbox
            label="Speed Bonus"
            description="Award extra points for quick answers"
            checked={gameConfig?.speedBonus}
            onChange={(e) => handleConfigChange('speedBonus', e?.target?.checked)}
          />

          <Checkbox
            label="Streak Bonus"
            description="Bonus points for consecutive correct answers"
            checked={gameConfig?.streakBonus}
            onChange={(e) => handleConfigChange('streakBonus', e?.target?.checked)}
          />
        </div>
      </div>
      {/* Game Rules */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Game Rules</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-md font-medium text-text-primary">Player Options</h4>
            
            <Checkbox
              label="Allow Skip Questions"
              description="Players can skip difficult questions"
              checked={gameConfig?.allowSkip}
              onChange={(e) => handleConfigChange('allowSkip', e?.target?.checked)}
            />

            <Checkbox
              label="Enable Hints"
              description="Provide hints for questions"
              checked={gameConfig?.enableHints}
              onChange={(e) => handleConfigChange('enableHints', e?.target?.checked)}
            />

            <Checkbox
              label="Enable Lifelines"
              description="50/50, Ask Audience, etc."
              checked={gameConfig?.enableLifelines}
              onChange={(e) => handleConfigChange('enableLifelines', e?.target?.checked)}
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-md font-medium text-text-primary">Display Options</h4>
            
            <Checkbox
              label="Show Correct Answer"
              description="Display correct answer after each question"
              checked={gameConfig?.showCorrectAnswer}
              onChange={(e) => handleConfigChange('showCorrectAnswer', e?.target?.checked)}
            />

            <Checkbox
              label="Show Live Leaderboard"
              description="Display rankings during the game"
              checked={gameConfig?.showLeaderboard}
              onChange={(e) => handleConfigChange('showLeaderboard', e?.target?.checked)}
            />

            <Checkbox
              label="Auto-advance Questions"
              description="Automatically move to next question"
              checked={gameConfig?.autoAdvance}
              onChange={(e) => handleConfigChange('autoAdvance', e?.target?.checked)}
            />
          </div>
        </div>
      </div>
      {/* Randomization */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Randomization</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Checkbox
            label="Shuffle Questions"
            description="Present questions in random order"
            checked={gameConfig?.shuffleQuestions}
            onChange={(e) => handleConfigChange('shuffleQuestions', e?.target?.checked)}
          />

          <Checkbox
            label="Shuffle Answer Options"
            description="Randomize answer choice order"
            checked={gameConfig?.shuffleAnswers}
            onChange={(e) => handleConfigChange('shuffleAnswers', e?.target?.checked)}
          />
        </div>
      </div>
      {/* Access Control */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Access Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Checkbox
            label="Require Registration"
            description="Players must register to participate"
            checked={gameConfig?.requireRegistration}
            onChange={(e) => handleConfigChange('requireRegistration', e?.target?.checked)}
          />

          <Checkbox
            label="Allow Replay"
            description="Players can retake the quiz"
            checked={gameConfig?.allowReplay}
            onChange={(e) => handleConfigChange('allowReplay', e?.target?.checked)}
          />
        </div>
      </div>
      {/* Configuration Summary */}
      <div className="p-6 bg-accent rounded-lg border border-border">
        <h4 className="text-md font-semibold text-text-primary mb-4">Configuration Summary</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-text-primary">Game Format:</span>
            <p className="text-text-secondary">{gameFormats?.find(f => f?.value === gameConfig?.gameFormat)?.label}</p>
          </div>
          
          <div>
            <span className="font-medium text-text-primary">Max Players:</span>
            <p className="text-text-secondary">{gameConfig?.maxPlayers}</p>
          </div>
          
          <div>
            <span className="font-medium text-text-primary">Time per Question:</span>
            <p className="text-text-secondary">{gameConfig?.timePerQuestion}s</p>
          </div>
          
          <div>
            <span className="font-medium text-text-primary">Scoring:</span>
            <p className="text-text-secondary">{gameConfig?.pointsPerCorrect} pts correct</p>
          </div>
          
          <div>
            <span className="font-medium text-text-primary">Estimated Duration:</span>
            <p className="text-text-secondary">~{calculateEstimatedDuration()} minutes</p>
          </div>
          
          <div>
            <span className="font-medium text-text-primary">Special Features:</span>
            <p className="text-text-secondary">
              {[
                gameConfig?.speedBonus && 'Speed Bonus',
                gameConfig?.streakBonus && 'Streak Bonus',
                gameConfig?.enableLifelines && 'Lifelines',
                gameConfig?.enableHints && 'Hints'
              ]?.filter(Boolean)?.join(', ') || 'None'}
            </p>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button
          variant="outline"
          iconName="RotateCcw"
          iconPosition="left"
          iconSize={16}
          onClick={() => {
            const defaultConfig = {
              gameFormat: '1v1',
              maxPlayers: 2,
              timePerQuestion: 30,
              totalTimeLimit: 0,
              scoringSystem: 'points',
              pointsPerCorrect: 10,
              pointsPerIncorrect: 0,
              bonusPoints: false,
              speedBonus: false,
              streakBonus: false,
              allowSkip: true,
              showCorrectAnswer: true,
              shuffleQuestions: true,
              shuffleAnswers: true,
              enableHints: false,
              enableLifelines: false,
              autoAdvance: true,
              showLeaderboard: true,
              allowReplay: false,
              requireRegistration: false
            };
            setGameConfig(defaultConfig);
            onConfigUpdate(defaultConfig);
          }}
        >
          Reset to Defaults
        </Button>

        <Button
          variant="default"
          iconName="Save"
          iconPosition="left"
          iconSize={16}
          onClick={() => console.log('Saving configuration:', gameConfig)}
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default GameConfiguration;