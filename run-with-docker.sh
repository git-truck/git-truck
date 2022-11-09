#!/bin/bash

docker run --rm -it -u `id -u` -v `pwd`:`pwd` -w `pwd` -p 3000:3000  gittruck/git-truck /usr/app/node_modules/.bin/git-truck --headless

# Alternatively, if you want to build locally before running, comment out the above line and uncomment the two lines below:
# docker build -t gt .
# docker run --rm -it -u `id -u` -v `pwd`:`pwd` -w `pwd` -p 3000:3000 gt /usr/app/node_modules/.bin/git-truck --headless

# Note: Above tested on Mac OS, Linux and Windows MINGW64


