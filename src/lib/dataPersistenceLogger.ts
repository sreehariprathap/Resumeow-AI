// Enhanced logging utility for data persistence monitoring
import { toast } from 'sonner';

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
}

class DataPersistenceLogger {
  private sessionId: string;
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  constructor() {
    this.sessionId = this.generateSessionId();
    this.log(LogLevel.INFO, 'logger', 'Data persistence logger initialized');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      userId,
      sessionId: this.sessionId
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging with appropriate level
    const consoleMethod = this.getConsoleMethod(entry.level);
    const logMessage = `[${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`;
    
    if (entry.data) {
      consoleMethod(logMessage, entry.data);
    } else {
      consoleMethod(logMessage);
    }

    // Store critical errors in localStorage for debugging
    if (entry.level === LogLevel.CRITICAL || entry.level === LogLevel.ERROR) {
      this.persistCriticalLog(entry);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private persistCriticalLog(entry: LogEntry): void {
    try {
      const criticalLogs = this.getCriticalLogs();
      criticalLogs.push(entry);
      
      // Keep only last 20 critical logs
      if (criticalLogs.length > 20) {
        criticalLogs.splice(0, criticalLogs.length - 20);
      }
      
      localStorage.setItem('data_persistence_critical_logs', JSON.stringify(criticalLogs));
    } catch (error) {
      console.error('Failed to persist critical log:', error);
    }
  }
  public log(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    userId?: string
  ): void {
    const entry = this.createLogEntry(level, category, message, data, userId);
    this.addLog(entry);
  }

  // Specific logging methods for common data persistence operations
  public logFirebaseOperation(
    operation: 'save' | 'load' | 'delete',
    success: boolean,
    userId: string,
    dataType: string,
    error?: Error,
    retryCount?: number
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success 
      ? `Firebase ${operation} successful for ${dataType}`
      : `Firebase ${operation} failed for ${dataType}${retryCount !== undefined ? ` (retry ${retryCount})` : ''}`;
    
    this.log(level, 'firebase', message, {
      operation,
      success,
      dataType,
      error: error?.message,
      retryCount
    }, userId);
  }

  public logLocalStorageOperation(
    operation: 'save' | 'load' | 'delete',
    success: boolean,
    userId: string,
    dataType: string,
    error?: Error
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const message = success 
      ? `LocalStorage ${operation} successful for ${dataType}`
      : `LocalStorage ${operation} failed for ${dataType}`;
    
    this.log(level, 'localStorage', message, {
      operation,
      success,
      dataType,
      error: error?.message
    }, userId);
  }
  public logDataIntegrityIssue(
    userId: string,
    issueType: string,
    description: string,
    data?: Record<string, unknown>
  ): void {
    this.log(LogLevel.WARN, 'dataIntegrity', `Data integrity issue: ${issueType} - ${description}`, data, userId);
  }

  public logBackupOperation(
    operation: 'create' | 'restore' | 'cleanup',
    success: boolean,
    userId: string,
    details?: Record<string, unknown>
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Backup ${operation} ${success ? 'successful' : 'failed'}`;
    
    this.log(level, 'backup', message, details, userId);
  }

  public logSyncStatus(
    userId: string,
    isOnline: boolean,
    isFirebaseConnected: boolean,
    pendingChanges: number,
    error?: string
  ): void {
    const level = error ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `Sync status update: Online=${isOnline}, Firebase=${isFirebaseConnected}, Pending=${pendingChanges}`;
    
    this.log(level, 'sync', message, {
      isOnline,
      isFirebaseConnected,
      pendingChanges,
      error
    }, userId);
  }

  public getCriticalLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('data_persistence_critical_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load critical logs:', error);
      return [];
    }
  }

  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  public getLogsByCategory(category: string, count: number = 20): LogEntry[] {
    return this.logs
      .filter(log => log.category === category)
      .slice(-count);
  }

  public exportLogs(): string {
    const logData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      criticalLogs: this.getCriticalLogs()
    };
    
    return JSON.stringify(logData, null, 2);
  }
  public showUserFriendlyError(
    title: string,
    message: string,
    category: string,
    data?: Record<string, unknown>
  ): void {
    this.log(LogLevel.ERROR, category, `User error shown: ${title} - ${message}`, data);
    toast.error(title, {
      description: message,
      duration: 5000
    });
  }

  public showUserFriendlyWarning(
    title: string,
    message: string,
    category: string,
    data?: Record<string, unknown>
  ): void {
    this.log(LogLevel.WARN, category, `User warning shown: ${title} - ${message}`, data);
    toast.warning(title, {
      description: message,
      duration: 4000
    });
  }

  public showUserFriendlyInfo(
    title: string,
    message: string,
    category: string,
    data?: Record<string, unknown>
  ): void {
    this.log(LogLevel.INFO, category, `User info shown: ${title} - ${message}`, data);
    toast.info(title, {
      description: message,
      duration: 3000
    });
  }

  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('data_persistence_critical_logs');
    } catch (error) {
      console.error('Failed to clear critical logs:', error);
    }
    this.log(LogLevel.INFO, 'logger', 'Logs cleared');
  }
}

// Create singleton instance
export const dataPersistenceLogger = new DataPersistenceLogger();

// Export convenience functions
export const logFirebaseOperation = dataPersistenceLogger.logFirebaseOperation.bind(dataPersistenceLogger);
export const logLocalStorageOperation = dataPersistenceLogger.logLocalStorageOperation.bind(dataPersistenceLogger);
export const logDataIntegrityIssue = dataPersistenceLogger.logDataIntegrityIssue.bind(dataPersistenceLogger);
export const logBackupOperation = dataPersistenceLogger.logBackupOperation.bind(dataPersistenceLogger);
export const logSyncStatus = dataPersistenceLogger.logSyncStatus.bind(dataPersistenceLogger);
export const showUserFriendlyError = dataPersistenceLogger.showUserFriendlyError.bind(dataPersistenceLogger);
export const showUserFriendlyWarning = dataPersistenceLogger.showUserFriendlyWarning.bind(dataPersistenceLogger);
export const showUserFriendlyInfo = dataPersistenceLogger.showUserFriendlyInfo.bind(dataPersistenceLogger);
