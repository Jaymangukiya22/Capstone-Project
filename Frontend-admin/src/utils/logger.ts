/**
 * Frontend logging utility for QuizUP
 * Provides structured logging with different levels and optional remote logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  userId?: number;
  sessionId?: string;
  component?: string;
  action?: string;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private enableRemoteLogging: boolean = false;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 100;
  private sessionId: string;

  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId();
    
    // Set log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.logLevel = LogLevel.DEBUG;
    } else if (process.env.NODE_ENV === 'production') {
      this.logLevel = LogLevel.WARN;
    }

    // Enable remote logging in production
    this.enableRemoteLogging = process.env.NODE_ENV === 'production';
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private getCurrentUser(): { userId?: number; username?: string } {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return { userId: user.id, username: user.username };
      }
    } catch (error) {
      // Ignore errors when getting user data
    }
    return {};
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const user = this.getCurrentUser();
    
    let formatted = `[${timestamp}] [${levelName}]`;
    
    if (user.username) {
      formatted += ` [${user.username}]`;
    }
    
    formatted += ` ${message}`;
    
    if (data) {
      formatted += ` ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  private createLogEntry(
    level: LogLevel, 
    message: string, 
    data?: any, 
    options?: { component?: string; action?: string }
  ): LogEntry {
    const user = this.getCurrentUser();
    
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      userId: user.userId,
      sessionId: this.sessionId,
      component: options?.component,
      action: options?.action
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.enableRemoteLogging) return;

    try {
      // Only send ERROR level logs to remote in production
      if (entry.level >= LogLevel.ERROR) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      // Silently fail remote logging to avoid recursive errors
      console.error('Failed to send log to remote:', error);
    }
  }

  private log(
    level: LogLevel, 
    message: string, 
    data?: any, 
    options?: { component?: string; action?: string }
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, data, options);
    this.addToBuffer(entry);

    // Console output with appropriate method
    const formatted = this.formatMessage(level, message, data);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }

    // Send to remote if applicable
    this.sendToRemote(entry);
  }

  debug(message: string, data?: any, options?: { component?: string; action?: string }): void {
    this.log(LogLevel.DEBUG, message, data, options);
  }

  info(message: string, data?: any, options?: { component?: string; action?: string }): void {
    this.log(LogLevel.INFO, message, data, options);
  }

  warn(message: string, data?: any, options?: { component?: string; action?: string }): void {
    this.log(LogLevel.WARN, message, data, options);
  }

  error(message: string, data?: any, options?: { component?: string; action?: string }): void {
    this.log(LogLevel.ERROR, message, data, options);
  }

  // Convenience methods for common scenarios
  apiCall(method: string, url: string, data?: any): void {
    this.debug(`API ${method} ${url}`, data, { component: 'API', action: method });
  }

  socketEvent(event: string, data?: any): void {
    this.debug(`Socket event: ${event}`, data, { component: 'WebSocket', action: event });
  }

  userAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, data, { component: 'UI', action });
  }

  matchEvent(event: string, matchId?: string, data?: any): void {
    this.info(`Match event: ${event}`, { matchId, ...data }, { component: 'Match', action: event });
  }

  quizEvent(event: string, quizId?: number, data?: any): void {
    this.info(`Quiz event: ${event}`, { quizId, ...data }, { component: 'Quiz', action: event });
  }

  // Get recent logs (useful for debugging)
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  // Clear log buffer
  clearLogs(): void {
    this.logBuffer = [];
  }

  // Update log level
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${LogLevel[level]}`);
  }

  // Enable/disable remote logging
  setRemoteLogging(enabled: boolean): void {
    this.enableRemoteLogging = enabled;
    this.info(`Remote logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, data?: any, options?: { component?: string; action?: string }) => 
  logger.debug(message, data, options);

export const logInfo = (message: string, data?: any, options?: { component?: string; action?: string }) => 
  logger.info(message, data, options);

export const logWarn = (message: string, data?: any, options?: { component?: string; action?: string }) => 
  logger.warn(message, data, options);

export const logError = (message: string, data?: any, options?: { component?: string; action?: string }) => 
  logger.error(message, data, options);

// Export specialized logging functions
export const logApiCall = (method: string, url: string, data?: any) => 
  logger.apiCall(method, url, data);

export const logSocketEvent = (event: string, data?: any) => 
  logger.socketEvent(event, data);

export const logUserAction = (action: string, data?: any) => 
  logger.userAction(action, data);

export const logMatchEvent = (event: string, matchId?: string, data?: any) => 
  logger.matchEvent(event, matchId, data);

export const logQuizEvent = (event: string, quizId?: number, data?: any) => 
  logger.quizEvent(event, quizId, data);

// Export logger instance and types
export { logger, LogLevel };
export default logger;
