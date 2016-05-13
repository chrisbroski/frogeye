/*jslint node: true */

var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    spawn = require('child_process').spawn,
    port = 3790,
    senseState = {},
    imgPixelSize = 64 * 48,
    imgRawFileSize = imgPixelSize * 1.5,
    rawYuv = {y: [], u: [], v: []},
    partialImgData = '';

senseState.centerColor = {hsl: {hue: 0.0, saturation: 0.0}, yuv: {y: 0, u: 0, v: 0}};
senseState.targetColor = {hue: 0.0, saturation: 0.0};
senseState.targetsFound = [];

function getCenterColor(y, u, v) {
    var centerU = (u[367] + u[368] + u[399] + u[400]) / 4,
        centerV = (v[367] + v[368] + v[399] + v[400]) / 4,
        centerY = (y[1536]);
    //console.log(y.length);
    //return [uvToHue(centerU, centerV), uvToSat(centerU, centerV)];
    return [centerY, centerU, centerV]
}

function setCenterColor(rawYuv) {
    var centerColor = getCenterColor(rawYuv.y, rawYuv.u, rawYuv.v);
    //senseState.centerColor.yuv.y = rawYuv.y;
    senseState.centerColor.yuv.y = centerColor[0];
    senseState.centerColor.yuv.u = centerColor[1];
    senseState.centerColor.yuv.v = centerColor[2];

    //console.log(JSON.stringify(senseState));
    console.log(senseState);
}

function processData(yuvData) {
    var ii;

    // The Pi camera gives a lot of crap data in yuv time lapse mode.
    // This is an attempt to recover some of it
    if (yuvData.length < imgRawFileSize - 1) {
        console.log('Partial img data chunk: ' + yuvData.length);
        if (yuvData.length + partialImgData.length === imgRawFileSize) {
            yuvData = Buffer.concat([partialImgData, yuvData], imgRawFileSize);
        } else {
            partialImgData = yuvData;
            console.log('Reassembled partial data.');
        }
        return;
    } else {
        partialImgData = '';
    }

    rawYuv.y.length = 0;
    rawYuv.u.length = 0;
    rawYuv.v.length = 0;

    // Data conversion. In this case an array is built from part of a binary buffer.
    for (ii = 0; ii < imgPixelSize; ii += 1) {
        rawYuv.y.push(yuvData.readUInt8(ii));
    }
    for (ii = imgPixelSize; ii < imgPixelSize * 1.25; ii += 1) {
        rawYuv.u.push(yuvData.readUInt8(ii));
    }
    for (ii = imgPixelSize * 1.25; ii < imgPixelSize * 1.5; ii += 1) {
        rawYuv.v.push(yuvData.readUInt8(ii));
    }

    setCenterColor(rawYuv);
}

function takePic() {
    var cam;

    cam = spawn('raspiyuv', [
        '-w', 64,
        '-h', 48,
        '-p', '50, 80, 400, 300', // small preview window
        '-vf', // My camera is upside-down so flip the image vertically
        '-tl', '500', // 0 = as fast as possible
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
});

http.listen(port, function () {
    console.log('Color view server listening on http://0.0.0.0/:' + port);
});
