import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RevisionHistory = ({ onRestore, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock revision history data
  const revisions = [
    {
      id: 1,
      version: '1.3',
      timestamp: new Date('2025-01-04T16:30:00'),
      author: 'John Smith',
      changes: ['Updated answer options', 'Added media attachment', 'Modified difficulty level'],
      isCurrent: true
    },
    {
      id: 2,
      version: '1.2',
      timestamp: new Date('2025-01-04T14:15:00'),
      author: 'Sarah Johnson',
      changes: ['Fixed typo in question text', 'Updated explanation'],
      isCurrent: false
    },
    {
      id: 3,
      version: '1.1',
      timestamp: new Date('2025-01-04T10:45:00'),
      author: 'Mike Davis',
      changes: ['Added time limit', 'Updated category assignment'],
      isCurrent: false
    },
    {
      id: 4,
      version: '1.0',
      timestamp: new Date('2025-01-03T18:20:00'),
      author: 'John Smith',
      changes: ['Initial question creation'],
      isCurrent: false
    }
  ];

  const formatTimestamp = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const getChangeIcon = (change) => {
    if (change?.includes('Added') || change?.includes('creation')) return 'Plus';
    if (change?.includes('Updated') || change?.includes('Modified')) return 'Edit3';
    if (change?.includes('Fixed')) return 'CheckCircle';
    if (change?.includes('Removed') || change?.includes('Deleted')) return 'Minus';
    return 'FileText';
  };

  const getChangeColor = (change) => {
    if (change?.includes('Added') || change?.includes('creation')) return 'text-success';
    if (change?.includes('Updated') || change?.includes('Modified')) return 'text-primary';
    if (change?.includes('Fixed')) return 'text-success';
    if (change?.includes('Removed') || change?.includes('Deleted')) return 'text-error';
    return 'text-muted-foreground';
  };

  const handleRestore = (revision) => {
    if (window.confirm(`Are you sure you want to restore to version ${revision?.version}? This will create a new version with the restored content.`)) {
      onRestore(revision);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name="History" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">Revision History</h3>
          <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
            {revisions?.length} versions
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
          iconSize={16}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'View History'}
        </Button>
      </div>
      {isExpanded && (
        <div className="border border-border rounded-lg bg-card">
          <div className="max-h-96 overflow-y-auto">
            {revisions?.map((revision, index) => (
              <div
                key={revision?.id}
                className={`p-4 ${index !== revisions?.length - 1 ? 'border-b border-border' : ''} ${
                  revision?.isCurrent ? 'bg-primary/5' : 'hover:bg-muted/30'
                } transition-smooth`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Version Header */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        revision?.isCurrent 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <span className="text-xs font-medium">v{revision?.version}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-text-primary">
                            Version {revision?.version}
                          </span>
                          {revision?.isCurrent && (
                            <span className="px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>by {revision?.author}</span>
                          <span>•</span>
                          <span>{formatTimestamp(revision?.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Changes List */}
                    <div className="ml-11 space-y-2">
                      {revision?.changes?.map((change, changeIndex) => (
                        <div key={changeIndex} className="flex items-center space-x-2">
                          <Icon 
                            name={getChangeIcon(change)} 
                            size={14} 
                            className={getChangeColor(change)} 
                          />
                          <span className="text-sm text-text-secondary">{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {!revision?.isCurrent && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Eye"
                          iconSize={14}
                          title="Preview this version"
                          className="p-2"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="RotateCcw"
                          iconSize={14}
                          onClick={() => handleRestore(revision)}
                          title="Restore this version"
                          className="p-2 text-primary hover:text-primary"
                        />
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="Download"
                      iconSize={14}
                      title="Export this version"
                      className="p-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* History Actions */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Changes are automatically saved every 30 seconds
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Download"
                  iconPosition="left"
                  iconSize={14}
                >
                  Export All Versions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Trash2"
                  iconPosition="left"
                  iconSize={14}
                  className="text-error hover:text-error"
                >
                  Clear History
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Auto-save Indicator */}
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <span>Auto-saved 2 minutes ago</span>
        <span>•</span>
        <span>Last manual save: {formatTimestamp(revisions?.[0]?.timestamp)}</span>
      </div>
    </div>
  );
};

export default RevisionHistory;