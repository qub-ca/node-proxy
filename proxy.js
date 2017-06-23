var http = require('http');
var https = require('https');
var fs = require('fs');
/* var mime = require('mime'); */
var config = {};
var $cache = {};
module.exports = {
    init: function () {
        // Load Config
        if (fs.existsSync("./config.json")) {
            var configFile = fs.readFileSync("./config.json");
            config = JSON.parse(configFile);
        }
        if (!fs.existsSync(config.cachePath)) {
            fs.mkdir(config.cachePath, function () { Log("Cache folder created"); });
        }
        // Load cache
        for (var host in config.hostList) {
            if (!fs.existsSync(config.cachePath + host + "/")) {
                fs.mkdir(config.cachePath + host + "/");
            }
            $cache[host] = {};
            if (fs.existsSync(config.cachePath + host + "/cache.json")) {
                var cacheFile = fs.readFileSync(config.cachePath + host + "/cache.json");
                $cache[host] = JSON.parse(cacheFile);
            }
        }
        setInterval(this.tick, 10000);
    },
    tick: function () {
        for (var host in config.hostList) {
            if (cacheChangedList[host]) {
                if (new Date().getTime() > cacheChangedList[host]) {
                    delete cacheChangedList[host];
                    fs.writeFile(config.cachePath + host + "/cache.json", JSON.stringify($cache[host]), 'utf-8', function (err) { }); 
                    Log("CACHE SAVED: " + host);
                }
            }

        } 
    },
    proceed: function (req, res) {
        try {
            var pHost = req.headers.host;
            if (pHost.indexOf(":") !== -1) { pHost = pHost.split(":")[0]; } // Remove port
            var pURL = req.url;
            var pCacheKey = pURL;
            res.statusCode = 200;
            
            if (!config.hostList[pHost]) {
                res.end("NOT AUTHORIZED PROXY ACCESS");
                return false;
            }

            var body = "";
            req.on('data', function (chunk) {
                body += chunk;
            });
            req.on('end', function () {
                if (body !== "") { pCacheKey += "|" + body; }
                if ($cache[pHost][pCacheKey]) {
                    res.writeHeader($cache[pHost][pCacheKey].statusCode, $cache[pHost][pCacheKey].headers);
                    if ($cache[pHost][pCacheKey].content !== "") {
                        res.end($cache[pHost][pCacheKey].content);
                        Log("CACHE TEXT: " + pURL);
                    } else {
                        try {
                            var readStream = fs.createReadStream($cache[pHost][pCacheKey].filePath);
                            readStream.pipe(res);
                        } catch (err) {
                            res.end();
                        }

                        Log("CACHE FILE: " + pURL);
                    }

                } else {
                    var pOptions = {
                        method: req.method,
                        hostname: config.hostList[pHost].ip,
                        port: 80,
                        path: pURL,
                        headers: req.headers
                    };
                    // Override request header value
                    delete pOptions.headers["accept-encoding"]; // Disable GZip
                    pOptions.headers["host"] = pHost;

                    var pCacheFilePath = cacheGetPath(pHost, pURL);

                    // Send Request to origin
                    var extReq = http.request(pOptions, function (extRes) {
                        res.writeHeader(extRes.statusCode, extRes.headers);
                        var pContentType = "";
                        if (extRes.headers["content-type"]) pContentType = extRes.headers["content-type"];

                        $cache[pHost][pCacheKey] = {
                            statusCode: extRes.statusCode,
                            headers: extRes.headers,
                            content: "",
                            filePath: pCacheFilePath
                        };
                        //var pContentTypeText = "|text/html|text/css|";
                        if (pContentType.indexOf("text") !== -1 || pContentType.indexOf("javascript") !== -1 || pContentType.indexOf("json") !== -1) {
                            var resBody = "";
                            extRes.on('data', function (chunk) {
                                resBody += chunk;
                            });
                            extRes.on('end', function (chunk) {
                                $cache[pHost][pCacheKey].content = resBody;
                            });

                        } else {
                            cacheCreatePath(pCacheFilePath);
                            extRes.pipe(fs.createWriteStream(pCacheFilePath));
                        }
                        cacheChanged(pHost);
                        
                        extRes.pipe(res);
                        Log("RELAY: " + pURL);
                        
                    });
                    if (req.method.toUpperCase() === "POST") extReq.write(body);
                    extReq.end();
                }
            });


        } catch (err) {
            Log(err);
        }

    },
    getConfig: function () { return config; },
    getCache: function () { return $cache; }
 
};

var cacheChangedList = {};
var cacheChanged = function (host) {
    cacheChangedList[host] = new Date().getTime() + 10000; 
};

var cacheCreatePath = function (path) {
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
};

var cacheGetPath = function (host, url) {
    if (url.indexOf("?") !== -1) {
        /*var arrayURL = url.split("/");
        if (arrayURL[arrayURL.length - 1].indexOf(".") === -1) { return "DONT-CACHE"; }*/
        url = url.split("?")[0];
        //return "DONT-CACHE";
    }
    /*if (url.indexOf(".aspx") !== -1) { return "DONT-CACHE"; }*/
    var pPath = config.cachePath + host;
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
};

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var Log = function (inLog) {
    //if (inLog.indexOf("RELAY") === -1) { return false; }
    console.log(inLog);
};