/*jslint node: true */

function motionDirection(dir) {
    if (dir[0] + dir[1] + dir[2] > 20) {
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
    var left = visionWidth * 0.375,
        right;

    if (ii % visionWidth < left) {
        return 0;
    }

    right = visionWidth * 0.625;
    if (ii % visionWidth > right) {
        return 2;
    }

    return 1;
}

function highResDirection(ii, visionWidth, imgPixelSize) {
    var topPos = Math.floor(ii / imgPixelSize * 3),
        leftPos = (Math.floor(ii / Math.floor(visionWidth / 4)) % 4);

    return topPos * 4 + leftPos;
}

function normalize(intArray, max) {
    return intArray.map(function (item) {
        return item / max;
    });
}

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

function frogeye(imgPixelSize, visionWidth, luma, changeAmount) {
    var diff,
        ii,
        directions = [0, 0, 0],
        brightness = 0,
        hiResDir = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        contrast = [];

    // This could be optimized with a first image flag
    if (luma.previous.length) {
        // Compare current and previous luma arrays
        for (ii = 0; ii < imgPixelSize; ii += 1) {
            diff = Math.abs(luma.previous[ii] - luma.current[ii]);
            brightness += luma.current[ii];
            if (diff > changeAmount) {
                directions[lrOrCenter(ii, visionWidth)] += 1;
                hiResDir[highResDirection(ii, visionWidth, imgPixelSize)] += 1;
            }
            if (isEdge(ii, visionWidth, imgPixelSize, luma.current)) {
                contrast.push({i: ii});
            }
        }
    }

    return {
        "brightness": brightness / imgPixelSize / 256,
        "direction": motionDirection(directions),
        "moveArea": normalize(hiResDir, imgPixelSize / 12),
        "edges": contrast
    };
}

module.exports = frogeye;
