var http = require('http')
var fs = require('fs')
var parseUrl = require('parseurl')
var path = require('path')
var url = require('url')
var openUrl = require('openurl')
var util = require('../util/util')

exports.run = function(option) {
	// Launch server
	http.createServer(function onRequest (req, res) {
		var pathname = path.join(process.cwd(), decodeURI(parseUrl(req).pathname));
		fs.lstat(pathname, function(error, stats) {
			if(error) {
				handle404(res);
				return;
			}
			if(stats.isFile()) {
				handleFile(res, pathname);
			} else if(stats.isDirectory()) {
				handleDirectory(res, pathname, req.url, req);
			} else {
	            res.end();
			}
		})
	}).listen(option.port, function () {
	  	console.log(`App is listening on port ${option.port}!`);
	  	openUrl.open(`http://localhost:${option.port}`);
	}).on('error', function(e) {
		switch(e.code) {
			case 'EADDRINUSE':
				console.log(`Error: port ${option.port} used!`);
				break;
			default:
				console.log(`Unknow Error ${e.code} Occured!`);
		}
	});
}

var handle404 = function(response) {
	response.writeHead(404, { 'Content-Type': 'text/plain' });
	response.end('Not Found', 'utf-8');
}

// 处理静态文件请求
var handleFile = (function() {
	function ext2mimeType(extName) {
		var type = 'text';
		switch (extName) { 
	    	case 'html':
	        case 'css':
	            type = 'text';
	            break;
	        case 'png':    
	        case 'jpg':
	        case 'jpeg':
	        case 'gif':
	         	type = 'image';
	            break;
	        case 'json':
	        case 'js':
	        	type = 'application';
	            break;
            case 'mp3':
            	type = 'audio';
	            break;
	    }
	    return type;
	}

	function ext2mimeSubType(extName) {
		var subType = extName;
		switch(extName) {
			case 'js':
				subType =  'javascript'; // TODO x-javascript ?
				break;
			case 'mp3':
				subType = 'mpeg';
			case 'jpg':
				subType = 'jpeg';
				break;

		}
		return subType;
	}

	function getContype(filePath) {
		var extname = path.extname(filePath).toLowerCase().substr(1),
			type = ext2mimeType(extname),
			subType = ext2mimeSubType(extname),
			contentType = [type, subType].join('/');
	    return contentType;
	}
	return function (response, path) {
		fs.readFile(path, function(error, content) {
	        if (error) {
	            if(error.code == 'ENOENT'){
	                handle404(response);
	            }
	            else {
	                response.writeHead(500);
	                response.end('Read file error: ' + error.code + ' ..\n');
	                response.end(); 
	            }
	        }
	        else {
	            response.writeHead(200, { 'Content-Type': getContype(path) });
	            response.end(content, 'utf-8');
	        }
	    });
	}
})();

// 处理目录请求
var handleDirectory = (function() {
	var whiteExt = '*', // 哪些后缀的文件可用展示
		blackDirectory = ['node_modules', '.git']; // 不可展示的目录名称

	function genLi(href, text) {
		return ['<li><a href="', href, '">', text, '</a></li>'].join('');
	}
	function createDirectoryHtml(parentPath, list, parentUrl, isMobile) {
		var liStr = [];
		if(parentUrl.substr(-1) !== '/') {
			parentUrl += '/';
		}
		var pre = url.resolve(parentUrl.substr(0, parentUrl.length -1), '.');
		list.forEach(function(item) {
			try{
				var stats = fs.lstatSync(path.join(parentPath,item));
				if(stats.isFile() && (whiteExt === '*' || whiteExt.indexOf(path.extname(item)) !== -1)) {
					liStr.push(genLi(url.resolve(parentUrl, item), item));
				} else if((stats.isDirectory() && blackDirectory.indexOf(item) === -1) ) {
					liStr.push(genLi(url.resolve(parentUrl, item), item + '/'));
				}
			} catch(e) {
				console.log(e)
			}			
		})
		liStr = liStr.join('');

		return ['<!DOCTYPE html>',
				'<html lang="en">',
					'<head>',
						'<meta charset="utf-8">',
						isMobile ? '<meta name="viewport" content="width=device-width,initial-scale=1">': '',
						'<title>', pre, '</title>',
						'<style>',
							'body{color: #333; font-size: 14px; margin: 20px 10px;} ',
							'a{color: #333;text-decoration: none; display: block; } a:hover{color:#0088cc; font-size: 15px;}',
							'li{ line-height: 1.5em;}',
						'</style>',
					'</head>',
					'<body>',
						pre ? '<a href="' + pre + '"><< Pre</a>': '',
						'<ul>', liStr, '</ul>',
					'</body>',
				'</html>'].join('');
	}

	return function (response, path, url, req) {	
		fs.readdir(path, function onReaddir (err, list) {
			if (err) {
				response.end('Read Directory error');
				return;
			}
		    response.setHeader('Content-Type', 'text/html; charset=UTF-8');
		    response.end(createDirectoryHtml(path, list, url, util.isMobile(req.headers['user-agent'])));
		})
	}
})();

