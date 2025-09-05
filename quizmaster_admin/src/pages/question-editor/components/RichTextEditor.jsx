import React, { useState, useRef } from 'react';

import Button from '../../../components/ui/Button';

const RichTextEditor = ({ value, onChange, placeholder = "Enter your question...", className = '' }) => {
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const editorRef = useRef(null);

  const formatButtons = [
    { command: 'bold', icon: 'Bold', title: 'Bold (Ctrl+B)' },
    { command: 'italic', icon: 'Italic', title: 'Italic (Ctrl+I)' },
    { command: 'underline', icon: 'Underline', title: 'Underline (Ctrl+U)' },
    { command: 'strikeThrough', icon: 'Strikethrough', title: 'Strikethrough' },
  ];

  const listButtons = [
    { command: 'insertUnorderedList', icon: 'List', title: 'Bullet List' },
    { command: 'insertOrderedList', icon: 'ListOrdered', title: 'Numbered List' },
  ];

  const alignButtons = [
    { command: 'justifyLeft', icon: 'AlignLeft', title: 'Align Left' },
    { command: 'justifyCenter', icon: 'AlignCenter', title: 'Align Center' },
    { command: 'justifyRight', icon: 'AlignRight', title: 'Align Right' },
  ];

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef?.current?.focus();
  };

  const handleInput = () => {
    if (editorRef?.current) {
      onChange(editorRef?.current?.innerHTML);
    }
  };

  const insertMathSymbol = (symbol) => {
    handleFormat('insertText', symbol);
    setIsFormatMenuOpen(false);
  };

  const mathSymbols = ['±', '×', '÷', '√', '∞', '≤', '≥', '≠', '≈', '°', 'π', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'σ', 'Ω'];

  return (
    <div className={`border border-border rounded-lg bg-card ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center space-x-1">
          {/* Text Formatting */}
          <div className="flex items-center space-x-1 pr-2 border-r border-border">
            {formatButtons?.map((btn) => (
              <Button
                key={btn?.command}
                variant="ghost"
                size="sm"
                iconName={btn?.icon}
                iconSize={16}
                onClick={() => handleFormat(btn?.command)}
                title={btn?.title}
                className="p-2"
              />
            ))}
          </div>

          {/* Lists */}
          <div className="flex items-center space-x-1 px-2 border-r border-border">
            {listButtons?.map((btn) => (
              <Button
                key={btn?.command}
                variant="ghost"
                size="sm"
                iconName={btn?.icon}
                iconSize={16}
                onClick={() => handleFormat(btn?.command)}
                title={btn?.title}
                className="p-2"
              />
            ))}
          </div>

          {/* Alignment */}
          <div className="flex items-center space-x-1 px-2 border-r border-border">
            {alignButtons?.map((btn) => (
              <Button
                key={btn?.command}
                variant="ghost"
                size="sm"
                iconName={btn?.icon}
                iconSize={16}
                onClick={() => handleFormat(btn?.command)}
                title={btn?.title}
                className="p-2"
              />
            ))}
          </div>

          {/* Math Symbols */}
          <div className="relative px-2">
            <Button
              variant="ghost"
              size="sm"
              iconName="Calculator"
              iconSize={16}
              onClick={() => setIsFormatMenuOpen(!isFormatMenuOpen)}
              title="Insert Math Symbol"
              className="p-2"
            />
            
            {isFormatMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-elevation-2 z-200 p-3">
                <div className="text-xs font-medium text-popover-foreground mb-2">Math Symbols</div>
                <div className="grid grid-cols-6 gap-1">
                  {mathSymbols?.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => insertMathSymbol(symbol)}
                      className="w-8 h-8 flex items-center justify-center text-sm hover:bg-accent rounded transition-smooth"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            iconName="Undo2"
            iconSize={16}
            onClick={() => handleFormat('undo')}
            title="Undo (Ctrl+Z)"
            className="p-2"
          />
          <Button
            variant="ghost"
            size="sm"
            iconName="Redo2"
            iconSize={16}
            onClick={() => handleFormat('redo')}
            title="Redo (Ctrl+Y)"
            className="p-2"
          />
        </div>
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-32 p-4 focus:outline-none text-text-primary"
        style={{ minHeight: '120px' }}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
      />
      {/* Overlay for math symbols */}
      {isFormatMenuOpen && (
        <div 
          className="fixed inset-0 z-100"
          onClick={() => setIsFormatMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default RichTextEditor;