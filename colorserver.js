/*jslint node: true, sloppy: true */

var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    spawn = require('child_process').spawn,
    port = 3790,
    senseState = {},
    imgWidth = 128,
    imgHeight = 96,
    imgPixelSize = imgWidth * imgHeight,
    imgRawFileSize = imgPixelSize * 1.5,
    rawYuv = {y: [], u: [], v: []},
    partialImgData = '';

senseState.dimensions = [imgWidth, imgHeight];
senseState.centerColor = {hsl: {hue: 0.0, saturation: 0.0}, yuv: {y: 0, u: 0, v: 0}};
senseState.targetColor = {hue: 22, saturation: 0.57};
senseState.targets = [];
senseState.edges = [];
senseState.tooDark = [];

function isEdge(ii, visionWidth, imgPixelSize, luma) {
    var val = luma[ii], compare, difference = 50;
    // check top, right, bottom, and left for a significant increase in luma

    // Top
    if (ii > visionWidth) {
        compare = luma[ii - visionWidth];
        if (compare - val > difference) {
            return true;
        }
    }

    // Bottom
    if (ii < imgPixelSize - visionWidth) {
        compare = luma[ii + visionWidth];
        if (compare - val > difference) {
            return true;
        }
    }

    // Left
    if (ii % visionWidth > 0) {
        compare = luma[ii - 1];
        if (compare - val > difference) {
            return true;
        }
    }

    // Right
    if (ii % visionWidth < visionWidth - 1) {
        compare = luma[ii + 1];
        if (compare - val > difference) {
            return true;
        }
    }
}

function findEdges(luma, len, visionWidth) {
    var ii,
        contrast = [];

    for (ii = 0; ii < len; ii += 1) {
        if (isEdge(ii, visionWidth, len, luma)) {
            contrast.push(ii);
        }
    }

    senseState.edges = contrast;
}

// Tried to adapt this: http://www.quasimondo.com/archives/000696.php
function uvToHue(u, v) {
    var angle,

        // first, get u and v into the -1.0 to 1.0 range for some trig
        normalU = (-2 * u / 255) + 1.0,
        normalV = (2 * v / 255) - 1.0;

    // atan2 is a super useful trig function to get an angle -pi to pi
    angle = Math.atan2(normalU, normalV);
    if (angle < 0) {
        angle = Math.PI * 2 + angle;
    }

    // Then normalize the value to 0.0 - 360.0
    return angle / (Math.PI * 2) * 360;
}

function uvToSat(u, v) {
    var normalU = (2 * u / 255) - 1.0,
        normalV = (2 * v / 255) - 1.0;

    return Math.sqrt(normalU * normalU + normalV * normalV);
}

function getLumaFromUV(uvIndex) {
    var pix = [];
    pix[0] = rawYuv.y[uvIndex * 2];
    pix[1] = rawYuv.y[uvIndex * 2 + 1];
    pix[2] = rawYuv.y[uvIndex * 2 + imgWidth];
    pix[3] = rawYuv.y[uvIndex * 2 + imgWidth + 1];

    return (pix[0] + pix[1] + pix[2] + pix[3]) / 4;
}

function centerPixels() {
    var pix = [],
        colorWidth = imgWidth / 2,
        colorHeight = imgHeight / 2;

    pix[0] = (colorHeight / 2) * colorWidth - (colorWidth / 2) - 1;
    pix[1] = pix[0] + 1;
    pix[2] = pix[0] + colorWidth;
    pix[3] = pix[2] + 1;

    return pix;
}

function getCenterColor(u, v) {
    var center = centerPixels(),
        centerU = (u[center[0]] + u[center[1]] + u[center[2]] + u[center[3]]) / 4,
        centerV = (v[center[0]] + v[center[1]] + v[center[2]] + v[center[3]]) / 4,
        centerY = (getLumaFromUV(center[0]) + getLumaFromUV(center[1]) + getLumaFromUV(center[2]) + getLumaFromUV(center[3])) / 4;

    return [centerY, centerU, centerV];
}

function setCenterColor(rawYuv) {
    var centerColor = getCenterColor(rawYuv.u, rawYuv.v);

    senseState.centerColor.yuv.y = centerColor[0];
    senseState.centerColor.yuv.u = centerColor[1];
    senseState.centerColor.yuv.v = centerColor[2];

    senseState.centerColor.hsl.hue = uvToHue(centerColor[1], centerColor[2]);
    senseState.centerColor.hsl.saturation = uvToSat(centerColor[1], centerColor[2]);
    senseState.centerColor.hsl.luma = centerColor[0] / 255;
}

function targetColorLocations(u, v, len) {
    var ii,
        lumaTolerance = 20,
        hueTolerance = 1.0,
        satTolerance = 0.20,
        hueDif,
        satDif,
        hits = [];

    senseState.tooDark.length = 0;
    for (ii = 0; ii < len; ii += 1) {
        // if luma is too dark, ignore
        if (getLumaFromUV(ii) > lumaTolerance) {
            hueDif = Math.abs(uvToHue(u[ii], v[ii]) - senseState.targetColor.hue);
            if (hueDif > 180) {
                hueDif = Math.abs(hueDif - 180);
            }
            satDif = Math.abs(uvToSat(u[ii], v[ii]) - senseState.targetColor.saturation);
            if (hueDif <= hueTolerance && satDif <= satTolerance) {
                hits.push(ii);
            }
        } else {
            senseState.tooDark.push(ii);
        }
    }

    senseState.targets = hits;
}

function convertImageData(imgData) {
    var ii;

    // The Pi camera gives a lot of crap data in yuv time lapse mode.
    // This is an attempt to recover some of it
    if (imgData.length < imgRawFileSize - 1) {
        console.log('Partial img data chunk: ' + imgData.length);
        if (imgData.length + partialImgData.length === imgRawFileSize) {
            imgData = Buffer.concat([partialImgData, imgData], imgRawFileSize);
        } else {
            partialImgData = imgData;
            console.log('Reassembled partial data.');
            return;
        }
    } else {
        partialImgData = '';
    }

    rawYuv.y.length = 0;
    rawYuv.u.length = 0;
    rawYuv.v.length = 0;

    // Data conversion. In this case an array is built from part of a binary buffer.
    for (ii = 0; ii < imgPixelSize; ii += 1) {
        rawYuv.y.push(imgData.readUInt8(ii));
    }
    for (ii = imgPixelSize; ii < imgPixelSize * 1.25; ii += 1) {
        rawYuv.u.push(imgData.readUInt8(ii));
    }
    for (ii = imgPixelSize * 1.25; ii < imgPixelSize * 1.5; ii += 1) {
        rawYuv.v.push(imgData.readUInt8(ii));
    }
}

function processData(yuvData) {
    convertImageData(yuvData);

    findEdges(rawYuv.y, imgPixelSize, imgWidth, 20);
    setCenterColor(rawYuv);
    targetColorLocations(rawYuv.u, rawYuv.v, imgPixelSize / 4);
}

function takePic() {
    var cam;

    cam = spawn('raspiyuv', [
        '-w', imgWidth,
        '-h', imgHeight,
        //'-p', '50, 80, 400, 300', // small preview window
        '--nopreview',
        '-awb', 'fluorescent',
        '-bm', // Burst mode
        '-vf', // My camera is upside-down so flip the image vertically
        '-tl', '250', // 0 = as fast as possible
        '-t', '300000', // Restart every 5 min
        '-o', '-' // To stdout
    ]);

    cam.stdout.on('data', function (data) {
        processData(data);
    });

    cam.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    cam.on('exit', function (code) {
        console.log('raspiyuv process exited with code ' + code);
        console.log('Restarting raspiyuv time lapse');
        takePic();
    });
}

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/colorview.html');
});

function sendSenseData() {
    setInterval(function () {
        io.emit('senseState', JSON.stringify(senseState));
    }, 200);
}

io.on('connection', function (socket) {
    console.log('Color viewer client connected');

    sendSenseData();
    takePic();

    socket.on('disconnect', function () {
        console.log('Color viewer client disconnected');
    });

    socket.on('set target', function (val) {
        var targetColor = JSON.parse(val);
        console.log('target set');
        senseState.targetColor.hue = targetColor.h;
        senseState.targetColor.saturation = targetColor.s;
    });
});

http.listen(port, function () {
    console.log('Color view server listening on http://0.0.0.0/:' + port);
});
