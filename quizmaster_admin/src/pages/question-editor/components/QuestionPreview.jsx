import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';


const QuestionPreview = ({ question, questionType, answers, media, metadata, className = '' }) => {
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [essayAnswer, setEssayAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(metadata?.timeLimit ? parseInt(metadata?.timeLimit) : null);

  // Simulate timer countdown
  React.useEffect(() => {
    if (timeLeft && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleAnswerSelect = (answerId) => {
    if (questionType === 'multiple-choice') {
      setSelectedAnswers(prev => 
        prev?.includes(answerId) 
          ? prev?.filter(id => id !== answerId)
          : [...prev, answerId]
      );
    } else if (questionType === 'true-false') {
      setSelectedAnswers([answerId]);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'hard': return 'bg-error/10 text-error border-error/20';
      case 'expert': return 'bg-purple-100 text-purple-600 border-purple-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs?.toString()?.padStart(2, '0')}`;
  };

  const renderMediaContent = () => {
    if (!media || media?.length === 0) return null;

    return (
      <div className="space-y-4">
        {media?.map((item) => (
          <div key={item?.id} className="rounded-lg overflow-hidden">
            {item?.type === 'image' && (
              <Image
                src={item?.url}
                alt={item?.name}
                className="w-full max-h-64 object-contain bg-muted"
              />
            )}
            {item?.type === 'audio' && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon name="Volume2" size={20} className="text-primary" />
                  <span className="text-sm font-medium">{item?.name}</span>
                </div>
                <audio controls className="w-full mt-2">
                  <source src={item?.url} />
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}
            {item?.type === 'video' && (
              <video controls className="w-full max-h-64 rounded-lg">
                <source src={item?.url} />
                Your browser does not support video playback.
              </video>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderAnswerOptions = () => {
    switch (questionType) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {answers?.map((answer, index) => (
              <div
                key={answer?.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-smooth hover-scale ${
                  selectedAnswers?.includes(answer?.id)
                    ? 'border-primary bg-primary/5' :'border-border hover:border-primary/30'
                }`}
                onClick={() => handleAnswerSelect(answer?.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="flex-1 text-text-primary">{answer?.text}</span>
                  {selectedAnswers?.includes(answer?.id) && (
                    <Icon name="Check" size={16} className="text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'true-false':
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'true', text: 'True', icon: 'Check', color: 'success' },
              { id: 'false', text: 'False', icon: 'X', color: 'error' }
            ]?.map((option) => (
              <div
                key={option?.id}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-smooth hover-scale ${
                  selectedAnswers?.includes(option?.id)
                    ? `border-${option?.color} bg-${option?.color}/5`
                    : 'border-border hover:border-primary/30'
                }`}
                onClick={() => handleAnswerSelect(option?.id)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon 
                    name={option?.icon} 
                    size={24} 
                    className={`text-${option?.color}`} 
                  />
                  <span className="font-medium text-text-primary">{option?.text}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'fill-blank':
        return (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Type your answer here..."
                value={fillBlankAnswer}
                onChange={(e) => setFillBlankAnswer(e?.target?.value)}
                className="w-full p-4 border-2 border-border rounded-lg focus:border-primary focus:outline-none text-text-primary bg-card"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Icon name="Edit3" size={16} className="text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your answer in the text field above
            </p>
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-4">
            <textarea
              placeholder="Write your essay response here..."
              value={essayAnswer}
              onChange={(e) => setEssayAnswer(e?.target?.value)}
              rows={8}
              className="w-full p-4 border-2 border-border rounded-lg focus:border-primary focus:outline-none text-text-primary bg-card resize-none"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Word count: {essayAnswer?.split(' ')?.filter(word => word?.length > 0)?.length}</span>
              <span>Character count: {essayAnswer?.length}</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="HelpCircle" size={24} className="mx-auto mb-2" />
            <p>Select a question type to see answer options</p>
          </div>
        );
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 ${className}`}>
      {/* Preview Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Eye" size={16} className="text-primary" />
            <span className="text-sm font-medium text-text-primary">Live Preview</span>
          </div>
          
          <div className="flex items-center space-x-3">
            {metadata?.difficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(metadata?.difficulty)}`}>
                {metadata?.difficulty}
              </span>
            )}
            
            {timeLeft && (
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                timeLeft <= 10 ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
              }`}>
                <Icon name="Clock" size={12} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            
            {metadata?.points && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {metadata?.points} pts
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Question Content */}
      <div className="p-6 space-y-6">
        {/* Question Text */}
        <div className="space-y-4">
          <div 
            className="text-lg text-text-primary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: question || '<span class="text-muted-foreground italic">Enter your question above to see preview...</span>' }}
          />
          
          {renderMediaContent()}
        </div>

        {/* Answer Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Icon name="MessageSquare" size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Your Answer</span>
          </div>
          
          {renderAnswerOptions()}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="Users" size={14} />
            <span>Question {Math.floor(Math.random() * 20) + 1} of 25</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Skip
            </Button>
            <Button variant="default" size="sm">
              Submit Answer
            </Button>
          </div>
        </div>
      </div>
      {/* Preview Footer */}
      <div className="px-6 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>This is how players will see your question</span>
          <div className="flex items-center space-x-4">
            <span>Category: {metadata?.category || 'Not set'}</span>
            <span>Type: {questionType?.replace('-', ' ') || 'Not selected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionPreview;