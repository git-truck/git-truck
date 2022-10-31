#!/bin/bash
# Note: tested on Mac OS and Linux
docker build -t gt .
docker run --rm -it -u (id -u) -v (pwd):(pwd) -w (pwd) -p 3000:3000 gt /usr/app/node_modules/.bin/git-truck --headless 


