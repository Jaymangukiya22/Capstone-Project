import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import LiveSessionIndicator from '../../components/ui/LiveSessionIndicator';
import ContentSearchInterface from '../../components/ui/ContentSearchInterface';
import MetricCard from './components/MetricCard';
import QuickActionCard from './components/QuickActionCard';
import ActivityFeed from './components/ActivityFeed';
import UpcomingQuizzes from './components/UpcomingQuizzes';
import SystemNotifications from './components/SystemNotifications';
import LiveSessionMonitor from './components/LiveSessionMonitor';

const QuizDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    metrics: [],
    activities: [],
    upcomingQuizzes: [],
    notifications: []
  });

  // Mock dashboard data
  useEffect(() => {
    const mockMetrics = [
      {
        title: "Total Quizzes",
        value: "247",
        change: "+12%",
        changeType: "positive",
        icon: "FileText",
        iconColor: "text-primary",
        description: "Active quiz templates"
      },
      {
        title: "Active Categories",
        value: "18",
        change: "+2",
        changeType: "positive",
        icon: "FolderTree",
        iconColor: "text-warning",
        description: "Organized categories"
      },
      {
        title: "Quiz Sessions",
        value: "1,234",
        change: "+8%",
        changeType: "positive",
        icon: "Play",
        iconColor: "text-success",
        description: "Completed this month"
      },
      {
        title: "Player Engagement",
        value: "89.5%",
        change: "-2.1%",
        changeType: "negative",
        icon: "Users",
        iconColor: "text-secondary",
        description: "Average completion rate"
      }
    ];

    const mockActivities = [
      {
        id: 1,
        type: "quiz_created",
        user: "Sarah Johnson",
        action: "created a new quiz",
        target: "JavaScript Advanced Concepts",
        timestamp: new Date(Date.now() - 300000) // 5 minutes ago
      },
      {
        id: 2,
        type: "question_uploaded",
        user: "Mike Chen",
        action: "uploaded 15 questions to",
        target: "World History Quiz",
        timestamp: new Date(Date.now() - 900000) // 15 minutes ago
      },
      {
        id: 3,
        type: "session_completed",
        user: "Alex Rodriguez",
        action: "completed a live session for",
        target: "Mathematics Fundamentals",
        timestamp: new Date(Date.now() - 1800000) // 30 minutes ago
      },
      {
        id: 4,
        type: "category_added",
        user: "Emma Wilson",
        action: "created new category",
        target: "Science & Technology",
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: 5,
        type: "quiz_created",
        user: "David Kim",
        action: "created a new quiz",
        target: "Literature Classics",
        timestamp: new Date(Date.now() - 7200000) // 2 hours ago
      }
    ];

    const mockUpcomingQuizzes = [
      {
        id: 1,
        title: "Weekly Science Challenge",
        scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
        duration: 30,
        status: "ready"
      },
      {
        id: 2,
        title: "History Trivia Night",
        scheduledTime: new Date(Date.now() + 7200000), // 2 hours from now
        duration: 45,
        status: "scheduled"
      },
      {
        id: 3,
        title: "Math Competition Prep",
        scheduledTime: new Date(Date.now() + 86400000), // Tomorrow
        duration: 60,
        status: "pending"
      }
    ];

    const mockNotifications = [
      {
        id: 1,
        type: "warning",
        title: "Server Maintenance",
        message: "Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST.",
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        action: "View Details"
      },
      {
        id: 2,
        type: "info",
        title: "New Feature Available",
        message: "Question analytics dashboard is now available for all quiz creators.",
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        action: "Learn More"
      },
      {
        id: 3,
        type: "success",
        title: "Backup Completed",
        message: "Daily backup of quiz database completed successfully.",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      }
    ];

    setDashboardData({
      metrics: mockMetrics,
      activities: mockActivities,
      upcomingQuizzes: mockUpcomingQuizzes,
      notifications: mockNotifications
    });
  }, []);

  const quickActions = [
    {
      title: 'Create New Quiz',
      description: 'Build a new quiz from scratch with our intuitive builder',
      icon: 'Plus',
      color: 'primary',
      path: '/quiz-builder',
      shortcut: 'Ctrl+N'
    },
    {
      title: 'Start Live Session',
      description: 'Launch a quiz session immediately for real-time participation',
      icon: 'Play',
      color: 'success',
      path: '/live-quiz-monitor',
      shortcut: 'Ctrl+L'
    },
    {
      title: 'Upload Questions',
      description: 'Import questions from CSV or Excel files in bulk',
      icon: 'Upload',
      color: 'secondary',
      path: '/question-editor',
      shortcut: 'Ctrl+U'
    },
    {
      title: 'Manage Categories',
      description: 'Organize and structure your quiz content categories',
      icon: 'FolderTree',
      color: 'warning',
      path: '/category-management',
      shortcut: 'Ctrl+M'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Quiz Dashboard - QuizMaster Admin</title>
        <meta name="description" content="Comprehensive quiz management dashboard for administrators to oversee all quiz activities and system functions." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <Sidebar 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className={`lg:pl-60 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : ''}`}>
          <div className="p-6 pb-20 lg:pb-6">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <Breadcrumbs />
                  <h1 className="text-3xl font-bold text-text-primary mt-2">Dashboard</h1>
                  <p className="text-text-secondary mt-1">
                    Welcome back! Here's what's happening with your quizzes today.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <LiveSessionIndicator />
                  <ContentSearchInterface 
                    scope="all" 
                    className="w-full sm:w-80"
                    onResultSelect={(result) => {
                      // Handle search result selection
                      console.log('Selected result:', result);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {dashboardData?.metrics?.map((metric, index) => (
                <MetricCard
                  key={index}
                  title={metric?.title}
                  value={metric?.value}
                  change={metric?.change}
                  changeType={metric?.changeType}
                  icon={metric?.icon}
                  iconColor={metric?.iconColor}
                  description={metric?.description}
                />
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {quickActions?.map((action, index) => (
                  <QuickActionCard
                    key={index}
                    title={action?.title}
                    description={action?.description}
                    icon={action?.icon}
                    color={action?.color}
                    path={action?.path}
                    shortcut={action?.shortcut}
                  />
                ))}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* Activity Feed - Takes 2 columns on xl screens */}
              <div className="xl:col-span-2">
                <ActivityFeed activities={dashboardData?.activities} />
              </div>
              
              {/* Live Session Monitor */}
              <div className="xl:col-span-1">
                <LiveSessionMonitor />
              </div>
            </div>

            {/* Secondary Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Upcoming Quizzes */}
              <UpcomingQuizzes quizzes={dashboardData?.upcomingQuizzes} />
              
              {/* System Notifications */}
              <SystemNotifications notifications={dashboardData?.notifications} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default QuizDashboard;