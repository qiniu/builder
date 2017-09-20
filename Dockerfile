FROM node:6.9.1
MAINTAINER nighca "nighca@live.cn"

WORKDIR /fec

# prepare for npm upgrade https://github.com/npm/npm/issues/9863
RUN cd $(npm root -g)/npm \
  && npm install fs-extra \
  && sed -i -e s/graceful-fs/fs-extra/ -e s/fs\.rename/fs.move/ ./lib/utils/rename.js
# upgrade npm
RUN npm install -g npm@5.4.2

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

# run script
CMD ["/fec/cmd.sh"]
