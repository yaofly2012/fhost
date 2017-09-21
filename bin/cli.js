#!/usr/bin/env node
'use strict';

const program  = require('commander');

// Version
program.version(require('../package.json').version || '0.0.1');

// run command
program
	.command('run')
	.description('启动服务')
	.option('-p, --port [port]', '指定端口号，默认8080', 8080)
	.action(function(){
		require('../command/run.js').run({
			port: this.port
		});
	});

program.parse(process.argv);

process.on('uncaughtException', function(e){
	console.log(e);
});