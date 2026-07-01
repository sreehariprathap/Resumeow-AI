declare global {
  interface Window {
    resumeow?: {
      debug?: boolean;
    };
  }
}

const isDev = import.meta.env.DEV;

type LogData = any;

function fmt(level: string, message: string, data?: LogData): void {
  const isDebugEnabled = isDev || window.resumeow?.debug === true;
  if (!isDebugEnabled) return;
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `[${ts}] [${level}]`;
  if (data !== undefined) {
    console[level === 'debug' ? 'debug' : level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
      `${prefix} ${message}`,
      data,
    );
  } else {
    console[level === 'debug' ? 'debug' : level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
      `${prefix} ${message}`,
    );
  }
}

export const log = {
  info: (message: string, data?: LogData) => fmt('info', message, data),
  warn: (message: string, data?: LogData) => fmt('warn', message, data),
  debug: (message: string, data?: LogData) => fmt('debug', message, data),
  error: (message: string, data?: LogData) => fmt('error', message, data),
};
