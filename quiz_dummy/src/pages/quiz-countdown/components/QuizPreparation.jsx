// QuizPreparation component
import React from 'react';
import { motion } from 'framer-motion';
import Icon from '../../../components/AppIcon';

const QuizPreparationInfo = ({ isVisible }) => {
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      scale: 1.05,
      transition: {
        duration: 0.4
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -20 
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
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

  if (!isVisible) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4"
    >
      <motion.div
        variants={pulseVariants}
        animate="animate"
        className="bg-card/90 backdrop-blur-sm rounded-lg shadow-lg border p-6"
      >
        <div className="text-center mb-4">
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center mb-2"
          >
            <Icon name="Clock" size={24} className="text-primary mr-2" />
            <h3 className="text-lg font-semibold text-foreground">Get Ready!</h3>
          </motion.div>
          <motion.p
            variants={itemVariants}
            className="text-sm text-muted-foreground"
          >
            Your quiz is about to begin
          </motion.p>
        </div>

        <motion.div
          variants={itemVariants}
          className="space-y-3"
        >
          <div className="flex items-center text-sm text-foreground">
            <Icon name="FileText" size={16} className="text-primary mr-3 flex-shrink-0" />
            <span>10 multiple choice questions</span>
          </div>
          
          <div className="flex items-center text-sm text-foreground">
            <Icon name="Timer" size={16} className="text-primary mr-3 flex-shrink-0" />
            <span>5 minutes total time limit</span>
          </div>
          
          <div className="flex items-center text-sm text-foreground">
            <Icon name="Target" size={16} className="text-primary mr-3 flex-shrink-0" />
            <span>Answer all questions to complete</span>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-4 pt-4 border-t border-border"
        >
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Icon name="Info" size={14} className="mr-2" />
            <span>You can navigate between questions freely</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default QuizPreparationInfo;