import React from 'react';
import Icon from '../../../components/AppIcon';

const CategoryStats = ({ categories, className = '' }) => {
  const calculateStats = () => {
    let totalCategories = 0;
    let totalQuizzes = 0;
    let totalSubcategories = 0;
    let recentlyCreated = 0;

    const countRecursive = (cats) => {
      cats?.forEach(category => {
        totalCategories++;
        totalQuizzes += category?.quizCount || 0;
        
        if (category?.children && category?.children?.length > 0) {
          totalSubcategories += category?.children?.length;
          countRecursive(category?.children);
        }

        // Check if created in last 7 days (mock logic)
        if (category?.isNew) {
          recentlyCreated++;
        }
      });
    };

    countRecursive(categories);

    return {
      totalCategories,
      totalQuizzes,
      totalSubcategories,
      recentlyCreated
    };
  };

  const stats = calculateStats();

  const statItems = [
    {
      label: 'Total Categories',
      value: stats?.totalCategories,
      icon: 'FolderTree',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Total Quizzes',
      value: stats?.totalQuizzes,
      icon: 'FileText',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      label: 'Subcategories',
      value: stats?.totalSubcategories,
      icon: 'Folder',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      label: 'Recently Added',
      value: stats?.recentlyCreated,
      icon: 'Plus',
      color: 'text-success',
      bgColor: 'bg-success/10'
    }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {statItems?.map((stat, index) => (
        <div key={index} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat?.label}
              </p>
              <p className="text-2xl font-bold text-card-foreground mt-1">
                {stat?.value?.toLocaleString()}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat?.bgColor}`}>
              <Icon name={stat?.icon} size={24} className={stat?.color} />
            </div>
          </div>
          
          {/* Trend indicator (mock) */}
          <div className="flex items-center mt-3 text-xs">
            <Icon name="TrendingUp" size={12} className="text-success mr-1" />
            <span className="text-success font-medium">+12%</span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryStats;