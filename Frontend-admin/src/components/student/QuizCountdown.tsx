import React, { useState, useEffect } from 'react';
import CountdownBackground from './quiz-countdown/CountdownBackground';
import CountdownDisplay from './quiz-countdown/CountdownDisplay';
import QuizPreparation from './quiz-countdown/QuizPreparation';

const QuizCountdown: React.FC = () => {
  const [showPreparationInfo, setShowPreparationInfo] = useState(true);
  const [isCountdownStarted, setIsCountdownStarted] = useState(false);

  useEffect(() => {
    // Start countdown after showing preparation info for 2 seconds
    const timer = setTimeout(() => {
      setShowPreparationInfo(false);
      setIsCountdownStarted(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleCountdownComplete = () => {
    // Navigate to quiz interface after countdown completes
    window.location.pathname = '/quiz-interface';
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden animate-in fade-in duration-800">
      {/* Full-screen quiz mode indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/20">
          Quiz Mode - Full Screen
        </div>
      </div>

      <CountdownBackground>
        <div className="w-full h-full relative">
          {/* Main countdown display */}
          {isCountdownStarted && (
            <div className="h-full animate-in zoom-in duration-600">
              <CountdownDisplay onCountdownComplete={handleCountdownComplete} />
            </div>
          )}

          {/* Preparation info overlay */}
          <QuizPreparation isVisible={showPreparationInfo} />

          {/* Header with quiz title */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 animate-in slide-in-from-top duration-800 delay-200">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-sm border px-6 py-3">
              <h1 className="text-xl md:text-2xl font-bold text-foreground text-center">
                React Fundamentals Assessment
              </h1>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Preparing your quiz experience...
              </p>
            </div>
          </div>

          {/* Loading indicator during preparation */}
          {showPreparationInfo && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-in fade-in duration-400">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-primary/40 rounded-full animate-bounce"
                style={{
                  left: `${10 + (i * 10)}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: `${3 + (i * 0.2)}s`
                }}
              />
            ))}
          </div>
        </div>
      </CountdownBackground>
    </div>
  );
};

export default QuizCountdown;
