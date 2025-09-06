import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const AnswerConfiguration = ({ questionType, answers, onAnswersChange, className = '' }) => {
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    if (!newOption?.trim()) return;
    
    const newAnswer = {
      id: Date.now(),
      text: newOption?.trim(),
      isCorrect: false,
      explanation: ''
    };
    
    onAnswersChange([...answers, newAnswer]);
    setNewOption('');
  };

  const updateOption = (id, field, value) => {
    const updated = answers?.map(answer =>
      answer?.id === id ? { ...answer, [field]: value } : answer
    );
    onAnswersChange(updated);
  };

  const removeOption = (id) => {
    onAnswersChange(answers?.filter(answer => answer?.id !== id));
  };

  const toggleCorrect = (id) => {
    if (questionType === 'multiple-choice') {
      // Allow multiple correct answers
      updateOption(id, 'isCorrect', !answers?.find(a => a?.id === id)?.isCorrect);
    } else {
      // Single correct answer for true/false
      const updated = answers?.map(answer => ({
        ...answer,
        isCorrect: answer?.id === id
      }));
      onAnswersChange(updated);
    }
  };

  const renderMultipleChoice = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-text-primary">Answer Options</h4>
        <span className="text-xs text-muted-foreground">
          {answers?.filter(a => a?.isCorrect)?.length} correct answer{answers?.filter(a => a?.isCorrect)?.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {answers?.map((answer, index) => (
          <div key={answer?.id} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-start space-x-3">
              <div className="flex items-center space-x-2 mt-2">
                <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <Checkbox
                  checked={answer?.isCorrect}
                  onChange={() => toggleCorrect(answer?.id)}
                  className="text-success"
                />
              </div>
              
              <div className="flex-1 space-y-3">
                <Input
                  type="text"
                  placeholder="Enter answer option..."
                  value={answer?.text}
                  onChange={(e) => updateOption(answer?.id, 'text', e?.target?.value)}
                  className="border-0 bg-transparent p-0 text-base font-medium"
                />
                
                <Input
                  type="text"
                  placeholder="Optional explanation for this answer..."
                  value={answer?.explanation}
                  onChange={(e) => updateOption(answer?.id, 'explanation', e?.target?.value)}
                  className="text-sm"
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                iconName="X"
                iconSize={16}
                onClick={() => removeOption(answer?.id)}
                className="p-2 text-error hover:text-error mt-1"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Add new answer option..."
          value={newOption}
          onChange={(e) => setNewOption(e?.target?.value)}
          onKeyPress={(e) => e?.key === 'Enter' && addOption()}
          className="flex-1"
        />
        <Button
          variant="outline"
          iconName="Plus"
          iconSize={16}
          onClick={addOption}
          disabled={!newOption?.trim()}
        >
          Add Option
        </Button>
      </div>
    </div>
  );

  const renderTrueFalse = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-text-primary">Select Correct Answer</h4>
      
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'true', text: 'True', value: true },
          { id: 'false', text: 'False', value: false }
        ]?.map((option) => (
          <div
            key={option?.id}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-smooth ${
              answers?.find(a => a?.isCorrect && a?.value === option?.value)
                ? 'border-success bg-success/10 text-success' :'border-border hover:border-primary/30'
            }`}
            onClick={() => {
              const updated = [
                { id: 'true', text: 'True', value: true, isCorrect: option?.value === true },
                { id: 'false', text: 'False', value: false, isCorrect: option?.value === false }
              ];
              onAnswersChange(updated);
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <Icon 
                name={option?.value ? 'Check' : 'X'} 
                size={20} 
                className={option?.value ? 'text-success' : 'text-error'} 
              />
              <span className="font-medium">{option?.text}</span>
            </div>
          </div>
        ))}
      </div>

      <Input
        type="text"
        label="Explanation (Optional)"
        placeholder="Explain why this is the correct answer..."
        value={answers?.find(a => a?.isCorrect)?.explanation || ''}
        onChange={(e) => {
          const updated = answers?.map(answer => 
            answer?.isCorrect ? { ...answer, explanation: e?.target?.value } : answer
          );
          onAnswersChange(updated);
        }}
      />
    </div>
  );

  const renderFillBlank = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-text-primary">Acceptable Answers</h4>
      <p className="text-sm text-muted-foreground">
        Add all possible correct answers. Answers are case-insensitive by default.
      </p>

      <div className="space-y-3">
        {answers?.map((answer, index) => (
          <div key={answer?.id} className="flex items-center space-x-3">
            <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
              {index + 1}
            </span>
            <Input
              type="text"
              placeholder="Enter acceptable answer..."
              value={answer?.text}
              onChange={(e) => updateOption(answer?.id, 'text', e?.target?.value)}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              iconSize={16}
              onClick={() => removeOption(answer?.id)}
              className="p-2 text-error hover:text-error"
            />
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Add another acceptable answer..."
          value={newOption}
          onChange={(e) => setNewOption(e?.target?.value)}
          onKeyPress={(e) => e?.key === 'Enter' && addOption()}
          className="flex-1"
        />
        <Button
          variant="outline"
          iconName="Plus"
          iconSize={16}
          onClick={addOption}
          disabled={!newOption?.trim()}
        >
          Add Answer
        </Button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Settings" size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-text-primary">Validation Settings</span>
        </div>
        <div className="space-y-2">
          <Checkbox
            label="Case sensitive matching"
           
            onChange={() => {}}
          />
          <Checkbox
            label="Exact word matching (no partial answers)"
            checked
            onChange={() => {}}
          />
          <Checkbox
            label="Allow multiple words"
            checked
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );

  const renderEssay = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-text-primary">Essay Configuration</h4>
      
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <Input
          type="number"
          label="Minimum Word Count"
          placeholder="50"
          min="0"
        />
        
        <Input
          type="number"
          label="Maximum Word Count"
          placeholder="500"
          min="0"
        />
        
        <Input
          type="text"
          label="Grading Rubric (Optional)"
          placeholder="Describe the criteria for grading this essay..."
          description="This will help manual graders evaluate responses consistently"
        />
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="AlertTriangle" size={16} className="text-warning" />
          <span className="text-sm font-medium text-warning">Manual Grading Required</span>
        </div>
        <p className="text-sm text-warning/80">
          Essay questions require manual review and grading. They cannot be automatically scored.
        </p>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2">
        <Icon name="CheckCircle" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">Answer Configuration</h3>
      </div>
      {questionType === 'multiple-choice' && renderMultipleChoice()}
      {questionType === 'true-false' && renderTrueFalse()}
      {questionType === 'fill-blank' && renderFillBlank()}
      {questionType === 'essay' && renderEssay()}
      {answers?.length === 0 && questionType !== 'essay' && (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="Plus" size={24} className="mx-auto mb-2" />
          <p>No answers configured yet</p>
          <p className="text-sm">Add answer options to continue</p>
        </div>
      )}
    </div>
  );
};

export default AnswerConfiguration;