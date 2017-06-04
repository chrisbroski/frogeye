/*jslint node: true */

var http = require("http");
var fs = require("fs");
var server = http.createServer(app);
var io = require('socket.io')(server);
var port = 3789;
var Senses = require('./Senses.js');
var senses = new Senses(64, 48, !!process.argv[2]);

function app(req, rsp) {
    if (req.url === "/img/favicon.png") {
        rsp.writeHead(200, {'Content-Type': 'image/png'});
        fs.createReadStream(__dirname + '/img/favicon.png').pipe(rsp);
    } else {
        rsp.writeHead(200, {'Content-Type': 'text/html'});
        fs.createReadStream(__dirname + '/viewer.html').pipe(rsp);
    }
}

function sendSenseData() {
    setInterval(function () {
        // send sense data to viewer 10x per second
        io.emit('senseState', JSON.stringify(senses.senseState()));
    }, 100);
}

io.on('connection', function (socket) {
    console.log('Frogeye viewer client connected');

    sendSenseData();

    socket.on('disconnect', function () {
        console.log('Frogeye viewer client disconnected');
    });
});

server.listen(port, function () {
    console.log('Frogeye view server listening on http://0.0.0.0/:' + port);
});
