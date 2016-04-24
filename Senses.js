/*jslint node: true */

function Senses(imgWidth, imgHeight) {
    'use strict';

    // Import libraries
    var spawn = require('child_process').spawn,

        // Declare private objects
        state,
        observers = {},
        perceivers = {},
        attention = {};

    // *Sense state* is a collection of all sensory data from the most recent observations
    state = {
        // *raw* is unprocessed environment measurements received from sensors
        raw: {
            lumaCurrent: [],
            lumaPrevious: []
        },

        // *perceptions* are results of processing raw sensory data
        perceptions: {
            overallMotion: 0
        }
    };

    // Sense state is readable (but not changeable) by any part of a behavioral logic system.
    this.senseState = function senseState(type) {
        if (type) {
            return JSON.parse(JSON.stringify(state.perceptions[type]));
        }
        return JSON.parse(JSON.stringify(state.perceptions));
    };

    // Perceivers process raw sense state into meaningful information
    perceivers.overallMotion = function overallMotion(imgPixelSize) {
        var diff, ii, changeAmount = 50, movement = 0;
        // This needs optimization - change to first image flag or something
        if (state.raw.lumaPrevious.length) {
            // Compare current and previous brightness arrays
            for (ii = 0; ii < imgPixelSize; ii += 1) {
                diff = state.raw.lumaPrevious[ii] - state.raw.lumaCurrent[ii];
                if (diff > changeAmount || diff < changeAmount * -1) {
                    movement += 1;
                }
            }
        }

        state.perceptions.overallMotion = movement;
        console.log('move:', movement);
    };

    // *Observers* receive data from a creature's sensors, then update sense state
    observers.luma = function luma(yuvData, imgRawFileSize, imgPixelSize) {
        var lumaData = [],
            ii;

        if (yuvData.length < imgRawFileSize - 1) {
            console.log('image incorrect size');
            return;
        }

        // Build array of brightness data from first 2/3 of binary buffer
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            lumaData.push(yuvData.readUInt8(ii));
        }

        state.raw.lumaPrevious = state.raw.lumaCurrent;
        state.raw.lumaCurrent = lumaData;

        perceivers.overallMotion(imgPixelSize);
    };

    // *Attention control* is responsible for triggering observers and perceivers appropriately.
    attention.control = {};
    attention.control.look = function look(timeLapseInterval) {
        var imgPixelSize = imgWidth * imgHeight,
            imgRawFileSize = imgPixelSize * 1.5,

            cam = spawn('raspiyuv', [
                '-w', imgWidth.toString(10),
                '-h', imgHeight.toString(10),
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
            console.log('child process exited with code ' + code);
            console.log('Restarting time lapse');
            attention.control.look();
        });
    };

    function init() {
        attention.control.look(500);
    }

    init();
    /*attention.control = function control(type) {
        if (observers[type]) {
            observers[type]();
            return true;
        }
        return false;
    };*/
}

module.exports = Senses;
