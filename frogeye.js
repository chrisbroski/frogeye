var util = require('util'),
    spawn = require('child_process').spawn,
    cam = spawn('raspiyuv', ['-w', '64', '-h', '48', '-vf', '-hf', '-o', 'camtest3']);

cam.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
});

cam.on('exit', function (code) {
  console.log('child process exited with code ' + code);
});
