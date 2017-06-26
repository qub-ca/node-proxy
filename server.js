'use strict';
var http = require('http');
var https = require('https');
var fs = require('fs');
var routes = require("./routes.js");

var secureContext = {};
var initServer = function () {
    secureContext = routes.init();
};
http.createServer(function (req, res) {
    routes.execute(req, res);
}).listen(80, initServer);

var tls = require("tls");

var options = {
    SNICallback: function (domain, cb) {
        cb(null, secureContext[domain]);
    }
};

https.createServer(options, function (req, res) {
    routes.execute(req, res);
    //res.end("TEST");
}).listen(443);

/* NO SNI VERSION
var options = {
    key: fs.readFileSync('./ssl/domain.key'),
    cert: fs.readFileSync('./ssl/domain.crt'),
    ca: fs.readFileSync('./ssl/ca_authority.crt')
};

https.createServer(options, function (req, res) {
    routes.execute(req, res);
}).listen(443);
 */