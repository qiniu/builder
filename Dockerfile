FROM node:6.9.1
LABEL maintainer="nighca@live.cn"

WORKDIR /fec

# provide both npm 5.x & yarn for user

# prepare for npm upgrade https://github.com/npm/npm/issues/9863
RUN cd $(npm root -g)/npm \
  && npm install fs-extra \
  && sed -i -e s/graceful-fs/fs-extra/ -e s/fs\.rename/fs.move/ ./lib/utils/rename.js
# upgrade npm
RUN npm install -g npm@5.4.2

RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak && \
    echo "deb http://deb.debian.org/debian/ jessie main" >/etc/apt/sources.list && \
    echo "deb-src http://deb.debian.org/debian/ jessie main" >>/etc/apt/sources.list && \
    echo "deb http://security.debian.org/ jessie/updates main" >>/etc/apt/sources.list && \
    echo "deb-src http://security.debian.org/ jessie/updates main" >>/etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian jessie-backports main" >>/etc/apt/sources.list && \
    echo "deb-src http://archive.debian.org/debian jessie-backports main" >>/etc/apt/sources.list && \
    echo "Acquire::Check-Valid-Until "false";" >>/etc/apt/apt.conf

# install yarn (https://yarnpkg.com/en/docs/install#linux-tab)
RUN apt-get update && apt-get install -y apt-transport-https
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y yarn

RUN cd /fec

# copy config files & install dependencies
COPY ./package.json ./
COPY ./npm-shrinkwrap.json ./
RUN npm install

# expose port
EXPOSE 80

# copy other files
COPY ./bin ./bin
COPY ./lib ./lib
COPY ./preset-configs ./preset-configs
COPY ./cmd.sh ./cmd.sh

# use bash instead of sh to support usage of source
RUN rm /bin/sh && ln -sf /bin/bash /bin/sh

# run script
CMD ["/fec/cmd.sh"]
