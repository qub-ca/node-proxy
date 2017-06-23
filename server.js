'use strict';
var http = require('http');
var https = require('https');
var routes = require("./routes.js");

//var request = require('request');
//var url = require('url');
//var qs = require('querystring');
//var tools = require("./tools.js");

var initServer = function () {
    routes.init();
};
http.createServer(function (req, res) {
    routes.execute(req, res);
}).listen(80, initServer);


https.createServer(function (req, res) {
    routes.execute(req, res);
}).listen(443);

