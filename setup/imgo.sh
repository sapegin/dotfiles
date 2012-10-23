#!/bin/bash

# Installs imgo CLI image optimizer
# https://github.com/imgo/imgo


brew install exiftool imagemagick optipng libjpeg gifsicle

formulas='pngout.rb  defluff.rb cryopng.rb imgo.rb'
for package in $formulas
do
  brew install "https://raw.github.com/imgo/imgo-tools/master/Formula/"$package
done
