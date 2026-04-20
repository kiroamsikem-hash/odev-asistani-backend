// Detaylı logging utility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function getTimestamp() {
  return new Date().toISOString();
}

function formatLog(level, message, data = null) {
  const timestamp = getTimestamp();
  let colorCode = colors.reset;
  
  switch(level) {
    case 'ERROR':
      colorCode = colors.red;
      break;
    case 'WARN':
      colorCode = colors.yellow;
      break;
    case 'INFO':
      colorCode = colors.blue;
      break;
    case 'SUCCESS':
      colorCode = colors.green;
      break;
    case 'DEBUG':
      colorCode = colors.cyan;
      break;
  }
  
  let logMessage = `${colorCode}[${timestamp}] [${level}]${colors.reset} ${message}`;
  
  if (data) {
    logMessage += `\n${colors.magenta}Data:${colors.reset} ${JSON.stringify(data, null, 2)}`;
  }
  
  return logMessage;
}

const logger = {
  error: (message, error = null) => {
    console.error(formatLog('ERROR', message));
    if (error) {
      console.error(`${colors.red}Error Details:${colors.reset}`);
      console.error(error);
      if (error.stack) {
        console.error(`${colors.red}Stack Trace:${colors.reset}`);
        console.error(error.stack);
      }
      if (error.response) {
        console.error(`${colors.red}Response Data:${colors.reset}`);
        console.error(JSON.stringify(error.response.data, null, 2));
      }
    }
  },
  
  warn: (message, data = null) => {
    console.warn(formatLog('WARN', message, data));
  },
  
  info: (message, data = null) => {
    console.log(formatLog('INFO', message, data));
  },
  
  success: (message, data = null) => {
    console.log(formatLog('SUCCESS', message, data));
  },
  
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('DEBUG', message, data));
    }
  },
  
  request: (req) => {
    console.log(formatLog('INFO', `${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query
    }));
  },
  
  response: (req, res, statusCode, data = null) => {
    const level = statusCode >= 400 ? 'ERROR' : 'SUCCESS';
    console.log(formatLog(level, `${req.method} ${req.originalUrl} - ${statusCode}`, data));
  }
};

module.exports = logger;
