#!/usr/bin/env node

const path = require('path');

const logs = require(path.join(__dirname, '..', 'src', 'logs-command.js'));
logs('dapilogs');