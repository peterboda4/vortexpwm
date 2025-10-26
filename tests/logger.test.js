// tests/logger.test.js - tests for logger utility

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Logger, LogLevel } from '../utils/logger.js';

describe('Logger', () => {
  let logger;
  let consoleLogs;
  let consoleWarns;
  let consoleErrors;
  let originalLog;
  let originalWarn;
  let originalError;

  // Capture console output
  beforeEach(() => {
    logger = new Logger();
    consoleLogs = [];
    consoleWarns = [];
    consoleErrors = [];

    // Save original console methods
    originalLog = console.log;
    originalWarn = console.warn;
    originalError = console.error;

    // Mock console methods
    console.log = (...args) => {
      consoleLogs.push(args);
    };
    console.warn = (...args) => {
      consoleWarns.push(args);
    };
    console.error = (...args) => {
      consoleErrors.push(args);
    };

    // Hook to restore console after each test
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  });

  describe('setLevel', () => {
    it('should set level by string name', () => {
      logger.setLevel('DEBUG');
      assert.strictEqual(logger.level, LogLevel.DEBUG);

      logger.setLevel('INFO');
      assert.strictEqual(logger.level, LogLevel.INFO);

      logger.setLevel('WARN');
      assert.strictEqual(logger.level, LogLevel.WARN);

      logger.setLevel('ERROR');
      assert.strictEqual(logger.level, LogLevel.ERROR);
    });

    it('should set level by numeric value', () => {
      logger.setLevel(0);
      assert.strictEqual(logger.level, 0);

      logger.setLevel(2);
      assert.strictEqual(logger.level, 2);
    });

    it('should handle case-insensitive string levels', () => {
      logger.setLevel('debug');
      assert.strictEqual(logger.level, LogLevel.DEBUG);

      logger.setLevel('WaRn');
      assert.strictEqual(logger.level, LogLevel.WARN);
    });

    it('should default to INFO for invalid string', () => {
      logger.setLevel('INVALID');
      assert.strictEqual(logger.level, LogLevel.INFO);
    });
  });

  describe('getLevelName', () => {
    it('should return correct level name', () => {
      logger.setLevel(LogLevel.DEBUG);
      assert.strictEqual(logger.getLevelName(), 'DEBUG');

      logger.setLevel(LogLevel.INFO);
      assert.strictEqual(logger.getLevelName(), 'INFO');

      logger.setLevel(LogLevel.WARN);
      assert.strictEqual(logger.getLevelName(), 'WARN');

      logger.setLevel(LogLevel.ERROR);
      assert.strictEqual(logger.getLevelName(), 'ERROR');
    });
  });

  describe('log filtering', () => {
    it('should log all messages when level is DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      assert.strictEqual(consoleLogs.length, 2); // debug and info
      assert.strictEqual(consoleWarns.length, 1);
      assert.strictEqual(consoleErrors.length, 1);
    });

    it('should filter debug messages when level is INFO', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      assert.strictEqual(consoleLogs.length, 1); // only info
      assert.strictEqual(consoleWarns.length, 1);
      assert.strictEqual(consoleErrors.length, 1);
    });

    it('should only log warnings and errors when level is WARN', () => {
      logger.setLevel(LogLevel.WARN);
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      assert.strictEqual(consoleLogs.length, 0);
      assert.strictEqual(consoleWarns.length, 1);
      assert.strictEqual(consoleErrors.length, 1);
    });

    it('should only log errors when level is ERROR', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      assert.strictEqual(consoleLogs.length, 0);
      assert.strictEqual(consoleWarns.length, 0);
      assert.strictEqual(consoleErrors.length, 1);
    });

    it('should not log anything when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      assert.strictEqual(consoleLogs.length, 0);
      assert.strictEqual(consoleWarns.length, 0);
      assert.strictEqual(consoleErrors.length, 0);
    });
  });

  describe('message formatting', () => {
    it('should include timestamp and level prefix', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('test message');

      assert.strictEqual(consoleLogs.length, 1);
      const logArgs = consoleLogs[0];
      assert.ok(logArgs[0].includes('[DEBUG]'));
      assert.strictEqual(logArgs[1], 'test message');
    });

    it('should support multiple arguments', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('message', 'arg1', 'arg2', 123);

      assert.strictEqual(consoleLogs.length, 1);
      const logArgs = consoleLogs[0];
      assert.ok(logArgs[0].includes('[INFO]'));
      assert.strictEqual(logArgs[1], 'message');
      assert.strictEqual(logArgs[2], 'arg1');
      assert.strictEqual(logArgs[3], 'arg2');
      assert.strictEqual(logArgs[4], 123);
    });
  });

  describe('init messages', () => {
    it('should store init messages', () => {
      logger.setLevel(LogLevel.INFO);
      logger.init('initialization message');

      assert.strictEqual(logger.initMessages.length, 1);
      assert.ok(logger.initMessages[0][0].includes('[INIT]'));
      assert.strictEqual(logger.initMessages[0][1], 'initialization message');
    });

    it('should log init messages when level allows', () => {
      logger.setLevel(LogLevel.INFO);
      logger.init('init test');

      assert.strictEqual(consoleLogs.length, 1);
    });

    it('should still store init messages even when level blocks output', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.init('init test');

      // Not logged to console, but stored
      assert.strictEqual(consoleLogs.length, 0);
      assert.strictEqual(logger.initMessages.length, 1);
    });
  });
});
