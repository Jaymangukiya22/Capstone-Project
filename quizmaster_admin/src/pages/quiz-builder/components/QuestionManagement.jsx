import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const QuestionManagement = ({ questions = [], onQuestionsUpdate, className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const fileInputRef = useRef(null);

  // Mock questions data
  const mockQuestions = [
    {
      id: 1,
      text: "What is the capital of France?",
      type: "multiple_choice",
      difficulty: "easy",
      points: 10,
      timeLimit: 30,
      answers: [
        { text: "Paris", isCorrect: true },
        { text: "London", isCorrect: false },
        { text: "Berlin", isCorrect: false },
        { text: "Madrid", isCorrect: false }
      ],
      category: "Geography",
      tags: ["europe", "capitals"],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02')
    },
    {
      id: 2,
      text: "Which programming language is known for its use in web development?",
      type: "multiple_choice",
      difficulty: "intermediate",
      points: 15,
      timeLimit: 45,
      answers: [
        { text: "JavaScript", isCorrect: true },
        { text: "Python", isCorrect: false },
        { text: "C++", isCorrect: false },
        { text: "Java", isCorrect: false }
      ],
      category: "Technology",
      tags: ["programming", "web"],
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-04')
    },
    {
      id: 3,
      text: "The Earth revolves around the Sun.",
      type: "true_false",
      difficulty: "easy",
      points: 5,
      timeLimit: 20,
      answers: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false }
      ],
      category: "Science",
      tags: ["astronomy", "basic"],
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-06')
    },
    {
      id: 4,
      text: "Complete the equation: E = mc²\nWhat does 'c' represent?",
      type: "fill_blank",
      difficulty: "advanced",
      points: 20,
      timeLimit: 60,
      answers: [
        { text: "speed of light", isCorrect: true },
        { text: "light speed", isCorrect: true },
        { text: "velocity of light", isCorrect: true }
      ],
      category: "Physics",
      tags: ["einstein", "relativity"],
      createdAt: new Date('2025-01-07'),
      updatedAt: new Date('2025-01-08')
    }
  ];

  const allQuestions = questions?.length > 0 ? questions : mockQuestions;

  const questionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
    { value: 'essay', label: 'Essay' }
  ];

  const filteredQuestions = allQuestions?.filter(question => {
    const matchesSearch = question?.text?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                         question?.category?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                         question?.tags?.some(tag => tag?.toLowerCase()?.includes(searchQuery?.toLowerCase()));
    
    const matchesType = filterType === 'all' || question?.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleDragEnd = (result) => {
    if (!result?.destination) return;

    const items = Array.from(filteredQuestions);
    const [reorderedItem] = items?.splice(result?.source?.index, 1);
    items?.splice(result?.destination?.index, 0, reorderedItem);

    onQuestionsUpdate(items);
  };

  const handleQuestionSelect = (questionId) => {
    setSelectedQuestions(prev => {
      const newSelection = prev?.includes(questionId)
        ? prev?.filter(id => id !== questionId)
        : [...prev, questionId];
      
      setShowBulkActions(newSelection?.length > 0);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestions?.length === filteredQuestions?.length) {
      setSelectedQuestions([]);
      setShowBulkActions(false);
    } else {
      setSelectedQuestions(filteredQuestions?.map(q => q?.id));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = () => {
    const remainingQuestions = allQuestions?.filter(q => !selectedQuestions?.includes(q?.id));
    onQuestionsUpdate(remainingQuestions);
    setSelectedQuestions([]);
    setShowBulkActions(false);
  };

  const handleBulkEdit = () => {
    // Navigate to bulk edit mode
    console.log('Bulk edit questions:', selectedQuestions);
  };

  const handleImportCSV = () => {
    fileInputRef?.current?.click();
  };

  const handleFileUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      console.log('Importing file:', file?.name);
      // Simulate CSV import
      alert(`Importing questions from ${file?.name}...`);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'multiple_choice': return 'List';
      case 'true_false': return 'ToggleLeft';
      case 'fill_blank': return 'Edit3';
      case 'essay': return 'FileText';
      default: return 'HelpCircle';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-success';
      case 'intermediate': return 'text-warning';
      case 'advanced': return 'text-error';
      case 'expert': return 'text-destructive';
      default: return 'text-text-secondary';
    }
  };

  const formatQuestionText = (text) => {
    return text?.length > 100 ? text?.substring(0, 100) + '...' : text;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Questions ({filteredQuestions?.length})
          </h3>
          {showBulkActions && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-text-secondary">
                {selectedQuestions?.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                iconName="Edit3"
                iconPosition="left"
                iconSize={14}
                onClick={handleBulkEdit}
              >
                Bulk Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                iconName="Trash2"
                iconPosition="left"
                iconSize={14}
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            iconName="Upload"
            iconPosition="left"
            iconSize={16}
            onClick={handleImportCSV}
          >
            Import CSV
          </Button>
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            iconSize={16}
            onClick={() => window.open('/question-editor', '_blank')}
          >
            Add Question
          </Button>
        </div>
      </div>
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search questions by text, category, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
            className="w-full"
          />
        </div>
        
        <Select
          options={questionTypes}
          value={filterType}
          onChange={setFilterType}
          placeholder="Filter by type"
          className="md:w-48"
        />

        <Button
          variant="outline"
          iconName={selectedQuestions?.length === filteredQuestions?.length ? "Square" : "CheckSquare"}
          iconPosition="left"
          iconSize={16}
          onClick={handleSelectAll}
        >
          {selectedQuestions?.length === filteredQuestions?.length ? 'Deselect All' : 'Select All'}
        </Button>
      </div>
      {/* Questions List */}
      {filteredQuestions?.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="FileQuestion" size={48} className="text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Questions Found</h3>
          <p className="text-text-secondary mb-6">
            {searchQuery || filterType !== 'all' ?'Try adjusting your search or filter criteria' :'Start building your quiz by adding questions'
            }
          </p>
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            iconSize={16}
            onClick={() => window.open('/question-editor', '_blank')}
          >
            Add First Question
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div
                {...provided?.droppableProps}
                ref={provided?.innerRef}
                className="space-y-3"
              >
                {filteredQuestions?.map((question, index) => (
                  <Draggable
                    key={question?.id}
                    draggableId={question?.id?.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided?.innerRef}
                        {...provided?.draggableProps}
                        className={`bg-card border border-border rounded-lg p-4 transition-smooth hover:shadow-elevation-2 ${
                          snapshot?.isDragging ? 'shadow-elevation-3' : ''
                        } ${selectedQuestions?.includes(question?.id) ? 'ring-2 ring-primary' : ''}`}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Drag Handle */}
                          <div
                            {...provided?.dragHandleProps}
                            className="mt-1 cursor-grab active:cursor-grabbing"
                          >
                            <Icon name="GripVertical" size={16} className="text-text-secondary" />
                          </div>

                          {/* Checkbox */}
                          <div className="mt-1">
                            <input
                              type="checkbox"
                              checked={selectedQuestions?.includes(question?.id)}
                              onChange={() => handleQuestionSelect(question?.id)}
                              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                            />
                          </div>

                          {/* Question Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Icon 
                                  name={getTypeIcon(question?.type)} 
                                  size={16} 
                                  className="text-primary" 
                                />
                                <span className="text-sm font-medium text-text-primary capitalize">
                                  {question?.type?.replace('_', ' ')}
                                </span>
                                <span className={`text-sm font-medium ${getDifficultyColor(question?.difficulty)}`}>
                                  {question?.difficulty}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-text-secondary">
                                  {question?.points} pts
                                </span>
                                <span className="text-sm text-text-secondary">
                                  {question?.timeLimit}s
                                </span>
                              </div>
                            </div>

                            <p className="text-text-primary mb-3 whitespace-pre-wrap">
                              {formatQuestionText(question?.text)}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-text-secondary">
                                  {question?.category}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {question?.tags?.slice(0, 3)?.map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {question?.tags?.length > 3 && (
                                    <span className="text-xs text-text-secondary">
                                      +{question?.tags?.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconName="Eye"
                                  iconSize={14}
                                  onClick={() => console.log('Preview question:', question?.id)}
                                >
                                  Preview
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconName="Edit3"
                                  iconSize={14}
                                  onClick={() => window.open(`/question-editor?id=${question?.id}`, '_blank')}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconName="Trash2"
                                  iconSize={14}
                                  onClick={() => {
                                    const remaining = allQuestions?.filter(q => q?.id !== question?.id);
                                    onQuestionsUpdate(remaining);
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided?.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default QuestionManagement;