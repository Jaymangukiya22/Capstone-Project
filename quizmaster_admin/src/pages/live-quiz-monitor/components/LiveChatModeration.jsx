import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const LiveChatModeration = ({ messages, onSendMessage, onModerateMessage, className = '' }) => {
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (newMessage?.trim()) {
      onSendMessage({
        id: Date.now(),
        sender: 'Admin',
        content: newMessage?.trim(),
        timestamp: new Date(),
        type: 'admin'
      });
      setNewMessage('');
    }
  };

  const filteredMessages = messages?.filter(message => {
    if (filter === 'all') return true;
    if (filter === 'flagged') return message?.flagged;
    if (filter === 'admin') return message?.type === 'admin';
    if (filter === 'player') return message?.type === 'player';
    return true;
  });

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'admin': return 'text-primary';
      case 'system': return 'text-warning';
      case 'player': return 'text-card-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-card border border-border rounded-lg shadow-elevation-1 flex flex-col ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-card-foreground">Live Chat</h3>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e?.target?.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-input text-foreground"
            >
              <option value="all">All Messages</option>
              <option value="player">Player Messages</option>
              <option value="admin">Admin Messages</option>
              <option value="flagged">Flagged</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              iconName="Settings"
              iconSize={14}
              className="p-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-primary/10 rounded p-2 text-center">
            <p className="font-semibold text-primary">{messages?.filter(m => m?.type === 'player')?.length}</p>
            <p className="text-xs text-muted-foreground">Player</p>
          </div>
          <div className="bg-warning/10 rounded p-2 text-center">
            <p className="font-semibold text-warning">{messages?.filter(m => m?.flagged)?.length}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </div>
          <div className="bg-success/10 rounded p-2 text-center">
            <p className="font-semibold text-success">{messages?.filter(m => m?.type === 'admin')?.length}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
      {/* Messages Area */}
      <div className="flex-1 p-4 max-h-80 overflow-y-auto space-y-3">
        {filteredMessages?.map((message) => (
          <div key={message?.id} className={`flex items-start space-x-3 ${message?.flagged ? 'bg-error/5 border border-error/20 rounded p-2' : ''}`}>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              {message?.type === 'admin' ? (
                <Icon name="Shield" size={14} className="text-primary" />
              ) : message?.type === 'system' ? (
                <Icon name="Bot" size={14} className="text-warning" />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {message?.sender?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-sm font-medium ${getMessageTypeColor(message?.type)}`}>
                  {message?.sender}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message?.timestamp)}
                </span>
                {message?.flagged && (
                  <Icon name="Flag" size={12} className="text-error" />
                )}
              </div>
              <p className="text-sm text-card-foreground break-words">{message?.content}</p>
            </div>

            {message?.type === 'player' && (
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Flag"
                  iconSize={12}
                  onClick={() => onModerateMessage(message?.id, 'flag')}
                  className="p-1 text-warning hover:text-warning"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Trash2"
                  iconSize={12}
                  onClick={() => onModerateMessage(message?.id, 'delete')}
                  className="p-1 text-error hover:text-error"
                />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Send a message to all players..."
            value={newMessage}
            onChange={(e) => setNewMessage(e?.target?.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="default"
            size="sm"
            iconName="Send"
            iconSize={16}
            disabled={!newMessage?.trim()}
          />
        </form>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              iconName="Smile"
              iconSize={14}
              className="p-1"
            />
            <Button
              variant="ghost"
              size="sm"
              iconName="Paperclip"
              iconSize={14}
              className="p-1"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {newMessage?.length}/200
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveChatModeration;