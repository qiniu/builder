#!/bin/bash

set -o errexit

sudo npm link

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
