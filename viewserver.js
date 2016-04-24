var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/viewer.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  setInterval(function () {
      // simuated sensory data for testing socket
      io.emit('motion', Math.floor(Math.random() * 255).toString(10));
  }, 3000);

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
