const http = require('http');
const fs = require('fs');
const path = require('path')

const port = 8000
http.createServer(function (request, response) {
    const url = request.url.substring(request.url.lastIndexOf('/') + 1);
    const base = path.basename(url, path.extname(url))
    const extractBase = base.substring(0, base.indexOf('p') + 1);
    let filePath = ""
    var filePathOption1 = path.resolve(`../files/hls/${base}/${url}`);
    var filePathOption2 = path.resolve(`../files/hls/${extractBase}/${url}`)
    if (fs.existsSync(filePathOption1)) {
        filePath = filePathOption1
    }
    else {
        filePath = filePathOption2
    }

    fs.readFile(filePath, function (error, content) {
        response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
        if (error) {
            if (error.code == 'ENOENT') {
                fs.readFile('./404.html', function (error, content) {
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end(' error: ' + error.code + ' ..\n');
                response.end();
            }
        }
        else {
            response.end(content, 'utf-8');
        }
    });

}).listen(port);