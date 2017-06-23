'use strict';
var http = require('http');
var https = require('https');
var proxy = require("./proxy.js");

//var request = require('request');
//var url = require('url');
//var qs = require('querystring');
var port = 80;
//var tools = require("./tools.js");

var initServer = function () {
    proxy.init();
};
http.createServer(function (req, res) {
    proxy.proceed(req, res);
}).listen(port, initServer);


https.createServer(function (req, res) {
    proxy.proceed(req, res);
}).listen(443);




/*
fs.watch($cachePath, { encoding: 'buffer' }, (eventType, filename) => {
    if (filename) {
        //console.log("CHANGE: " + filename);
    }
});
*/

/*
var http = require('http'),
    request = require('request');

http.createServer(function (req, res) {
    res.setHeader("content-disposition", "attachment; filename=logo.png");
    request('http://google.com/images/srpr/logo11w.png').pipe(res);
}).listen(8080);
*/

/* //SSL

const crypto = require('crypto'),
  fs = require("fs"),
  http = require("http");

var privateKey = fs.readFileSync('privatekey.pem').toString();
var certificate = fs.readFileSync('certificate.pem').toString();

var credentials = crypto.createCredentials({key: privateKey, cert: certificate});

var handler = function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
};

var server = http.createServer();
server.setSecure(credentials);
server.addListener("request", handler);
server.listen(8000);

*/