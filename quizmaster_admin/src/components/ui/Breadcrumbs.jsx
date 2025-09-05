import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Breadcrumbs = ({ customItems = null, className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const routeMap = {
    '/quiz-dashboard': { label: 'Dashboard', icon: 'LayoutDashboard' },
    '/category-management': { label: 'Category Management', icon: 'FolderTree' },
    '/quiz-builder': { label: 'Quiz Builder', icon: 'Plus' },
    '/question-editor': { label: 'Question Editor', icon: 'Edit3' },
    '/live-quiz-monitor': { label: 'Live Quiz Monitor', icon: 'Monitor' },
    '/login': { label: 'Login', icon: 'LogIn' },
  };

  const generateBreadcrumbs = () => {
    if (customItems) return customItems;

    const pathSegments = location?.pathname?.split('/')?.filter(Boolean);
    const breadcrumbs = [];

    // Always start with Dashboard unless we're on login
    if (location?.pathname !== '/login') {
      breadcrumbs?.push({
        label: 'Dashboard',
        path: '/quiz-dashboard',
        icon: 'LayoutDashboard',
        clickable: location?.pathname !== '/quiz-dashboard'
      });
    }

    // Add current page if it's not dashboard
    if (location?.pathname !== '/quiz-dashboard' && location?.pathname !== '/login') {
      const currentRoute = routeMap?.[location?.pathname];
      if (currentRoute) {
        breadcrumbs?.push({
          label: currentRoute?.label,
          path: location?.pathname,
          icon: currentRoute?.icon,
          clickable: false
        });
      }
    }

    // Special handling for hierarchical content
    if (location?.pathname === '/question-editor') {
      // Insert Quiz Builder before Question Editor
      breadcrumbs?.splice(-1, 0, {
        label: 'Quiz Builder',
        path: '/quiz-builder',
        icon: 'Plus',
        clickable: true
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs?.length <= 1) return null;

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <div className="flex items-center space-x-2 overflow-x-auto">
        {breadcrumbs?.map((item, index) => (
          <div key={item?.path || index} className="flex items-center space-x-2 whitespace-nowrap">
            {index > 0 && (
              <Icon 
                name="ChevronRight" 
                size={14} 
                className="text-text-secondary flex-shrink-0" 
              />
            )}
            
            <div className="flex items-center space-x-1.5">
              <Icon 
                name={item?.icon} 
                size={14} 
                className={item?.clickable ? 'text-primary' : 'text-text-secondary'} 
              />
              
              {item?.clickable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigation(item?.path)}
                  className="p-0 h-auto font-normal text-primary hover:text-primary/80 hover:underline"
                >
                  {item?.label}
                </Button>
              ) : (
                <span className="font-medium text-text-primary">
                  {item?.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Mobile: Show only current page */}
      <div className="md:hidden flex items-center space-x-2">
        <Icon 
          name={breadcrumbs?.[breadcrumbs?.length - 1]?.icon} 
          size={16} 
          className="text-text-secondary" 
        />
        <span className="font-medium text-text-primary">
          {breadcrumbs?.[breadcrumbs?.length - 1]?.label}
        </span>
      </div>
    </nav>
  );
};

export default Breadcrumbs;