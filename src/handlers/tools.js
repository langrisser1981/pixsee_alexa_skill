const util = require('util');
const fs = require('fs');

// 除錯等級
// ALL < DEBUG < INFO < WARN < ERROR < FATAL < OFF
const loggingLevel = 2;
const log_file = fs.createWriteStream(__dirname + '/debug.log', { flags: 'w' });
module.exports.log = (level, msg) => {
    if (level >= loggingLevel) {
        console.log(`[${level}]:`, msg);
        log_file.write(util.format(msg) + '\n');
    }
}