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
    <div className="flex items-center justify-center h-full px-4 py-8">
      <div className="text-center w-full max-w-lg">
        {!showGo && currentCount > 0 && (
          <div className="relative animate-in zoom-in duration-600">
            {/* Mobile-optimized countdown numbers */}
            <div className="text-[8rem] sm:text-[10rem] md:text-[12rem] lg:text-[16rem] xl:text-[20rem] font-bold text-primary leading-none select-none animate-pulse">
              {currentCount}
            </div>
            <div className="absolute inset-0 text-[8rem] sm:text-[10rem] md:text-[12rem] lg:text-[16rem] xl:text-[20rem] font-bold text-primary/20 leading-none select-none">
              {currentCount}
            </div>
          </div>
        )}

        {showGo && !isComplete && (
          <div className="relative animate-in zoom-in duration-800">
            {/* Mobile-optimized GO text */}
            <div className="text-[6rem] sm:text-[8rem] md:text-[10rem] lg:text-[12rem] xl:text-[16rem] font-bold text-green-500 leading-none select-none animate-bounce">
              GO!
            </div>
            <div className="absolute inset-0 text-[6rem] sm:text-[8rem] md:text-[10rem] lg:text-[12rem] xl:text-[16rem] font-bold text-green-500/30 leading-none select-none">
              GO!
            </div>
          </div>
        )}

        {/* Animated circles around the countdown - Mobile optimized */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-primary/20 rounded-full animate-bounce"
              style={{
                left: `${15 + (i * 20)}%`,
                top: `${25 + (i % 2) * 50}%`,
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
