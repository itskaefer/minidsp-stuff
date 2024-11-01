const requireFromString = require('require-from-string');

const _my_module = require('./lib/inputs').unpack(__dirname);
const my_module = requireFromString(_my_module, __dirname + '/inputs_real');
module.exports = my_module;
