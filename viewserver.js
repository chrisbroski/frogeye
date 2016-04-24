/*var io = require('socket.io')();
io.on('connection', function(socket) {
    console.log('connect');
    var i = 0;
    setTimeout(function () {
        io.send(i);
        i += 1;
    }, 3000);
});
*/
var http = require('http');
var server = http.createServer();
var io = require('socket.io')(server);
io.on('connection', function(socket){
    socket.on('event', function(data){});
    socket.on('disconnect', function(){});
    console.log('connect');
    var i = 0;
    setTimeout(function () {
        io.send(i);
        i += 1;
    }, 3000);
});
server.listen(3000);
