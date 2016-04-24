/*jslint node: true */

function Senses(visionWidth, visionHeight) {
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

        // *perceptions* are results of processing the raw sensory data
        perceptions: {
            motionOverall: 0,
            motionDirection: 'none'
        }
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
        var diff, ii, changeAmount = 20, movement = 0, directions = [0, 0, 0];
        // This needs optimization - change to first image flag or something
        if (state.raw.lumaPrevious.length) {
            // Compare current and previous luma arrays
            for (ii = 0; ii < imgPixelSize; ii += 1) {
                diff = Math.abs(state.raw.lumaPrevious[ii] - state.raw.lumaCurrent[ii]);
                if (diff > changeAmount) {// || diff < changeAmount * -1) {
                    movement += 1;

                    if (ii % 64 < 24) {
                        directions[0] = directions[0] + 1;
                    } else if (ii % 64 >= 40) {
                        directions[2] = directions[2] + 1;
                    } else {
                        directions[1] = directions[1] + 1;
                    }
                }
            }
        }

        state.perceptions.motionOverall = movement;
        if (movement > 20) {
            if (directions[0] > directions[1] && directions[0] > directions[2]) {
                state.perceptions.motionDirection = 'left';
            } else if (directions[2] > directions[1] && directions[2] > directions[0]) {
                state.perceptions.motionDirection = 'right';
            } else {
                state.perceptions.motionDirection = 'center';
            }
        } else {
            state.perceptions.motionDirection = 'none';
        }
    };

    // *Observers* receive data from a creature's sensors, then update sense state
    observers.luma = function luma(yuvData, imgRawFileSize, imgPixelSize) {
        var lumaData = [],
            ii;

        if (yuvData.length < imgRawFileSize - 1) {
            console.log('image incorrect file size');
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
