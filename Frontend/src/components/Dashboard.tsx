import { useState } from 'react';
import { Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import StatsCards from './StatsCards';
import StudentsPerCourseChart from './StudentsPerCourseChart';
import QuizzesPerCourseChart from './QuizzesPerCourseChart';
import FloatingAddButton from './FloatingAddButton';
import ContentViews from './ContentViews';
import { dashboardStats } from '../data/mockData';
import { authService } from '../services/auth.service';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const renderDashboardContent = () => {
    if (activeTab === 'courses' || activeTab === 'faculties' || activeTab === 'students') {
      return <ContentViews activeTab={activeTab} searchQuery={searchQuery} />;
    }

    // Default dashboard view with stats and charts
    return (
      <div className="space-y-8">
        <StatsCards stats={dashboardStats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <StudentsPerCourseChart />
          <QuizzesPerCourseChart />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search courses, faculties, students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64"
                />
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderDashboardContent()}
        </main>
      </div>

      <FloatingAddButton />
    </div>
  );
};

export default Dashboard;
