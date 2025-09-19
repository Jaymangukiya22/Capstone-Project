// CelebrationAnimation component
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../../../components/AppIcon';

const CelebrationAnimation = ({ 
  score = 0, 
  totalQuestions = 10, 
  className = "" 
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const percentage = Math.round((score / totalQuestions) * 100);

  useEffect(() => {
    if (percentage >= 70) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  const confettiPieces = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {confettiPieces?.map((piece) => (
            <motion.div
              key={piece}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']?.[piece % 5],
                left: `${Math.random() * 100}%`,
                top: '-10px'
              }}
              initial={{ y: -10, rotate: 0, opacity: 1 }}
              animate={{ 
                y: window.innerHeight + 10, 
                rotate: 360,
                opacity: 0
              }}
              transition={{
                duration: 3,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20"
      >
        {percentage >= 90 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center mb-4"
          >
            <div className="inline-flex items-center space-x-2 bg-success/10 text-success px-4 py-2 rounded-full">
              <Icon name="Star" size={20} className="text-success" />
              <span className="font-bold">Outstanding Performance!</span>
              <Icon name="Star" size={20} className="text-success" />
            </div>
          </motion.div>
        )}

        {percentage >= 70 && percentage < 90 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.1, 1] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-4"
          >
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <Icon name="Award" size={20} className="text-primary" />
              <span className="font-bold">Great Job!</span>
              <Icon name="Award" size={20} className="text-primary" />
            </div>
          </motion.div>
        )}

        {percentage >= 50 && percentage < 70 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.1, 1] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-4"
          >
            <div className="inline-flex items-center space-x-2 bg-warning/10 text-warning px-4 py-2 rounded-full">
              <Icon name="ThumbsUp" size={20} className="text-warning" />
              <span className="font-bold">Good Effort!</span>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <div className="text-sm text-muted-foreground mb-2">
            Quiz completed on {new Date()?.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Time: {new Date()?.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CelebrationAnimation;