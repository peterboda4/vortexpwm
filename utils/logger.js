// utils/logger.js - Simple, maintainable logging system

/**
 * Log levels (in order of severity)
 * DEBUG: Detailed diagnostic information
 * INFO: General informational messages
 * WARN: Warning messages for potentially harmful situations
 * ERROR: Error messages for failures
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4, // Disable all logging
};

class Logger {
  constructor() {
    // Default level: INFO (shows INFO, WARN, ERROR)
    this.level = LogLevel.INFO;

    // Store initialization messages to display when logging is enabled
    this.initMessages = [];
  }

  /**
   * Set the logging level
   * @param {string|number} level - 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE' or numeric value
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.level = LogLevel[level.toUpperCase()] ?? LogLevel.INFO;
    } else {
      this.level = level;
    }
  }

  /**
   * Get current log level name
   * @returns {string} Current log level name
   */
  getLevelName() {
    const entries = Object.entries(LogLevel);
    for (const [name, value] of entries) {
      if (value === this.level) return name;
    }
    return 'UNKNOWN';
  }

  /**
   * Format log message with timestamp and level
   */
  _format(level, prefix, ...args) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return [`[${timestamp}] [${prefix}]`, ...args];
  }

  /**
   * Log debug message (detailed diagnostic info)
   */
  debug(...args) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(...this._format(LogLevel.DEBUG, 'DEBUG', ...args));
    }
  }

  /**
   * Log info message (general information)
   */
  info(...args) {
    if (this.level <= LogLevel.INFO) {
      console.log(...this._format(LogLevel.INFO, 'INFO', ...args));
    }
  }

  /**
   * Log warning message
   */
  warn(...args) {
    if (this.level <= LogLevel.WARN) {
      console.warn(...this._format(LogLevel.WARN, 'WARN', ...args));
    }
  }

  /**
   * Log error message
   */
  error(...args) {
    if (this.level <= LogLevel.ERROR) {
      console.error(...this._format(LogLevel.ERROR, 'ERROR', ...args));
    }
  }

  /**
   * Log initialization message (always shown, stored for later display)
   */
  init(...args) {
    const msg = this._format(LogLevel.INFO, 'INIT', ...args);
    this.initMessages.push(msg);
    if (this.level <= LogLevel.INFO) {
      console.log(...msg);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the class and the singleton
export { Logger, LogLevel, logger };
