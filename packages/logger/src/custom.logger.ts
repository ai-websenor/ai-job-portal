import chalk from 'chalk';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
type LogData = Record<string, string | number | boolean | undefined>;

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

const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_VALUE_LENGTH = 60;

// ----------------- helpers -----------------

const truncate = (value: string, max = MAX_VALUE_LENGTH) =>
  value.length > max ? value.slice(0, max) + '…' : value;

const formatStatusCode = (value: number) => {
  if (value >= 500) return chalk.bgRed.white(` ${value} `);
  if (value >= 400) return chalk.bgYellow.black(` ${value} `);
  return chalk.bgGreen.black(` ${value} `);
};

// ----------------- logger -----------------

export class CustomLogger {
  // ===================== PROD SIMPLE LOG =====================

  private simpleLog(level: LogLevel, context: string | undefined, message: string, data?: LogData) {
    const meta = data
      ? Object.entries(data)
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

    const autoIcon =
      level === 'INFO' &&
      typeof data?.statusCode === 'number' &&
      data.statusCode >= 200 &&
      data.statusCode < 300
        ? '🚀 '
        : ICONS[level];

    const rows: LogData = {
      message,
      ...(data || {}),
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

  // ===================== PUBLIC METHODS =====================

  info(message: string, context?: string, data?: LogData) {
    IS_PROD
      ? this.simpleLog('INFO', context, message, data)
      : this.tableLog('INFO', context, message, data);
  }

  success(message: string, context?: string, data?: LogData) {
    IS_PROD
      ? this.simpleLog('SUCCESS', context, message, data)
      : this.tableLog('SUCCESS', context, message, data);
  }

  warn(message: string, context?: string, data?: LogData) {
    IS_PROD
      ? this.simpleLog('WARN', context, message, data)
      : this.tableLog('WARN', context, message, data);
  }

  debug(message: string, context?: string, data?: LogData) {
    if (IS_PROD) return;
    this.tableLog('DEBUG', context, message, data);
  }

  error(message: string, error?: Error, context?: string, data?: LogData) {
    IS_PROD
      ? this.simpleLog('ERROR', context, message, data)
      : this.tableLog('ERROR', context, message, data);

    if (error?.stack && !IS_PROD) {
      console.error(chalk.red(error.stack));
    }
  }
}
