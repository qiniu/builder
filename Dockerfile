FROM fec-builder-base
MAINTAINER nighca "nighca@live.cn"

WORKDIR /fec

# copy files (input files, generated files, script files)
COPY ./ ./

# run script
CMD ["/fec/cmd.sh"]
