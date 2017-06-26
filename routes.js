var proxy = require("./proxy.js");

module.exports = {
    init: function () {
        proxy.init();
        return proxy.secureContext;
    },
    execute: function (req, res) {
        var reqUrl = req.url;
        if (reqUrl.indexOf("?") !== -1) { reqUrl = reqUrl.split("?")[0]; }

        switch (reqUrl) {
            case "/cache/":
                /* CACHE MODULE */
                res.setHeader("content-type", "text/html; charset=UTF-8");
                //res.setHeader("content-type", "application/json");
                //res.end(JSON.stringify(proxy.getConfig()));
                var cache = proxy.cache;//proxy.getCache();
                var H = "";
                var host = req.headers.host;
                //for (var host in cache) {
                H += "<h1>" + host + "</h1>";
                H += "<table style='width:100%; font-family:Arial;'>";
                for (var url in cache[host]) {
                    H += "<tr valign='top'>";
                    H += "<td>" + url.split("|")[0] + "</td>";
                    H += "<td>" + JSON.stringify(cache[host][url].headers).replaceAll("\",\"", "<br>").replaceAll("\":\"", " : ").replace("{\"", "").replace("\"}", "") + "</td>";
                    H += "<td style='background-color:#E0E0E0;'>";
                    if (cache[host][url].headers["content-type"]) {
                        if (cache[host][url].headers["content-type"].indexOf("image") !== -1) {
                            H += "<img src=\"" + url + "\" style='height:100%; max-height:100px;' />";
                        }
                    }
                    H += "</td>";
                    if (cache[host][url].content !== "") {
                        //H += "<textarea>" + cache[host][url].content + "</textarea>";
                    }
                    H += "<td>" + cache[host][url].filePath + "</td>";
                    H += "</tr>";
                }
                H += "</table>";
                //}
                res.end(H);

                /* CACHE MODULE */
                break;

            default:
                proxy.proceed(req, res);
        }

    }
};

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};