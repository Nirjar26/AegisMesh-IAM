const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
let currentLevel = 'debug';

function shouldLog(level) {
    return logLevels[level] <= logLevels[currentLevel];
}

export const logger = {
    error: (...args) => shouldLog('error') && console.error(...args),
    warn: (...args) => shouldLog('warn') && console.warn(...args),
    info: (...args) => shouldLog('info') && console.info(...args),
    debug: (...args) => shouldLog('debug') && console.debug(...args),
    setLevel: (level) => { currentLevel = level; },
};
