import React, { useState, useEffect } from 'react';

interface CountdownDisplayProps {
  onCountdownComplete: () => void;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ onCountdownComplete }) => {
  const [currentCount, setCurrentCount] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentCount((prev) => {
        if (prev === 1) {
          setShowGo(true);
          setTimeout(() => {
            setIsComplete(true);
            setTimeout(() => {
              onCountdownComplete();
            }, 800);
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCountdownComplete]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        {!showGo && currentCount > 0 && (
          <div className="relative animate-in zoom-in duration-600">
            <div className="text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold text-primary leading-none select-none animate-pulse">
              {currentCount}
            </div>
            <div className="absolute inset-0 text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold text-primary/20 leading-none select-none">
              {currentCount}
            </div>
          </div>
        )}

        {showGo && !isComplete && (
          <div className="relative animate-in zoom-in duration-800">
            <div className="text-[8rem] md:text-[12rem] lg:text-[16rem] font-bold text-green-500 leading-none select-none animate-bounce">
              GO!
            </div>
            <div className="absolute inset-0 text-[8rem] md:text-[12rem] lg:text-[16rem] font-bold text-green-500/30 leading-none select-none">
              GO!
            </div>
          </div>
        )}

        {/* Animated circles around the countdown */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-primary/20 rounded-full animate-bounce"
              style={{
                left: `${20 + (i * 12)}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i * 0.2)}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CountdownDisplay;
