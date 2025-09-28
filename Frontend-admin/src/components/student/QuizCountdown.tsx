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
      {/* Full-screen quiz mode indicator - Mobile optimized */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50">
        <div className="bg-primary/10 text-primary text-xs px-2 py-1 sm:px-3 rounded-full border border-primary/20">
          <span className="hidden sm:inline">Quiz Mode - </span>Full Screen
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

          {/* Header with quiz title - Mobile optimized */}
          <div className="absolute top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-20 animate-in slide-in-from-top duration-800 delay-200 px-4 w-full max-w-md">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-sm border px-4 py-3 sm:px-6">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground text-center">
                React Fundamentals Assessment
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-1">
                Preparing your quiz experience...
              </p>
            </div>
          </div>

          {/* Loading indicator during preparation - Mobile optimized */}
          {showPreparationInfo && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-in fade-in duration-400">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* Decorative elements - Fewer on mobile */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-primary/40 rounded-full animate-bounce"
                style={{
                  left: `${15 + (i * 12)}%`,
                  top: `${25 + (i % 3) * 25}%`,
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
