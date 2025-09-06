import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Input from './Input';
import Button from './Button';

const ContentSearchInterface = ({ scope = 'all', onResultSelect, className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Mock search data
  const mockData = {
    categories: [
      { id: 1, title: 'Science & Technology', type: 'category', path: '/category-management', quizCount: 12 },
      { id: 2, title: 'History & Culture', type: 'category', path: '/category-management', quizCount: 8 },
      { id: 3, title: 'Mathematics', type: 'category', path: '/category-management', quizCount: 15 },
    ],
    quizzes: [
      { id: 1, title: 'JavaScript Fundamentals', type: 'quiz', path: '/quiz-builder', category: 'Programming', questionCount: 25 },
      { id: 2, title: 'World War II Timeline', type: 'quiz', path: '/quiz-builder', category: 'History', questionCount: 30 },
      { id: 3, title: 'Basic Algebra', type: 'quiz', path: '/quiz-builder', category: 'Mathematics', questionCount: 20 },
    ],
    questions: [
      { id: 1, title: 'What is a closure in JavaScript?', type: 'question', path: '/question-editor', quiz: 'JavaScript Fundamentals', difficulty: 'Medium' },
      { id: 2, title: 'When did World War II end?', type: 'question', path: '/question-editor', quiz: 'World War II Timeline', difficulty: 'Easy' },
      { id: 3, title: 'Solve for x: 2x + 5 = 15', type: 'question', path: '/question-editor', quiz: 'Basic Algebra', difficulty: 'Easy' },
    ]
  };

  // Simulate search
  useEffect(() => {
    if (query?.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const searchResults = [];
      const lowerQuery = query?.toLowerCase();

      // Filter based on scope
      const searchScopes = scope === 'all' ? ['categories', 'quizzes', 'questions'] : [scope];

      searchScopes?.forEach(scopeType => {
        if (mockData?.[scopeType]) {
          const filtered = mockData?.[scopeType]?.filter(item =>
            item?.title?.toLowerCase()?.includes(lowerQuery)
          );
          searchResults?.push(...filtered);
        }
      });

      setResults(searchResults?.slice(0, 8)); // Limit results
      setIsSearching(false);
      setIsOpen(true);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, scope]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || results?.length === 0) return;

      switch (e?.key) {
        case 'ArrowDown':
          e?.preventDefault();
          setSelectedIndex(prev => (prev < results?.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e?.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : results?.length - 1));
          break;
        case 'Enter':
          e?.preventDefault();
          if (selectedIndex >= 0) {
            handleResultSelect(results?.[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef?.current && !searchRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultSelect = (result) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      navigate(result?.path);
    }
    setIsOpen(false);
    setQuery('');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'category': return 'FolderTree';
      case 'quiz': return 'FileText';
      case 'question': return 'HelpCircle';
      default: return 'Search';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'category': return 'text-warning';
      case 'quiz': return 'text-primary';
      case 'question': return 'text-secondary';
      default: return 'text-text-secondary';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-success';
      case 'medium': return 'text-warning';
      case 'hard': return 'text-error';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="search"
          placeholder={`Search ${scope === 'all' ? 'content' : scope}...`}
          value={query}
          onChange={(e) => setQuery(e?.target?.value)}
          className="pl-10"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <Icon name="Loader2" size={16} className="text-text-secondary animate-spin" />
          ) : (
            <Icon name="Search" size={16} className="text-text-secondary" />
          )}
        </div>
        
        {query && (
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            iconSize={14}
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
          />
        )}
      </div>
      {/* Search Results */}
      {isOpen && results?.length > 0 && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-elevation-2 z-300 max-h-80 overflow-y-auto"
        >
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 px-2">
              {results?.length} result{results?.length > 1 ? 's' : ''} found
            </div>
            
            {results?.map((result, index) => (
              <div
                key={`${result?.type}-${result?.id}`}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-smooth ${
                  index === selectedIndex 
                    ? 'bg-accent text-accent-foreground' 
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => handleResultSelect(result)}
              >
                <Icon 
                  name={getTypeIcon(result?.type)} 
                  size={16} 
                  className={getTypeColor(result?.type)} 
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-popover-foreground truncate">
                    {result?.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground capitalize">
                      {result?.type}
                    </span>
                    
                    {result?.category && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {result?.category}
                        </span>
                      </>
                    )}
                    
                    {result?.quiz && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {result?.quiz}
                        </span>
                      </>
                    )}
                    
                    {result?.difficulty && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className={`text-xs font-medium ${getDifficultyColor(result?.difficulty)}`}>
                          {result?.difficulty}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {result?.quizCount && (
                    <span className="text-xs text-muted-foreground">
                      {result?.quizCount} quizzes
                    </span>
                  )}
                  {result?.questionCount && (
                    <span className="text-xs text-muted-foreground">
                      {result?.questionCount} questions
                    </span>
                  )}
                </div>
                
                <Icon name="ArrowRight" size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* No Results */}
      {isOpen && query?.length >= 2 && results?.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-elevation-2 z-300">
          <div className="p-6 text-center">
            <Icon name="Search" size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No results found for "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search terms
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentSearchInterface;