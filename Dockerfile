#
FROM node:18

# Duplicate deb line as deb-src
RUN cat /etc/apt/sources.list | sed "s/^deb\ /deb-src /" >> /etc/apt/sources.list

# Install common build utilities
RUN apt update
RUN DEBIAN_FRONTEND=noninteractive apt install -yy eatmydata
RUN DEBIAN_FRONTEND=noninteractive eatmydata \
    apt install -y --no-install-recommends \
        fish \
        git \
        zile

# We can't set the USER/UID as the source docker image already maps
# stuff to something.

WORKDIR /usr/app
RUN npm install git-truck
