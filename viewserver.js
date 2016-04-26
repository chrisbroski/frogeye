/*jslint node: true */

var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    port = 3789,
    Senses = require('./Senses.js'),
    senses = new Senses(64, 48);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/viewer.html');
});

function sendSenseData() {
    setInterval(function () {
        // send sense data to viewer
        io.emit('senseState', JSON.stringify(senses.senseState()));
    }, 500);
}

io.on('connection', function (socket) {
    console.log('viewer connected');

    sendSenseData();

    socket.on('disconnect', function () {
        console.log('viewer disconnected');
    });
});

http.listen(port, function () {
    console.log('listening on /:' + port);
});
