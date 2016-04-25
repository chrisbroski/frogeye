/*jslint node: true */

function getMotionDirection(movement, dir) {
    if (movement > 20) {
        if (dir[0] > dir[1] && dir[0] > dir[2]) {
            return 'left';
        }
        if (dir[2] > dir[1] && dir[2] > dir[0]) {
            return 'right';
        }
        return 'center';
    }
    return 'none';
}

function lrOrCenter(ii, visionWidth) {
    var left = visionWidth / 2.67,
        right;

    if (ii % visionWidth < left) {
        return 0;
    }
    right = visionWidth / 1.6;
    if (ii % visionWidth > right) {
        return 2;
    }
    return 1;
}

function frogeye(imgPixelSize, visionWidth, luma, changeAmount) {
    var diff, ii, movement = 0, directions = [0, 0, 0], brightness = 0;

    // This needs optimization - change to first image flag or something
    if (luma.previous.length) {
        // Compare current and previous luma arrays
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            diff = Math.abs(luma.previous[ii] - luma.current[ii]);
            brightness += luma.current[ii];
            if (diff > changeAmount) {
                movement += 1;
                directions[lrOrCenter(ii, visionWidth)] += 1;
            }
        }
    }

    return {
        "movement": movement / imgPixelSize,
        "brightness": brightness / imgPixelSize,
        "direction": getMotionDirection(movement, directions)
    };
}

module.exports = frogeye;
