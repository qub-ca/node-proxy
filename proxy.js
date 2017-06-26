//var proxy = module.exports;
var http = require('http');
var https = require('https');
var tls = require('tls');
var fs = require('fs');
$ = {
    config: {},
    secureContext: {},
    cache: {},
    init: function () {
        // Load Config
        if (fs.existsSync("./config.json")) {
            var configFile = fs.readFileSync("./config.json");
            $.config = JSON.parse(configFile);
        }
        if (!fs.existsSync($.config.cachePath)) {
            fs.mkdir($.config.cachePath, function () { Log("Cache folder created"); });
        }

        for (var host in $.config.hostList) {
            // Load SSL Secure Contexte
            if ($.config.hostList[host]["sslCertificate"]) {
                $.secureContext[host] = tls.createSecureContext({
                    key: fs.readFileSync($.config.hostList[host]["sslCertificate"].key),
                    cert: fs.readFileSync($.config.hostList[host]["sslCertificate"].cert),
                    ca: fs.readFileSync($.config.hostList[host]["sslCertificate"].ca)
                });
            }
            // Load cache
            if (!fs.existsSync($.config.cachePath + host + "/")) {
                fs.mkdir($.config.cachePath + host + "/");
            }
            $.cache[host] = {};
            if (fs.existsSync($.config.cachePath + host + "/cache.json")) {
                var cacheFile = fs.readFileSync($.config.cachePath + host + "/cache.json");
                $.cache[host] = JSON.parse(cacheFile);
            }
        }
        setInterval(this.tick, 10000);
    },
    tick: function () {
        $.cacheTools.eventChangedExecute();
    },
    proceed: function (req, res) {
        try {
            var pHost = req.headers.host;
            if (pHost.indexOf(":") !== -1) { pHost = pHost.split(":")[0]; } // Remove port
            var pURL = req.url;
            var pCacheKey = pURL;
            res.statusCode = 200;
            
            if (!$.config.hostList[pHost]) {
                res.statusCode = 404;
                res.end("NOT AUTHORIZED PROXY ACCESS");
                return false;
            }

            var body = "";
            req.on('data', function (chunk) {
                body += chunk;
            });
            req.on('end', function () {
                if (body !== "") { pCacheKey += "|" + body; }
                if ($.cache[pHost][pCacheKey] && $.config.hostList[pHost].cacheEnabled) {
                    res.writeHeader($.cache[pHost][pCacheKey].statusCode, $.cache[pHost][pCacheKey].headers);
                    if ($.cache[pHost][pCacheKey].content !== "") {
                        res.end($.cache[pHost][pCacheKey].content);
                        Log("CACHE TEXT: " + pURL);
                    } else {
                        try { // TODO: error don't fire!
                            var readStream = fs.createReadStream($.cache[pHost][pCacheKey].filePath);
                            readStream.pipe(res);
                        } catch (err) {
                            res.end();
                        }

                        Log("CACHE FILE: " + pURL);
                    }

                } else {
                    var pOptions = {
                        method: req.method,
                        hostname: $.config.hostList[pHost].origin.ip,
                        path: pURL,
                        headers: req.headers
                    };
                    // Override request header value
                    delete pOptions.headers["accept-encoding"]; // Disable GZip
                    pOptions.headers["host"] = $.config.hostList[pHost].origin.host;

                    // Send Request to origin
                    var extReq = http.request(pOptions, function (extRes) {
                        var saveToCache = $.config.hostList[pHost].cacheEnabled;
                        var isRewritedText = false;
                        if (!extRes.headers["content-type"]) saveToCache = false;
                        if (saveToCache) {
                            var pCacheFilePath = $.cacheTools.getPath(pHost, pURL);

                            var pContentType = "";
                            if (extRes.headers["content-type"]) pContentType = extRes.headers["content-type"];

                            $.cache[pHost][pCacheKey] = {
                                statusCode: extRes.statusCode,
                                headers: extRes.headers,
                                content: "",
                                filePath: pCacheFilePath
                            };

                            if (pContentType.indexOf("text") !== -1 || pContentType.indexOf("javascript") !== -1 || pContentType.indexOf("json") !== -1) {
                                // TEXT CONTENT
                                var resBody = "";
                                extRes.on('data', function (chunk) {
                                    resBody += chunk;
                                });
                                extRes.on('end', function (chunk) {
                                    /* Replace text in the response */
                                    if ($.config.hostList[pHost]["textReplace"]) {
                                        isRewritedText = true;
                                        for (var textSource in $.config.hostList[pHost]["textReplace"]) {
                                            resBody = resBody.replaceAll(textSource, $.config.hostList[pHost]["textReplace"][textSource]);
                                        }
                                    }
                                    $.cache[pHost][pCacheKey].content = resBody;
                                    var pContentLength = Buffer.byteLength(resBody, "utf-8");
                                    $.cache[pHost][pCacheKey].headers["content-length"] = pContentLength;
                                    extRes.headers["content-length"] = pContentLength;
                                    res.writeHeader(extRes.statusCode, extRes.headers);
                                    res.end(resBody);
                                });

                            } else {
                                // FILE CONTENT
                                $.cacheTools.createPath(pCacheFilePath);
                                extRes.pipe(fs.createWriteStream(pCacheFilePath));
                                res.writeHeader(extRes.statusCode, extRes.headers);
                                extRes.pipe(res);
                            }
                            $.cacheTools.eventChanged(pHost);

                        } else {
                            // NO CACHE, JUST RELAY
                            res.writeHeader(extRes.statusCode, extRes.headers);
                            extRes.pipe(res);
                        }

                        Log("RELAY: " + pURL);
                        
                    });
                    extReq.on("error", function (err) {
                        Log(err);
                        res.end("SERVER DOWN");
                    }).setTimeout(5000, function () {
                        res.end("SERVER TIMEOUT");
                    });
                    if (req.method.toUpperCase() === "POST") extReq.write(body);
                    extReq.end();
                }
            });


        } catch (err) {
            Log(err);
        }

    },
    cacheTools: {
        createPath: function (path) {
            //Log("CREATING: " + path);
            var pFolders = path.split("/");
            var pPathCreate = "";
            for (var i = 0; i < pFolders.length - 1; i++) {
                pPathCreate += pFolders[i] + "/";
                if (!fs.existsSync(pPathCreate)) {
                    fs.mkdirSync(pPathCreate);
                    //Log("CREATE: " + pPathCreate);
                }

            }
        },
        getPath: function (host, url) {
            if (url.indexOf("?") !== -1) {
                /*var arrayURL = url.split("/");
                if (arrayURL[arrayURL.length - 1].indexOf(".") === -1) { return "DONT-CACHE"; }*/
                url = url.split("?")[0];
                //return "DONT-CACHE";
            }
            /*if (url.indexOf(".aspx") !== -1) { return "DONT-CACHE"; }*/
            var pPath = $.config.cachePath + host;
            var pFolders = url.split("/");
            for (var i = 0; i < pFolders.length - 1; i++) {
                pPath += pFolders[i] + "/";
                //Log(pPath);
            }
            var pFileName = pFolders[pFolders.length - 1];
            if (pFileName === "") { pFileName = "index.html"; } /* http://domain.com/test/ */
            if (pFileName.indexOf(".") === -1) { pFileName += "/index.html"; } /* http://domain.com/test */
            pPath += pFileName;
            return pPath;
        },
        eventChangedList: {},
        eventChanged: function (host) {
            $.cacheTools.eventChangedList[host] = new Date().getTime() + 10000;
        },
        eventChangedExecute: function () {
            for (var host in $.config.hostList) {
                if ($.cacheTools.eventChangedList[host]) {
                    if (new Date().getTime() > $.cacheTools.eventChangedList[host]) {
                        delete $.cacheTools.eventChangedList[host];
                        fs.writeFile($.config.cachePath + host + "/cache.json", JSON.stringify($.cache[host]), 'utf-8', function (err) { });
                        Log("CACHE SAVED: " + host);
                    }
                }

            } 
        }
    },
    moduleEnd: true
 
};
module.exports = $;


String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var Log = function (inLog) {
    //if (inLog.indexOf("RELAY") === -1) { return false; }
    console.log(inLog);
};