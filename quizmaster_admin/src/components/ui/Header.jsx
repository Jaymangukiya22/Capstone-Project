import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = ({ className = '' }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const primaryNavItems = [
    { path: '/quiz-dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/quiz-builder', label: 'Quiz Builder', icon: 'Plus' },
    { path: '/live-quiz-monitor', label: 'Live Monitor', icon: 'Monitor' },
    { path: '/category-management', label: 'Categories', icon: 'FolderTree' },
  ];

  const secondaryNavItems = [
    { path: '/question-editor', label: 'Question Editor', icon: 'Edit3' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMoreMenuOpen(false);
  };

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  return (
    <header className={`bg-surface border-b border-border shadow-elevation-1 sticky top-0 z-100 ${className}`}>
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Brain" size={20} color="white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-text-primary">QuizMaster</h1>
              <span className="text-xs text-text-secondary -mt-1">Admin</span>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {primaryNavItems?.map((item) => (
            <Button
              key={item?.path}
              variant={isActivePath(item?.path) ? 'default' : 'ghost'}
              size="sm"
              iconName={item?.icon}
              iconPosition="left"
              iconSize={16}
              onClick={() => handleNavigation(item?.path)}
              className="px-3 py-2"
            >
              {item?.label}
            </Button>
          ))}

          {/* More Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              iconName="MoreHorizontal"
              iconSize={16}
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="px-3 py-2"
            >
              More
            </Button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-elevation-2 py-1 z-200">
                {secondaryNavItems?.map((item) => (
                  <button
                    key={item?.path}
                    onClick={() => handleNavigation(item?.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm transition-smooth hover:bg-accent ${
                      isActivePath(item?.path) 
                        ? 'bg-accent text-accent-foreground font-medium' 
                        : 'text-popover-foreground'
                    }`}
                  >
                    <Icon name={item?.icon} size={16} />
                    <span>{item?.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            iconName="Menu"
            iconSize={20}
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          />
        </div>

        {/* User Actions */}
        <div className="hidden md:flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            iconName="Bell"
            iconSize={18}
            className="relative"
          >
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            iconName="Settings"
            iconSize={18}
          />
          
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Icon name="User" size={16} color="white" />
          </div>
        </div>
      </div>
      {/* Mobile Navigation Menu */}
      {isMoreMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <nav className="px-4 py-2 space-y-1">
            {[...primaryNavItems, ...secondaryNavItems]?.map((item) => (
              <button
                key={item?.path}
                onClick={() => handleNavigation(item?.path)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm transition-smooth ${
                  isActivePath(item?.path)
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Icon name={item?.icon} size={18} />
                <span>{item?.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {/* Overlay for mobile menu */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-50 md:hidden"
          onClick={() => setIsMoreMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;