// Quiz countdown page index
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CountdownBackground from './components/CountdownBackground';
import CountdownDisplay from './components/CountdownDisplay';
import QuizPreparationInfo from './components/QuizPreparationInfo';

const QuizCountdown = () => {
  const navigate = useNavigate();
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
    navigate('/quiz-interface');
  };

  const pageVariants = {
    initial: { 
      opacity: 0,
      scale: 1.05
    },
    animate: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-background relative overflow-hidden"
    >
      <CountdownBackground>
        <div className="w-full h-full relative">
          {/* Main countdown display */}
          <AnimatePresence mode="wait">
            {isCountdownStarted && (
              <motion.div
                key="countdown"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.6 }}
                className="h-full"
              >
                <CountdownDisplay onCountdownComplete={handleCountdownComplete} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preparation info overlay */}
          <AnimatePresence>
            <QuizPreparationInfo isVisible={showPreparationInfo} />
          </AnimatePresence>

          {/* Header with quiz title */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20"
          >
            <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-sm border px-6 py-3">
              <h1 className="text-xl md:text-2xl font-bold text-foreground text-center">
                QuizMaster Assessment
              </h1>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Preparing your quiz experience...
              </p>
            </div>
          </motion.div>

          {/* Loading indicator during preparation */}
          {showPreparationInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)]?.map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/40 rounded-full"
                style={{
                  left: `${10 + (i * 10)}%`,
                  top: `${20 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [-5, 5, -5],
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 3 + (i * 0.2),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.4
                }}
              />
            ))}
          </div>
        </div>
      </CountdownBackground>
    </motion.div>
  );
};

export default QuizCountdown;