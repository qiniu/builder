FROM daocloud.io/nighca/fec-builder-base:webpack2-44c6340
MAINTAINER nighca "nighca@live.cn"

WORKDIR /fec

# copy files (input files, generated files, script files)
COPY ./ ./

# run script
CMD ["/fec/cmd.sh"]
