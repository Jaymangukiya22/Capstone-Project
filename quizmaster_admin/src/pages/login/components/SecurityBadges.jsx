import React from 'react';
import Icon from '../../../components/AppIcon';

const SecurityBadges = ({ className = '' }) => {
  const securityFeatures = [
    {
      icon: 'Shield',
      title: 'SSL Encrypted',
      description: '256-bit encryption'
    },
    {
      icon: 'Lock',
      title: 'Secure Login',
      description: 'Multi-factor ready'
    },
    {
      icon: 'Eye',
      title: 'Privacy Protected',
      description: 'GDPR compliant'
    }
  ];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-6 ${className}`}>
      {securityFeatures?.map((feature, index) => (
        <div key={index} className="flex items-center space-x-2 text-text-secondary">
          <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
            <Icon name={feature?.icon} size={14} className="text-success" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary">{feature?.title}</p>
            <p className="text-xs text-text-secondary">{feature?.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SecurityBadges;