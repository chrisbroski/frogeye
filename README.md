# frogeye

Making a camera tell a computer what a frog sees

I discovered the 1959 seminal paper "[What a Frog's Eye Tells a Frog's Brain](http://neuromajor.ucr.edu/courses/WhatTheFrogsEyeTellsTheFrogsBrain.pdf)" in a [Nautilus article on Walter Pitts](http://nautil.us/issue/21/information/the-man-who-tried-to-redeem-the-world-with-logic) Mind == Blown. Not only was Walter a fascinating person, but the results of the frog eye study jibed with [my own work on AI](http://behaviorallogic.com/foundation). The powerful simplicity of image processing in a frog's retina inspired me to try and build a simulation.

I could go on and on about the paper and its implications, but I'll restrain myself and get to explaining the project.

## Hardware

I am using a [Raspberry Pi 2 B](https://www.raspberrypi.org/products/raspberry-pi-2-model-b/) running Raspbian Jessie and a [Raspberry Pi Camera](https://www.raspberrypi.org/products/camera-module/). I am writing the code on a Mac connected to the Pi over ssh.

## Software

### Node.js

Why Node.js? AI programming decades ago was done with high-level languages that utilized functional and declarative programming paradigms. So what are using today? C and Java? What a giant step backward. If we are ever going to make AI programming a practical endeavor, we need to use tools with abstraction power. What is the best AI programming language today? I doubt any are as good as they could be, but in my opinion based on limited experience: Erlang OTP looks promising. A modern Lisp dialect like Scheme or Racket could be useful. Python is adequate and JavaScript is OK. I am not a fan of JavaScript's C-like syntax (curly brace and semicolon litter everywhere) but it implements a lot of functional style paradigms and has a great native data structure (JSON)

Another thing JavaScript has going for it is that it is one of the most popular languages in the world (though for UI development, not AI) so at least budding AI programmers don't have to scale the learning curve of something like Erlang. A few years ago Node.js took the JavaScript engine out of the font-end and made a network application development tool. Node.js improved one of the major warts of front-end JavaScript (library module inclusion) and introduced a great way to find and manage libraries: npm - the Node Package Manager. Node.js is a powerful network development tool, allowing for the building of distributed communication systems similar to (but not quite as good as) OTP.

I am not the only one to use JavaScript for AI and robotics. There is an active community of JavaScript robotic enthusiasts called [NodeBots](http://nodebots.io/).

I recommend getting started with Node.js and Raspberry Pi with this [AdaFruit tutorial](https://learn.adafruit.com/node-embedded-development/installing-node-dot-js) except don't install it like they do. Apt-get is way out of date. I have found that [n](https://github.com/tj/n) for Node.js version management works well on the Raspberry Pi.

### [Atom.io](http://atom.io/)

I am using GitHub's Atom.io code editor on Mac to write the JavaScript. I recommend the [remote-atom](https://atom.io/packages/remote-atom) plugin to easily sync the code files to the Raspberry Pi.

### Reverse-Engineering the YUV Image Format

The Raspberry Pi camera can output uncompressed files in [YUV format](https://en.wikipedia.org/wiki/YUV) that are easier to analyze with than JPEGs, once you know what all the ones and zeros mean. I had some fun using [Hex Fiend](http://ridiculousfish.com/hexfiend/) to edit the raw files, then converted them to JPEG with [ImageMagick](http://www.imagemagick.org/script/index.php) to view the effects.

#### [ImageMagick](http://www.imagemagick.org/script/index.php)

I use ImageMagick to convert YUV image data to something viewable to aid in reverse-engineering the raw format. I installed using the Homebrew package.

    convert -size "64x48" -depth 8 yuv:test.raw conv.jpg

#### [Hex Fiend](http://ridiculousfish.com/hexfiend/)

This hex editor seems to work fine on OSX. Installed with Homebrew.
