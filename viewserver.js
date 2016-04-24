/*jslint node: true */

var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    Senses = require('./Senses.js'),
    senses = new Senses(64, 48);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/viewer.html');
});

function sendSenseData() {
    setInterval(function () {
        // send sense data to viewer
        io.emit('senseState', JSON.stringify(senses.senseState()));
    }, 100);
}

io.on('connection', function (socket) {
    console.log('a user connected');

    sendSenseData();

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
