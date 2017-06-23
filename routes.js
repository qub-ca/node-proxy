var proxy = require("./proxy.js");

module.exports = {
    init: function () {
        proxy.init();
    },
    execute: function (req, res) {
        switch (req.url) {
            case "/cache/":
                /* CACHE MODULE */
                res.setHeader("content-type", "text/html; charset=UTF-8");
                //res.setHeader("content-type", "application/json");
                //res.end(JSON.stringify(proxy.getConfig()));
                var cache = proxy.getCache();
                var H = "";
                var host = req.headers.host;
                //for (var host in cache) {
                    H += "<h1>" + host + "</h1>";
                    for (var url in cache[host]) {
                        H += "<h2>" + url + "</h2>";
                        H += cache[host][url].filePath + "<br>";
                        H += JSON.stringify(cache[host][url].headers);
                        if (cache[host][url].headers["content-type"]) {
                            if (cache[host][url].headers["content-type"].indexOf("image") !== -1) {
                                H += "<img src=\"" + url + "\" width='100' /><br>";
                            }
                        }
                        if (cache[host][url].content !== "") {
                            //H += "<textarea>" + cache[host][url].content + "</textarea>";
                        }
                    }
                //}
                res.end(H);

                /* CACHE MODULE */
                break;

            default:
                proxy.proceed(req, res);
        }

    }
};