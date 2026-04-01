import { LoggerService } from '@nestjs/common';
import * as chalk from 'chalk';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
type LogData = Record<string, string | number | boolean | undefined>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 1,
  WARN: 2,
  ERROR: 3,
};

const COLORS: Record<LogLevel, chalk.Chalk> = {
  INFO: chalk.cyan,
  SUCCESS: chalk.green,
  WARN: chalk.yellow,
  ERROR: chalk.red,
  DEBUG: chalk.blue,
};

const ICONS: Record<LogLevel, string> = {
  INFO: 'ℹ️ ',
  SUCCESS: '🚀 ',
  WARN: '⚠️ ',
  ERROR: '❌ ',
  DEBUG: '🔵 ',
};

/**
 * LOG_LEVEL env controls verbosity: debug | info | warn | error | silent
 * Defaults: production=warn, dev/staging=debug
 */
function resolveMinLevel(): number {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel === 'silent') return 99;
  if (envLevel === 'error') return 3;
  if (envLevel === 'warn') return 2;
  if (envLevel === 'info') return 1;
  if (envLevel === 'debug') return 0;
  // Default: production=warn, everything else=debug
  return process.env.NODE_ENV === 'production' ? 2 : 0;
}

const MIN_LEVEL = resolveMinLevel();
const USE_JSON = process.env.LOG_FORMAT === 'json';
const MAX_VALUE_LENGTH = 60;

// Sensitive keys to mask in logs
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'apikey', 'api_key', 'otp'];

// ----------------- helpers -----------------

const truncate = (value: string, max = MAX_VALUE_LENGTH) =>
  value.length > max ? value.slice(0, max) + '…' : value;

const formatStatusCode = (value: number) => {
  if (value >= 500) return chalk.bgRed.white(` ${value} `);
  if (value >= 400) return chalk.bgYellow.black(` ${value} `);
  return chalk.bgGreen.black(` ${value} `);
};

const maskSensitive = (data?: LogData): LogData | undefined => {
  if (!data) return data;
  const masked: LogData = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
      masked[key] = '***';
    } else {
      masked[key] = value;
    }
  }
  return masked;
};

// ----------------- logger -----------------

export class CustomLogger implements LoggerService {
  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= MIN_LEVEL;
  }

  // ===================== JSON LOG (staging/prod with LOG_FORMAT=json) =====================

  private jsonLog(level: LogLevel, context: string | undefined, message: string, data?: LogData) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toLowerCase(),
      context: context || 'App',
      message,
      ...maskSensitive(data),
    };
    // Use stderr for errors, stdout for everything else
    if (level === 'ERROR') {
      process.stderr.write(JSON.stringify(entry) + '\n');
    } else {
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
  }

  // ===================== SIMPLE LOG (prod fallback) =====================

  private simpleLog(level: LogLevel, context: string | undefined, message: string, data?: LogData) {
    const safe = maskSensitive(data);
    const meta = safe
      ? Object.entries(safe)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
      : '';

    console.log(
      `[${new Date().toISOString()}]`,
      `[${level}]`,
      context ? `[${context}]` : '',
      message,
      meta,
    );
  }

  // ===================== DEV TABLE LOG =====================

  private tableLog(level: LogLevel, context: string | undefined, message: string, data?: LogData) {
    const color = COLORS[level];
    const safe = maskSensitive(data);

    const autoIcon =
      level === 'INFO' &&
      typeof safe?.statusCode === 'number' &&
      safe.statusCode >= 200 &&
      safe.statusCode < 300
        ? '🚀 '
        : ICONS[level];

    const rows: LogData = {
      message,
      ...(safe || {}),
    };

    const entries = Object.entries(rows).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;

    const maxKeyLength = Math.max(...entries.map(([k]) => k.length));
    const width = maxKeyLength + MAX_VALUE_LENGTH + 6;

    console.log(color('┌' + '─'.repeat(width) + '┐'));
    console.log(color(`│ ${autoIcon}${level} | ${context ?? 'App'} `.padEnd(width + 1) + '│'));
    console.log(color('├' + '─'.repeat(width) + '┤'));

    for (const [key, value] of entries) {
      let formattedValue: string;

      if (key === 'statusCode' && typeof value === 'number') {
        formattedValue = formatStatusCode(value);
      } else {
        formattedValue = truncate(String(value));
      }

      const line = `│ ${key.padEnd(maxKeyLength)} : ${formattedValue}`;
      console.log(color(line.padEnd(width + 1) + '│'));
    }

    console.log(color('└' + '─'.repeat(width) + '┘'));
  }

  // ===================== OUTPUT ROUTER =====================

  private emit(level: LogLevel, context: string | undefined, message: string, data?: LogData) {
    if (!this.shouldLog(level)) return;
    if (USE_JSON) {
      this.jsonLog(level, context, message, data);
    } else if (process.env.NODE_ENV === 'production') {
      this.simpleLog(level, context, message, data);
    } else {
      this.tableLog(level, context, message, data);
    }
  }

  // ===================== PUBLIC METHODS =====================

  log(message: any, ...optionalParams: any[]) {
    this.info(message, optionalParams[0]);
  }

  info(message: string, context?: string, data?: LogData) {
    this.emit('INFO', context, message, data);
  }

  success(message: string, context?: string, data?: LogData) {
    this.emit('SUCCESS', context, message, data);
  }

  warn(message: string, ...optionalParams: any[]) {
    const context = optionalParams[0];
    const data = optionalParams[1];
    this.emit('WARN', context, message, data);
  }

  debug(message: string, ...optionalParams: any[]) {
    const context = optionalParams[0];
    const data = optionalParams[1];
    this.emit('DEBUG', context, message, data);
  }

  error(message: string, ...optionalParams: any[]) {
    const context = optionalParams[0];
    const error = optionalParams[1] instanceof Error ? optionalParams[1] : undefined;
    const data =
      typeof optionalParams[1] === 'object' && !(optionalParams[1] instanceof Error)
        ? optionalParams[1]
        : undefined;

    this.emit('ERROR', context, message, data);

    if (error?.stack && process.env.NODE_ENV !== 'production') {
      console.error(chalk.red(error.stack));
    }
  }
}
