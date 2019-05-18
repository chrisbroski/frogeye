/*jslint node: true */

function Senses(visionWidth, visionHeight, virtual) {
    'use strict';

    // Import libraries
    var spawn = require('child_process').spawn,
        frogeye = require('./frogeye.js'),
        fs = require("fs"),

        // Declare private objects
        state = {},
        observers = {},
        perceivers = {},
        attention = {},
        partialImgData = '';

    // *Sense state* is a collection of all current sensory data.
    state.raw = {
        // *Raw* state is unprocessed environment measurements received from sensors.
        // Raw state can only be written by observers and only read by perceivers
        luma: {
            current: [],
            previous: []
        }
    };

    // *Perceptions* are the results of processing raw sense state
    // They can only be written by perceivers, but can be read by anything
    state.perceptions = {
        dimensions: [visionWidth, visionHeight],
        motionLocation: [],
        brightnessOverall: 0.0,
        edges: []
    };

    // Sense state is publically readable (but not changeable).
    this.senseState = function (type) {
        if (type) {
            return JSON.parse(JSON.stringify(state.perceptions[type]));
        }
        return JSON.parse(JSON.stringify(state.perceptions));
    };

    // *Perceivers* process raw sense state into meaningful information
    perceivers.frogEye = function (imgPixelSize) {
        var frogView = frogeye(state.raw.luma, state.raw.chroma, imgPixelSize, visionWidth, 20);
        state.perceptions.brightnessOverall = frogView.brightness;
        state.perceptions.motionLocation = frogView.moveLocation;
        state.perceptions.edges = frogView.edges;
    };

    // *Observers* populate raw sense state from a creature's sensors.
    observers.vision = function (yuvData, imgRawFileSize, imgPixelSize) {
        var lumaData = [],
            ii;

        // The Pi camera gives a lot of crap data in yuv time lapse mode.
        // This is an attempt to recover some of it
        if (yuvData.length < imgRawFileSize - 1) {
            if (yuvData.length + partialImgData.length === imgRawFileSize) {
                yuvData = Buffer.concat([partialImgData, yuvData], imgRawFileSize);
            } else {
                partialImgData = yuvData;
                return;
            }
        }
        partialImgData = '';

        // Data conversion. In this case an array is built from part of a binary buffer.
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            lumaData.push(yuvData.readUInt8(ii));
        }

        // Set raw global sense state
        state.raw.luma.previous = state.raw.luma.current;
        state.raw.luma.current = lumaData;

        /*
        Perceivers should typically be handled by the attention object, but for simplicity
        we'll just fire it off after the observer completes.
        */
        perceivers.frogEye(imgPixelSize);
    };

    // Other observers can be added here for sound, temperature, velocity, smell, whatever.

    // virtual input
    function virt(imgNum, imgRawFileSize, imgPixelSize) {
        var img = parseInt(imgNum / 10, 10) % 2 + 1;
        imgNum += 1;

        fs.readFile(__dirname + '/test' + img + '.raw', function (err, data) {
            if (err) {
                throw err;
            }
            observers.vision(data, imgRawFileSize, imgPixelSize);
            setTimeout(function () {virt(imgNum, imgRawFileSize, imgPixelSize); }, 250);
        });
    }

    // *Attention* is responsible for triggering observers and perceivers.
    attention = {};
    attention.look = function (timeLapseInterval) {
        var imgPixelSize = visionWidth * visionHeight,
            imgRawFileSize = imgPixelSize * 1.5,
            cam;

        if (virtual) {
            virt(1, imgRawFileSize, imgPixelSize);
        } else {
            timeLapseInterval = timeLapseInterval || 0;
            cam = spawn('raspiyuv', [
                '-w', visionWidth.toString(10),
                '-h', visionHeight.toString(10),
                '--nopreview',
                '-bm', // Burst mode
                '-vf', // My camera is upside-down so flip the image vertically
                '-hf',
                '-tl', timeLapseInterval.toString(10), // 0 = as fast as possible
                '-t', '300000', // Restart every 5 min
                '-o', '-' // To stdout
            ]);

            cam.stdout.on('data', function (data) {
                observers.vision(data, imgRawFileSize, imgPixelSize);
            });

            cam.stderr.on('data', function (data) {
                console.log('stderr: ' + data);
            });

            cam.on('exit', function (code) {
                console.log('raspiyuv process exited with code ' + code);
                console.log('Restarting raspiyuv time lapse');
                attention.look();
            });
        }
    };

    function init() {
        console.log('Initialize senses module');
        attention.look();
    }

    init();
}

module.exports = Senses;
