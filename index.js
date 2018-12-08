global.__app = __dirname;
process.env.TZ = "Asia/Seoul";

const http = require("http");
const ModulePath = require("path");
const mime = require("mime-types");
const util = require("util");
const fs = require("fs");
const ejs = require("ejs");

mime.types['ejs'] = mime.lookup("html");

const existsFile = async function (path) {
    try {
        await util.promisify(fs.access)(path);
    } catch (e) {
        return false;
    }
    return true;
};

const tls = require("tls");
const TLSSocket = tls.TLSSocket;

function getProtocol(request) {
    return request.socket instanceof TLSSocket ? "https" : "http";
}

async function handleRequest(request, response) {
    let path = request.url.split("?")[0];
    let realRoot = __app + '/public';
    do {
        if (await existsFile(realRoot + path)) {
            let realpath = "";
            if ((realpath = await util.promisify(fs.realpath)(realRoot + path))) {
                if (realpath === "") {
                    response.writeHead(404, {
                        'Content-Type': 'text/plain'
                    });
                    response.end("Cannot GET " + path);
                    return;
                }
                let data = undefined;
                if ((await util.promisify(fs.stat)(realpath)).isDirectory()) {
                    if (path.substr(-1) !== "/") {
                        response.writeHead(301, {
                            'Location': getProtocol(request) + "://" + request.headers.host + path + "/"
                        });
                        response.end();
                        return;
                    }
                    if (await existsFile(realpath + "/index.html")) {
                        realpath += "/index.html";
                    } else {
                        if (await existsFile(realpath + "/index.ejs")) {
                            realpath += "/index.ejs";
                        } else {
                            response.writeHead(404, {
                                'Content-Type': 'text/plain'
                            });
                            response.end("Cannot GET " + path);
                            return;
                        }
                    }
                }
                if (ModulePath.extname(realpath) === ".ejs") {
                    data = ejs.render(
                        await util.promisify(fs.readFile)(realpath, "utf8"),
                        {
                            clan_info: __service.info,
                            clan_war: __service.war,
                            warlog: __service.warlog
                        });
                    console.log(data);
                }
                let ext = "text/plain";
                response.writeHead(200, {
                    'Content-Type': ((ext = mime.lookup(ModulePath.extname(realpath))) === false ? 'text/plain' : ext)
                });
                let content = data || await util.promisify(fs.readFile)(realpath);
                response.end(content);
            }
        } else {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.end("Cannot GET " + path);
        }
    } while (false);
}

let port = process.env.PORT || 80;

http.createServer(function (request, response) {
    handleRequest(request, response)
        .catch(e => {
            console.log(e);
            response.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            response.end("Internal server error");
        });
}).listen(port, function () {
    console.log("Server running on port " + port + ".");
});

const CRService = require(__app + "/lib/CRService");
global.__service = new CRService(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzMxLCJpZGVuIjoiMzE3ODA0NjQxNDczNTI3ODE5IiwibWQiOnsidXNlcm5hbWUiOiJOTE9HIiwia2V5VmVyc2lvbiI6MywiZGlzY3JpbWluYXRvciI6IjY1OTMifSwidHMiOjE1NDQyNDI2OTY0NjZ9.DRRjz6aTnGr097FPHt8sJBi-fdPHWzRt6Pa5epmEWd0',
    'LVRL98Q'
);
__service.init().then(() => {
    __service.start();
});