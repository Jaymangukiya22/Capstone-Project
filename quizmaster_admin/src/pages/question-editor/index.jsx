import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

// Import all components
import QuestionTypeSelector from './components/QuestionTypeSelector';
import RichTextEditor from './components/RichTextEditor';
import MediaUploadPanel from './components/MediaUploadPanel';
import AnswerConfiguration from './components/AnswerConfiguration';
import QuestionMetadata from './components/QuestionMetadata';
import QuestionPreview from './components/QuestionPreview';
import RevisionHistory from './components/RevisionHistory';

const QuestionEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Main state
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState([]);
  const [media, setMedia] = useState([]);
  const [metadata, setMetadata] = useState({
    category: 'general',
    difficulty: 'medium',
    timeLimit: '60',
    points: '5',
    tags: '',
    questionId: '',
    negativeMarking: '0',
    partialCredit: '0',
    learningObjective: ''
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize default answers based on question type
  useEffect(() => {
    switch (questionType) {
      case 'multiple-choice':
        if (answers?.length === 0) {
          setAnswers([
            { id: 1, text: '', isCorrect: false, explanation: '' },
            { id: 2, text: '', isCorrect: false, explanation: '' }
          ]);
        }
        break;
      case 'true-false':
        setAnswers([
          { id: 'true', text: 'True', value: true, isCorrect: false, explanation: '' },
          { id: 'false', text: 'False', value: false, isCorrect: false, explanation: '' }
        ]);
        break;
      case 'fill-blank':
        if (answers?.length === 0) {
          setAnswers([{ id: 1, text: '', isCorrect: true, explanation: '' }]);
        }
        break;
      case 'essay':
        setAnswers([]);
        break;
    }
  }, [questionType]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 30000); // Auto-save every 30 seconds

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, questionText, answers, metadata]);

  // Mark as changed when content updates
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [questionText, answers, metadata, media]);

  const handleAutoSave = async () => {
    setIsSaving(true);
    // Simulate auto-save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    setIsSaving(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    setIsSaving(false);
  };

  const handlePublish = async () => {
    if (!questionText?.trim()) {
      alert('Please enter a question before publishing.');
      return;
    }

    if (questionType !== 'essay' && answers?.filter(a => a?.isCorrect)?.length === 0) {
      alert('Please mark at least one correct answer before publishing.');
      return;
    }

    await handleSave();
    alert('Question published successfully!');
  };

  const handleMediaUpload = (mediaItem) => {
    if (mediaItem?.action === 'remove') {
      setMedia(prev => prev?.filter(item => item?.id !== mediaItem?.id));
    } else {
      setMedia(prev => [...prev, mediaItem]);
    }
  };

  const handleRevisionRestore = (revision) => {
    // Simulate restoring a revision
    console.log('Restoring revision:', revision);
    alert(`Restored to version ${revision?.version}`);
  };

  const tabs = [
    { id: 'editor', label: 'Editor', icon: 'Edit3' },
    { id: 'preview', label: 'Preview', icon: 'Eye' },
    { id: 'history', label: 'History', icon: 'History' }
  ];

  const formatLastSaved = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    
    return date?.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar onToggleCollapse={() => {}} />
      <div className="lg:ml-60">
        <div className="p-6 space-y-6">
          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Question Editor</h1>
              <p className="text-muted-foreground mt-1">
                Create and edit quiz questions with rich content and media
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Save Status */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <div className="w-2 h-2 bg-warning rounded-full"></div>
                    <span>Unsaved changes</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Saved {formatLastSaved(lastSaved)}</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <Button
                variant="outline"
                iconName="Save"
                iconPosition="left"
                iconSize={16}
                onClick={handleSave}
                loading={isSaving}
                disabled={!hasUnsavedChanges}
              >
                Save Draft
              </Button>
              
              <Button
                variant="default"
                iconName="Send"
                iconPosition="left"
                iconSize={16}
                onClick={handlePublish}
                loading={isSaving}
              >
                Publish Question
              </Button>
            </div>
          </div>

          {/* Question Title */}
          <div className="bg-card border border-border rounded-lg p-6">
            <Input
              type="text"
              label="Question Title (Optional)"
              placeholder="Enter a descriptive title for this question..."
              description="This helps organize questions in your library"
              className="text-lg"
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Editor */}
            <div className="xl:col-span-2 space-y-6">
              {/* Question Type Selector */}
              <div className="bg-card border border-border rounded-lg p-6">
                <QuestionTypeSelector
                  selectedType={questionType}
                  onTypeChange={setQuestionType}
                />
              </div>

              {/* Tabs */}
              <div className="bg-card border border-border rounded-lg">
                <div className="border-b border-border">
                  <nav className="flex space-x-1 p-1">
                    {tabs?.map((tab) => (
                      <button
                        key={tab?.id}
                        onClick={() => setActiveTab(tab?.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                          activeTab === tab?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-text-primary hover:bg-muted'
                        }`}
                      >
                        <Icon name={tab?.icon} size={16} />
                        <span>{tab?.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'editor' && (
                    <div className="space-y-6">
                      {/* Rich Text Editor */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-3">
                          Question Content
                        </label>
                        <RichTextEditor
                          value={questionText}
                          onChange={setQuestionText}
                          placeholder="Enter your question here..."
                        />
                      </div>

                      {/* Media Upload */}
                      <MediaUploadPanel
                        onMediaUpload={handleMediaUpload}
                        existingMedia={media}
                      />

                      {/* Answer Configuration */}
                      <AnswerConfiguration
                        questionType={questionType}
                        answers={answers}
                        onAnswersChange={setAnswers}
                      />
                    </div>
                  )}

                  {activeTab === 'preview' && (
                    <QuestionPreview
                      question={questionText}
                      questionType={questionType}
                      answers={answers}
                      media={media}
                      metadata={metadata}
                    />
                  )}

                  {activeTab === 'history' && (
                    <RevisionHistory
                      onRestore={handleRevisionRestore}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Metadata & Settings */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <QuestionMetadata
                  metadata={metadata}
                  onMetadataChange={setMetadata}
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Copy"
                    iconPosition="left"
                    iconSize={16}
                  >
                    Duplicate Question
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Download"
                    iconPosition="left"
                    iconSize={16}
                  >
                    Export Question
                  </Button>
                  
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Share"
                    iconPosition="left"
                    iconSize={16}
                  >
                    Share for Review
                  </Button>
                  
                  <Button
                    variant="ghost"
                    fullWidth
                    iconName="Trash2"
                    iconPosition="left"
                    iconSize={16}
                    className="text-error hover:text-error"
                  >
                    Delete Question
                  </Button>
                </div>
              </div>

              {/* Question Stats */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Question Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Times Used:</span>
                    <span className="font-medium text-text-primary">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Score:</span>
                    <span className="font-medium text-text-primary">N/A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difficulty Rating:</span>
                    <span className="font-medium text-text-primary">
                      {metadata?.difficulty || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium text-text-primary">Today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile spacing for bottom navigation */}
      <div className="h-20 lg:hidden"></div>
    </div>
  );
};

export default QuestionEditor;