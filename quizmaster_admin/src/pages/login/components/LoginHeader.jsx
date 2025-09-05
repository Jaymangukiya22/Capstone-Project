import React from 'react';
import Icon from '../../../components/AppIcon';

const LoginHeader = ({ className = '' }) => {
  return (
    <div className={`text-center space-y-4 ${className}`}>
      {/* Logo */}
      <div className="flex items-center justify-center space-x-3">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-elevation-2">
          <Icon name="Brain" size={28} color="white" />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-bold text-text-primary">QuizMaster</h1>
          <p className="text-sm text-text-secondary -mt-1">Admin Portal</p>
        </div>
      </div>
      {/* Welcome Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-primary">Welcome Back</h2>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Sign in to your administrator account to manage quiz content, monitor live sessions, and oversee educational assessments.
        </p>
      </div>
      {/* Current Status */}
      <div className="flex items-center justify-center space-x-4 text-xs text-text-secondary">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span>System Online</span>
        </div>
        <span>•</span>
        <div className="flex items-center space-x-1">
          <Icon name="Clock" size={12} />
          <span>Last updated: {new Date()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export default LoginHeader;