const http = require('http');
const fs = require('fs');
const path = require('path')

const port = 8000
http.createServer(function (request, response) {
    // console.log('request starting...');
    const base = path.basename(request.url, path.extname(request.url))
    const extractBase = base.substring(0, base.length - 1)
    let filePath=""
    var filePathOption1 = path.resolve(`../files/hls/${base}/${request.url}`);
    var filePathOption2 = path.resolve(`../files/hls/${extractBase}/${request.url}`)

    if (fs.existsSync(filePathOption1)) {
        filePath=filePathOption1
    }
    else {
        filePath=filePathOption2
    }
    // console.log('filepath',filePath);
    
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
console.log(`Server running at http://127.0.0.1:${port}/`);