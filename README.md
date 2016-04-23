# frogeye
Make the Raspberry Pi camera see what a frog sees

Starting with the seminal paper "[What a Frog's Eye Tells a Frog's Brain](http://neuromajor.ucr.edu/courses/WhatTheFrogsEyeTellsTheFrogsBrain.pdf)" make an electronic version. Currently using a RaspberryPi 2 and Node.js.

### Imagemagick
    convert -size "64x48" -depth 8 yuv:camtest3.raw conv.jpg
