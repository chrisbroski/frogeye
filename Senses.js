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

    // *Sense state* is a collection of all current sensory data.
    state = {
        // *Raw* state is unprocessed environment measurements received from sensors.
        // Raw state can only be written by observers and only read by perceivers
        raw: {
            luma: {
                current: [],
                previous: []
            }
        },

        // *Perceptions* are the results of processing raw sensory data
        // They can only be written to by perceivers, but can be read by everthing
        perceptions: {
            motionOverall: 0,
            motionDirection: 'none',
            brightnessOverall: 0
        },

        // Perceptions have no state. Moods are persistent indicators that expire over time
        mood: []
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
        var frogView = frogeye(imgPixelSize, visionWidth, state.raw.luma, 20);

        state.perceptions.motionOverall = frogView.movement;
        state.perceptions.brightnessOverall = frogView.brightness;
        state.perceptions.motionDirection = frogView.direction;
    };

    // *Observers* populate raw sense state from a creature's sensors.
    observers.luma = function (yuvData, imgRawFileSize, imgPixelSize) {
        var lumaData = [],
            ii;

        // Sensor data validation, if needed
        if (yuvData.length < imgRawFileSize - 1) {
            console.log('Incorrect image file size');
            return;
        }

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

    // *Attention* is responsible for triggering observers and perceivers.
    attention = {};
    attention.look = function (timeLapseInterval) {
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
            attention.look(500);
        });
    };

    function init() {
        console.log('init');
        attention.look(500);
    }

    init();
}

module.exports = Senses;
