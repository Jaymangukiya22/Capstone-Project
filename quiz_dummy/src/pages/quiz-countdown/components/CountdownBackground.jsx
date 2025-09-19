// CountdownBar component
import React from 'react';
import { motion } from 'framer-motion';

const CountdownBackground = ({ children }) => {
  const backgroundVariants = {
    initial: { 
      opacity: 0,
      scale: 1.1
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

  const overlayVariants = {
    animate: {
      background: [
        "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
        "radial-gradient(circle at 80% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
        "radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)",
        "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)"
      ],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const particleVariants = {
    animate: {
      y: [-20, -100, -20],
      x: [-10, 10, -10],
      opacity: [0, 1, 0],
      scale: [0.5, 1, 0.5],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      variants={backgroundVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
    >
      {/* Animated background overlay */}
      <motion.div
        variants={overlayVariants}
        animate="animate"
        className="absolute inset-0"
      />
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)]?.map((_, i) => (
          <motion.div
            key={i}
            variants={particleVariants}
            animate="animate"
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            transition={{
              delay: i * 0.5,
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>
      {/* Content container */}
      <div className="relative z-10 h-full flex items-center justify-center">
        {children}
      </div>
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
    </motion.div>
  );
};

export default CountdownBackground;