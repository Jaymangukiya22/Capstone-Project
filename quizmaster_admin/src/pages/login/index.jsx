import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SecurityBadges from './components/SecurityBadges';
import RoleIndicator from './components/RoleIndicator';
import LoginHeader from './components/LoginHeader';
import Icon from '../../components/AppIcon';


const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (formData) => {
    setIsLoading(true);
    
    try {
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store user session (in real app, this would be handled by auth service)
      localStorage.setItem('quizmaster_session', JSON.stringify({
        email: formData?.email,
        loginTime: new Date()?.toISOString(),
        rememberMe: formData?.rememberMe
      }));
      
      // Navigate to dashboard
      navigate('/quiz-dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding and Information */}
          <div className="space-y-8">
            <LoginHeader />
            
            {/* Features Highlight */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon name="LayoutDashboard" size={16} className="text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">Dashboard</h3>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Comprehensive overview of quiz performance and system metrics
                  </p>
                </div>
                
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                      <Icon name="Monitor" size={16} className="text-success" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">Live Monitor</h3>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Real-time tracking of active quiz sessions and player progress
                  </p>
                </div>
                
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <Icon name="Plus" size={16} className="text-secondary" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">Quiz Builder</h3>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Intuitive tools for creating and configuring quiz content
                  </p>
                </div>
                
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                      <Icon name="FolderTree" size={16} className="text-warning" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">Categories</h3>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Hierarchical organization system for quiz content management
                  </p>
                </div>
              </div>
            </div>

            {/* Role Indicator */}
            <RoleIndicator />
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full">
            <div className="bg-card border border-border rounded-xl shadow-elevation-2 p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-text-primary mb-2">Administrator Sign In</h2>
                  <p className="text-sm text-text-secondary">
                    Enter your credentials to access the quiz management system
                  </p>
                </div>

                <LoginForm onLogin={handleLogin} isLoading={isLoading} />

                {/* Demo Credentials Info */}
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <div className="flex items-start space-x-2">
                    <Icon name="Info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-text-primary mb-1">Demo Credentials</p>
                      <div className="text-xs text-text-secondary space-y-1">
                        <p><strong>Admin:</strong> admin@quizmaster.com / admin123</p>
                        <p><strong>Manager:</strong> manager@quizmaster.com / manager123</p>
                        <p><strong>Creator:</strong> creator@quizmaster.com / creator123</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Badges */}
                <SecurityBadges />
              </div>
            </div>

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-2">
              <div className="flex items-center justify-center space-x-4 text-xs text-text-secondary">
                <button className="hover:text-text-primary transition-smooth">Privacy Policy</button>
                <span>•</span>
                <button className="hover:text-text-primary transition-smooth">Terms of Service</button>
                <span>•</span>
                <button className="hover:text-text-primary transition-smooth">Support</button>
              </div>
              <p className="text-xs text-text-secondary">
                © {new Date()?.getFullYear()} QuizMaster. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;