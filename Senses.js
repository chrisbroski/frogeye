/*jslint node: true */

function Senses(visionWidth, visionHeight) {
    'use strict';

    // Import libraries
    var spawn = require('child_process').spawn,
        frogeye = require('./frogeye.js'),

        // Declare private objects
        state,
        observers = {},
        perceivers = {},
        attention = {};

    // *Sense state* is a collection of all sensory data from the most recent observations
    state = {
        // *raw* is unprocessed environment measurements received from sensors
        raw: {
            luma: {
                current: [],
                previous: []
            }
        },

        // *perceptions* are results of processing the raw sensory data
        perceptions: {
            motionOverall: 0,
            motionDirection: 'none',
            brightnessOverall: 0
        },

        // Perceptions have no state. Moods are persistent indicators that expire over time
        mood: []
    };

    // Sense state is publically readable (but not changeable).
    this.senseState = function senseState(type) {
        if (type) {
            return JSON.parse(JSON.stringify(state.perceptions[type]));
        }
        return JSON.parse(JSON.stringify(state.perceptions));
    };

    // Perceivers process raw sense state into meaningful information
    perceivers.overallMotion = function overallMotion(imgPixelSize) {
        var frogView = frogeye(imgPixelSize, visionWidth, state.raw.luma, 20);

        state.perceptions.motionOverall = frogView.movement;
        state.perceptions.brightnessOverall = frogView.brightness;
        state.perceptions.motionDirection = frogView.direction;
    };

    // *Observers* receive data from a creature's sensors, then update sense state
    observers.luma = function luma(yuvData, imgRawFileSize, imgPixelSize) {
        var lumaData = [],
            ii;

        if (yuvData.length < imgRawFileSize - 1) {
            console.log('Incorrect image file size');
            return;
        }

        // Build array of brightness data from first 2/3 of binary buffer
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            lumaData.push(yuvData.readUInt8(ii));
        }

        state.raw.luma.previous = state.raw.luma.current;
        state.raw.luma.current = lumaData;

        perceivers.overallMotion(imgPixelSize);
    };

    // *Attention control* is responsible for triggering observers and perceivers.
    attention.control = {};
    attention.control.look = function look(timeLapseInterval) {
        var imgPixelSize = visionWidth * visionHeight,
            imgRawFileSize = imgPixelSize * 1.5,

            cam = spawn('raspiyuv', [
                '-w', visionWidth.toString(10),
                '-h', visionHeight.toString(10),
                '-vf',
                '-vf',
                '-tl', timeLapseInterval.toString(10),
                '-t', '300000', // Restart every 5 min
                '-o', '-' // To stdout
            ]);

        cam.stdout.on('data', function (data) {
            observers.luma(data, imgRawFileSize, imgPixelSize);
        });

        cam.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });

        cam.on('exit', function (code) {
            console.log('raspiyuv process exited with code ' + code);
            console.log('Restarting raspiyuv time lapse');
            attention.control.look(500);
        });
    };

    function init() {
        console.log('init');
        attention.control.look(500);
    }

    init();
}

module.exports = Senses;
