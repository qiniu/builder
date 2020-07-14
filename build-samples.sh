#!/bin/bash

set -o errexit

sudo npm link

sudo chown -R circleci samples

cd samples
for dir in `ls .`
do
  if [ -d $dir ]; then
    echo "Prepare samples/$dir"
    cd $dir
    if [ -f fec-test.sh ]; then
      . fec-test.sh
    else
        echo "Skip the samples/$dir"
    fi
    cd ..
  fi
done
