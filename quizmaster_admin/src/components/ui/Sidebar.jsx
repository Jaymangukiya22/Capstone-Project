import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Sidebar = ({ isCollapsed = false, onToggleCollapse, className = '' }) => {
  const [activeSession, setActiveSession] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Simulate live session count
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSession(Math.floor(Math.random() * 5));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    {
      section: 'Overview',
      items: [
        { path: '/quiz-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', description: 'System overview and quick access' },
      ]
    },
    {
      section: 'Content Management',
      items: [
        { path: '/category-management', label: 'Categories', icon: 'FolderTree', description: 'Organize quiz categories' },
        { path: '/quiz-builder', label: 'Quiz Builder', icon: 'Plus', description: 'Create and edit quizzes' },
        { path: '/question-editor', label: 'Question Editor', icon: 'Edit3', description: 'Manage individual questions' },
      ]
    },
    {
      section: 'Live Operations',
      items: [
        { path: '/live-quiz-monitor', label: 'Live Monitor', icon: 'Monitor', description: 'Real-time session monitoring', badge: activeSession > 0 ? activeSession : null },
      ]
    },
    {
      section: 'Account',
      items: [
        { path: '/login', label: 'Login', icon: 'LogIn', description: 'Authentication and access' },
      ]
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-100 lg:w-60 lg:flex-col bg-surface border-r border-border shadow-elevation-1 ${className}`}>
        {/* Logo Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Brain" size={20} color="white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-text-primary">QuizMaster</h1>
                <span className="text-xs text-text-secondary -mt-1">Admin</span>
              </div>
            )}
          </div>
          
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              iconName={isCollapsed ? "ChevronRight" : "ChevronLeft"}
              iconSize={16}
              onClick={onToggleCollapse}
              className="p-1"
            />
          )}
        </div>

        {/* Live Session Indicator */}
        {activeSession > 0 && (
          <div className="mx-4 mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-success">
                {activeSession} Active Session{activeSession > 1 ? 's' : ''}
              </span>
            </div>
            {!isCollapsed && (
              <p className="text-xs text-success/80 mt-1">
                Click Live Monitor to manage
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          {navigationItems?.map((section) => (
            <div key={section?.section}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {section?.section}
                </h3>
              )}
              <div className="space-y-1">
                {section?.items?.map((item) => (
                  <div key={item?.path} className="relative group">
                    <button
                      onClick={() => handleNavigation(item?.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm transition-smooth hover-scale ${
                        isActivePath(item?.path)
                          ? 'bg-primary text-primary-foreground font-medium shadow-elevation-1'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <div className="relative">
                        <Icon name={item?.icon} size={18} />
                        {item?.badge && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-xs rounded-full flex items-center justify-center">
                            {item?.badge}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item?.label}</span>
                          {item?.badge && !isActivePath(item?.path) && (
                            <span className="w-5 h-5 bg-error text-white text-xs rounded-full flex items-center justify-center">
                              {item?.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-elevation-2 opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none z-200 whitespace-nowrap">
                        <div className="text-sm font-medium text-popover-foreground">{item?.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{item?.description}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Icon name="User" size={16} color="white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">Admin User</p>
                <p className="text-xs text-text-secondary truncate">admin@quizmaster.com</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              iconName="Settings"
              iconSize={16}
              className="p-1"
            />
          </div>
        </div>
      </aside>
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-100 bg-surface border-t border-border shadow-elevation-3">
        <nav className="flex items-center justify-around py-2">
          {[
            { path: '/quiz-dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
            { path: '/live-quiz-monitor', label: 'Live', icon: 'Monitor', badge: activeSession > 0 ? activeSession : null },
            { path: '/quiz-builder', label: 'Builder', icon: 'Plus' },
            { path: '/category-management', label: 'Categories', icon: 'FolderTree' },
          ]?.map((item) => (
            <button
              key={item?.path}
              onClick={() => handleNavigation(item?.path)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-smooth ${
                isActivePath(item?.path)
                  ? 'text-primary' :'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon name={item?.icon} size={20} />
                {item?.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-xs rounded-full flex items-center justify-center">
                    {item?.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item?.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;