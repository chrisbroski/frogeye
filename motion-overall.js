var util = require('util'),
    spawn = require('child_process').spawn,
    imgWidth = 64,
    imgHeight = 48,
    imgPixelSize = imgWidth * imgHeight,
    imgRawFileSize = imgPixelSize * 1.5,
    timeLapseInterval = 500, // in milliseconds
    changeAmount = 50; // Value difference to be considered changed

function startTimeLapseCapture() {
    var cam = spawn('raspiyuv', [
            '-w', imgWidth.toString(10),
            '-h', imgHeight.toString(10),
            '-tl', timeLapseInterval.toString(10),
            '-t', '300000', // Restart every 5 min
            '-o', '-' // To stdout
        ]),
        lastImage = [];

    console.log('Initializing time lapse image capture to stdout.');

    cam.stdout.on('data', function (data) {
        var thisImage = [],
            ii,
            diff,
            movement = 0;

        if (data.length < imgRawFileSize - 1) {
            console.log('image incorrect size');
            return;
        }

        // Build array of brightness data from first 2/3 of binary buffer
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            thisImage.push(data.readUInt8(ii));
        }

        if (lastImage.length) {
            // Compare current and previous brightness arrays
            for (ii = 0; ii < imgPixelSize; ii += 1) {
                diff = lastImage[ii] - thisImage[ii];
                if (diff > changeAmount || diff < changeAmount * -1) {
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
