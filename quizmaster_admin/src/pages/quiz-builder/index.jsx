import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import LiveSessionIndicator from '../../components/ui/LiveSessionIndicator';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import QuizMetadataForm from './components/QuizMetadataForm';
import QuestionManagement from './components/QuestionManagement';
import GameConfiguration from './components/GameConfiguration';
import QuizPreview from './components/QuizPreview';

const QuizBuilder = () => {
  const [activeTab, setActiveTab] = useState('metadata');
  const [quizData, setQuizData] = useState({});
  const [questions, setQuestions] = useState([]);
  const [gameConfig, setGameConfig] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Add this state
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if editing existing quiz
  const quizId = searchParams?.get('id');
  const isEditing = Boolean(quizId);

  const tabs = [
    {
      id: 'metadata',
      label: 'Quiz Details',
      icon: 'FileText',
      description: 'Basic information and settings'
    },
    {
      id: 'questions',
      label: 'Questions',
      icon: 'HelpCircle',
      description: 'Manage quiz questions',
      badge: questions?.length || null
    },
    {
      id: 'configuration',
      label: 'Game Settings',
      icon: 'Settings',
      description: 'Configure game rules and scoring'
    },
    {
      id: 'preview',
      label: 'Preview & Test',
      icon: 'Eye',
      description: 'Test your quiz before publishing'
    }
  ];

  // Load existing quiz data if editing
  useEffect(() => {
    if (isEditing) {
      // Simulate loading existing quiz data
      const mockExistingQuiz = {
        title: "Advanced JavaScript Concepts",
        description: "Deep dive into advanced JavaScript topics including closures, prototypes, and async programming",
        category: "science",
        subcategory: "computer",
        difficulty: "advanced",
        estimatedTime: "45",
        tags: "javascript, programming, advanced",
        isPublic: true
      };
      setQuizData(mockExistingQuiz);
    }
  }, [isEditing]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, quizData, questions, gameConfig]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e?.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleAutoSave = async () => {
    setIsSaving(true);
    try {
      // Simulate auto-save API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuizDataUpdate = (newData) => {
    setQuizData(newData);
    setHasUnsavedChanges(true);
  };

  const handleQuestionsUpdate = (newQuestions) => {
    setQuestions(newQuestions);
    setHasUnsavedChanges(true);
  };

  const handleGameConfigUpdate = (newConfig) => {
    setGameConfig(newConfig);
    setHasUnsavedChanges(true);
  };

  const handleSaveQuiz = async () => {
    setIsSaving(true);
    try {
      // Simulate save API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const quizPayload = {
        ...quizData,
        questions,
        gameConfig,
        updatedAt: new Date()?.toISOString()
      };
      
      console.log('Saving quiz:', quizPayload);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      // Show success message
      alert(`Quiz ${isEditing ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (!quizData?.title || questions?.length === 0) {
      alert('Please complete quiz details and add at least one question before publishing.');
      return;
    }

    setIsSaving(true);
    try {
      await handleSaveQuiz();
      // Simulate publish API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Quiz published successfully! Players can now access it.');
      navigate('/quiz-dashboard');
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Failed to publish quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartLiveSession = () => {
    if (!quizData?.title || questions?.length === 0) {
      alert('Please complete quiz setup before starting a live session.');
      return;
    }
    
    navigate('/live-quiz-monitor', { 
      state: { 
        quizData, 
        questions, 
        gameConfig,
        startSession: true 
      } 
    });
  };

  const getTabValidation = (tabId) => {
    switch (tabId) {
      case 'metadata':
        return quizData?.title && quizData?.description && quizData?.category;
      case 'questions':
        return questions?.length > 0;
      case 'configuration':
        return gameConfig?.gameFormat && gameConfig?.maxPlayers;
      case 'preview':
        return quizData?.title && questions?.length > 0;
      default:
        return false;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'metadata':
        return (
          <QuizMetadataForm
            quizData={quizData}
            onUpdate={handleQuizDataUpdate}
            onSave={handleSaveQuiz}
          />
        );
      case 'questions':
        return (
          <QuestionManagement
            questions={questions}
            onQuestionsUpdate={handleQuestionsUpdate}
          />
        );
      case 'configuration':
        return (
          <GameConfiguration
            config={gameConfig}
            onConfigUpdate={handleGameConfigUpdate}
          />
        );
      case 'preview':
        return (
          <QuizPreview
            quizData={quizData}
            questions={questions}
            gameConfig={gameConfig}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar onToggleCollapse={setSidebarCollapsed} />
      <main className="lg:ml-60 min-h-screen">
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <Breadcrumbs />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Plus" size={20} color="white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    {isEditing ? 'Edit Quiz' : 'Quiz Builder'}
                  </h1>
                  <p className="text-text-secondary">
                    {isEditing ? 'Update your quiz content and settings' : 'Create engaging quizzes with comprehensive configuration options'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <LiveSessionIndicator />
              
              {/* Save Status */}
              <div className="flex items-center space-x-2 text-sm">
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={16} className="text-primary animate-spin" />
                    <span className="text-text-secondary">Saving...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <Icon name="Check" size={16} className="text-success" />
                    <span className="text-success">
                      Saved {lastSaved?.toLocaleTimeString()}
                    </span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Icon name="AlertCircle" size={16} className="text-warning" />
                    <span className="text-warning">Unsaved changes</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/quiz-dashboard')}
                iconName="ArrowLeft"
                iconPosition="left"
                iconSize={16}
              >
                Back to Dashboard
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveQuiz}
                loading={isSaving}
                iconName="Save"
                iconPosition="left"
                iconSize={16}
              >
                Save Draft
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                onClick={handleStartLiveSession}
                disabled={!quizData?.title || questions?.length === 0}
                iconName="Play"
                iconPosition="left"
                iconSize={16}
              >
                Start Live Session
              </Button>
              
              <Button
                variant="default"
                onClick={handlePublishQuiz}
                loading={isSaving}
                disabled={!quizData?.title || questions?.length === 0}
                iconName="Upload"
                iconPosition="left"
                iconSize={16}
              >
                Publish Quiz
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border">
            <nav className="flex space-x-8 overflow-x-auto">
              {tabs?.map((tab) => {
                const isActive = activeTab === tab?.id;
                const isValid = getTabValidation(tab?.id);
                
                return (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-smooth ${
                      isActive
                        ? 'border-primary text-primary' :'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                    }`}
                  >
                    <Icon name={tab?.icon} size={16} />
                    <span>{tab?.label}</span>
                    {tab?.badge && (
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                        {tab?.badge}
                      </span>
                    )}
                    {isValid && (
                      <Icon name="CheckCircle" size={14} className="text-success" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-6">
              {/* Tab Header */}
              <div className="mb-6 pb-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  <Icon 
                    name={tabs?.find(t => t?.id === activeTab)?.icon} 
                    size={20} 
                    className="text-primary" 
                  />
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      {tabs?.find(t => t?.id === activeTab)?.label}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      {tabs?.find(t => t?.id === activeTab)?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              {renderTabContent()}
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden fixed bottom-20 left-4 right-4 z-50">
            <div className="bg-card border border-border rounded-lg shadow-elevation-3 p-2">
              <div className="grid grid-cols-4 gap-1">
                {tabs?.map((tab) => {
                  const isActive = activeTab === tab?.id;
                  const isValid = getTabValidation(tab?.id);
                  
                  return (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-smooth ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <div className="relative">
                        <Icon name={tab?.icon} size={18} />
                        {isValid && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full flex items-center justify-center">
                            <Icon name="Check" size={8} color="white" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium">{tab?.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizBuilder;