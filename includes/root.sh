# Copyright 2009 Daniel Jackoway
# released under the MIT License
# see COPYING for the full text
function gitr {
while [ ! -d .git -a ! -f '.this_is_root' -a `pwd` != "/" ]
do
    cd "..";
done
}
