import React, { useState, useEffect } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuizMetadataForm = ({ quizData, onUpdate, onSave, className = '' }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    difficulty: '',
    estimatedTime: '',
    tags: '',
    isPublic: true,
    ...quizData
  });

  const [errors, setErrors] = useState({});
  const [lastSaved, setLastSaved] = useState(null);

  // Mock categories data
  const categories = [
    { value: 'science', label: 'Science & Technology' },
    { value: 'history', label: 'History & Culture' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'literature', label: 'Literature & Arts' },
    { value: 'sports', label: 'Sports & Recreation' },
    { value: 'general', label: 'General Knowledge' }
  ];

  const subcategories = {
    science: [
      { value: 'physics', label: 'Physics' },
      { value: 'chemistry', label: 'Chemistry' },
      { value: 'biology', label: 'Biology' },
      { value: 'computer', label: 'Computer Science' }
    ],
    history: [
      { value: 'ancient', label: 'Ancient History' },
      { value: 'modern', label: 'Modern History' },
      { value: 'world-wars', label: 'World Wars' },
      { value: 'cultural', label: 'Cultural History' }
    ],
    mathematics: [
      { value: 'algebra', label: 'Algebra' },
      { value: 'geometry', label: 'Geometry' },
      { value: 'calculus', label: 'Calculus' },
      { value: 'statistics', label: 'Statistics' }
    ],
    literature: [
      { value: 'classic', label: 'Classic Literature' },
      { value: 'modern', label: 'Modern Literature' },
      { value: 'poetry', label: 'Poetry' },
      { value: 'drama', label: 'Drama & Theater' }
    ],
    sports: [
      { value: 'football', label: 'Football' },
      { value: 'basketball', label: 'Basketball' },
      { value: 'olympics', label: 'Olympics' },
      { value: 'extreme', label: 'Extreme Sports' }
    ],
    general: [
      { value: 'trivia', label: 'General Trivia' },
      { value: 'current-events', label: 'Current Events' },
      { value: 'geography', label: 'Geography' },
      { value: 'entertainment', label: 'Entertainment' }
    ]
  };

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner', description: 'Easy questions for newcomers' },
    { value: 'intermediate', label: 'Intermediate', description: 'Moderate difficulty level' },
    { value: 'advanced', label: 'Advanced', description: 'Challenging questions for experts' },
    { value: 'expert', label: 'Expert', description: 'Extremely difficult questions' }
  ];

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData?.title || formData?.description) {
        handleAutoSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData]);

  const handleAutoSave = () => {
    onUpdate(formData);
    setLastSaved(new Date());
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Reset subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({
        ...prev,
        subcategory: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.title?.trim()) {
      newErrors.title = 'Quiz title is required';
    } else if (formData?.title?.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData?.description?.trim()) {
      newErrors.description = 'Quiz description is required';
    } else if (formData?.description?.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData?.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData?.difficulty) {
      newErrors.difficulty = 'Please select difficulty level';
    }

    if (!formData?.estimatedTime) {
      newErrors.estimatedTime = 'Please specify estimated time';
    } else if (parseInt(formData?.estimatedTime) < 1) {
      newErrors.estimatedTime = 'Time must be at least 1 minute';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const getSubcategoryOptions = () => {
    return formData?.category ? subcategories?.[formData?.category] || [] : [];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="flex items-center space-x-2 text-sm text-success">
          <Icon name="Check" size={16} />
          <span>Auto-saved at {lastSaved?.toLocaleTimeString()}</span>
        </div>
      )}
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Basic Information</h3>
        
        <Input
          label="Quiz Title"
          type="text"
          placeholder="Enter quiz title"
          value={formData?.title}
          onChange={(e) => handleInputChange('title', e?.target?.value)}
          error={errors?.title}
          required
          className="mb-4"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary">
            Description <span className="text-error">*</span>
          </label>
          <textarea
            placeholder="Describe what this quiz covers..."
            value={formData?.description}
            onChange={(e) => handleInputChange('description', e?.target?.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg resize-none transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
              errors?.description 
                ? 'border-error focus:ring-error focus:border-error' :'border-border'
            }`}
          />
          {errors?.description && (
            <p className="text-sm text-error">{errors?.description}</p>
          )}
          <p className="text-xs text-text-secondary">
            {formData?.description?.length}/500 characters
          </p>
        </div>

        <Input
          label="Tags"
          type="text"
          placeholder="Enter tags separated by commas"
          value={formData?.tags}
          onChange={(e) => handleInputChange('tags', e?.target?.value)}
          description="Help others find your quiz with relevant keywords"
          className="mb-4"
        />
      </div>
      {/* Categorization */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Categorization</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Category"
            options={categories}
            value={formData?.category}
            onChange={(value) => handleInputChange('category', value)}
            error={errors?.category}
            required
            searchable
            placeholder="Select category"
          />

          <Select
            label="Subcategory"
            options={getSubcategoryOptions()}
            value={formData?.subcategory}
            onChange={(value) => handleInputChange('subcategory', value)}
            disabled={!formData?.category}
            placeholder="Select subcategory"
            description={!formData?.category ? "Select a category first" : ""}
          />
        </div>

        <Select
          label="Difficulty Level"
          options={difficultyOptions}
          value={formData?.difficulty}
          onChange={(value) => handleInputChange('difficulty', value)}
          error={errors?.difficulty}
          required
          placeholder="Select difficulty"
        />
      </div>
      {/* Timing & Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Timing & Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Estimated Time (minutes)"
            type="number"
            placeholder="30"
            value={formData?.estimatedTime}
            onChange={(e) => handleInputChange('estimatedTime', e?.target?.value)}
            error={errors?.estimatedTime}
            required
            min="1"
            max="180"
            description="Total time to complete the quiz"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Visibility
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={formData?.isPublic}
                  onChange={() => handleInputChange('isPublic', true)}
                  className="w-4 h-4 text-primary border-border focus:ring-primary"
                />
                <span className="text-sm text-text-primary">Public</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!formData?.isPublic}
                  onChange={() => handleInputChange('isPublic', false)}
                  className="w-4 h-4 text-primary border-border focus:ring-primary"
                />
                <span className="text-sm text-text-primary">Private</span>
              </label>
            </div>
            <p className="text-xs text-text-secondary">
              {formData?.isPublic ? 'Anyone can access this quiz' : 'Only you can access this quiz'}
            </p>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Icon name="Info" size={16} />
          <span>Changes are auto-saved every 2 seconds</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => window.location?.reload()}
          >
            Reset Form
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            iconName="Save"
            iconPosition="left"
            iconSize={16}
          >
            Save Quiz
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizMetadataForm;