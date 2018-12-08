global.__app = __dirname;

const http = require("http");
const ModulePath = require("path");
const mime = require("mime-types");
const util = require("util");
const fs = require("fs");

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
                        response.writeHead(404, {
                            'Content-Type': 'text/plain'
                        });
                        response.end("Cannot GET " + path);
                        return;
                    }
                }
                var ext = "text/plain";
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

http.createServer(function (request, response) {
    handleRequest(request, response)
        .catch(e => {console.log(e);
            response.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            response.end("Internal server error");
        });
}).listen(80, function () {
    console.log("Server running on port 80.");
});