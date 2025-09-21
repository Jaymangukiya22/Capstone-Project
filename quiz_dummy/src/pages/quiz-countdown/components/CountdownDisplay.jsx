// CountdownDisplay component
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CountdownDisplay = ({ onCountdownComplete }) => {
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

  const numberVariants = {
    initial: { 
      scale: 0.5, 
      opacity: 0,
      rotateY: -90
    },
    animate: { 
      scale: 1, 
      opacity: 1,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        duration: 0.6
      }
    },
    exit: { 
      scale: 1.2, 
      opacity: 0,
      rotateY: 90,
      transition: {
        duration: 0.4
      }
    }
  };

  const goVariants = {
    initial: { 
      scale: 0.3, 
      opacity: 0,
      y: 50
    },
    animate: { 
      scale: [0.3, 1.1, 1], 
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        duration: 0.8
      }
    },
    exit: { 
      scale: 0.8, 
      opacity: 0,
      y: -30,
      transition: {
        duration: 0.5
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <AnimatePresence mode="wait">
          {!showGo && currentCount > 0 && (
            <motion.div
              key={currentCount}
              variants={numberVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative"
            >
              <div className="text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold text-primary leading-none select-none">
                {currentCount}
              </div>
              <motion.div
                className="absolute inset-0 text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold text-primary/20 leading-none select-none"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.1, 0.2]
                }}
                transition={{
                  duration: 1,
                  ease: "easeInOut"
                }}
              >
                {currentCount}
              </motion.div>
            </motion.div>
          )}

          {showGo && !isComplete && (
            <motion.div
              key="go"
              variants={goVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative"
            >
              <motion.div
                variants={pulseVariants}
                animate="animate"
                className="text-[8rem] md:text-[12rem] lg:text-[16rem] font-bold text-success leading-none select-none"
              >
                GO!
              </motion.div>
              <motion.div
                className="absolute inset-0 text-[8rem] md:text-[12rem] lg:text-[16rem] font-bold text-success/30 leading-none select-none"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.1, 0.3]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                GO!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated circles around the countdown */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)]?.map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-primary/20 rounded-full"
              style={{
                left: `${20 + (i * 12)}%`,
                top: `${30 + (i % 2) * 40}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2 + (i * 0.2),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CountdownDisplay;