FROM node:6.9.1
MAINTAINER nighca "nighca@live.cn"

WORKDIR /fec

# configure npm
RUN npm config set registry https://registry.npm.taobao.org/

# install yarn
RUN npm i yarn -g

# update npm
# https://github.com/npm/npm/issues/14042
# RUN curl -L https://npmjs.org/install.sh | sh

# copy config files
COPY ./package.json ./
# COPY ./npm-shrinkwrap.json ./
COPY ./yarn.lock ./

# install packages
# RUN npm install
RUN yarn install

# expose port
EXPOSE 80

# copy other files (input files, generated files, script files)
COPY ./lib ./lib
COPY ./preset-configs ./preset-configs
COPY ./cmd.sh ./cmd.sh

# run script
CMD ["/fec/cmd.sh"]
