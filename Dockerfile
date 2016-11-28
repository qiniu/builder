FROM fec-builder-base
MAINTAINER nighca "nighca@live.cn"

WORKDIR /fec

# install deps for input
# COPY ./input/package.json ./
# RUN npm install

# anywhere for test
# RUN npm install anywhere -g

# copy files (input files, generated files, script files)
COPY ./ ./

# run script
CMD ["/fec/cmd.sh"]
