import React from 'react';
import Icon from '../../../components/AppIcon';

const RoleIndicator = ({ className = '' }) => {
  const userRoles = [
    {
      role: 'Administrator',
      icon: 'Shield',
      description: 'Full system access and user management',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      role: 'Content Manager',
      icon: 'Edit3',
      description: 'Quiz creation and content management',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      role: 'Quiz Creator',
      icon: 'Plus',
      description: 'Question creation and quiz building',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Access Levels</h3>
        <p className="text-xs text-text-secondary">Choose your role to access appropriate features</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {userRoles?.map((role, index) => (
          <div
            key={index}
            className={`p-3 ${role?.bgColor} border border-border/50 rounded-lg text-center transition-smooth hover:shadow-elevation-1`}
          >
            <div className={`w-8 h-8 ${role?.bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}>
              <Icon name={role?.icon} size={16} className={role?.color} />
            </div>
            <h4 className="text-xs font-medium text-text-primary mb-1">{role?.role}</h4>
            <p className="text-xs text-text-secondary leading-tight">{role?.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleIndicator;