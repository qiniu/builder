FROM node:6.9.1
MAINTAINER nighca "nighca@live.cn"

WORKDIR /fec

# install yarn (https://yarnpkg.com/en/docs/install#linux-tab)
RUN apt-get update && apt-get install -y apt-transport-https
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y yarn

RUN cd /fec

# copy config files & install dependencies
COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn install

# expose port
EXPOSE 80

# copy other files
COPY ./bin ./bin
COPY ./lib ./lib
COPY ./preset-configs ./preset-configs
COPY ./cmd.sh ./cmd.sh

# run script
CMD ["/fec/cmd.sh"]
