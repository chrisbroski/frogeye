var util = require('util'),
    spawn = require('child_process').spawn,
    cam = spawn('raspiyuv', ['-w', '64', '-h', '48', '-tl', '500', '-o', '-']),
    lastImage = [];

cam.stdout.on('data', function (data) {
    var thisImage = [],
        ii,
        diff,
        movement = 0;

    if (data.length !== 4608) {
        console.log('image incorrect size');
        return;
    }
    for (ii = 0; ii < 3072; ii += 1) {
        thisImage.push(data.readUInt8(ii));
    }

    if (lastImage.length) {
        for (ii = 0; ii < 3072; ii += 1) {
            diff = lastImage[ii] - thisImage[ii];
            if (diff > 50 || diff < -50) {
                movement += 1;
            }
        }
    }

    lastImage = thisImage;
    console.log('move:', movement);
});

cam.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
});

cam.on('exit', function (code) {
    console.log('child process exited with code ' + code);

});
