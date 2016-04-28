/*jslint node: true */

var spawn = require('child_process').spawn,
    imgWidth = 64,
    imgHeight = 48,
    imgPixelSize = imgWidth * imgHeight,
    imgRawFileSize = imgPixelSize * 1.5,
    changeAmount = 50; // Value difference to be considered changed

function startTimeLapseCapture() {
    "use strict";
    var cam, lastImage = [];

    console.log('Initializing time lapse image capture to stdout.');

    cam = spawn('raspiyuv', [
        '-w', imgWidth.toString(10), // image width
        '-h', imgHeight.toString(10), // image height
        '-tl', 0, // take photos as fast as possible
        '-p', '50, 80, 400, 300', // small preview window
        '-t', '300000', // Restart every 5 min
        '-o', '-' // To stdout
    ]);

    cam.stdout.on('data', function (data) {
        var thisImage = [],
            ii,
            diff,
            movement = 0;

        if (data.length < imgRawFileSize - 1) {
            console.log('image incorrect file size');
            return;
        }

        // Build array of brightness data from first 2/3 of binary buffer
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            thisImage.push(data.readUInt8(ii));
        }

        if (lastImage.length) {
            // Compare current and previous brightness arrays
            for (ii = 0; ii < imgPixelSize; ii += 1) {
                diff = Math.abs(lastImage[ii] - thisImage[ii]);
                if (diff > changeAmount) {
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
        console.log('Restarting time lapse');
        startTimeLapseCapture();
    });
}

startTimeLapseCapture();
