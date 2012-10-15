# Installs/updates Sublime packages from GitHub

if [ `uname` == 'Darwin' ]; then
	cd ~/Library/Application\ Support/Sublime\ Text\ 2/Packages
else
	cd ~/AppData/Roaming/Sublime\ Text\ 2/Packages
fi

# Emmet (ex. Zen Coding)
if [ -d ./emmet-sublime ]; then
	echo "Updating Emmet..."
	cd emmet-sublime
	git pull
	cd ..
else
	echo "Installing Emmet..."
	git clone git://github.com/sergeche/emmet-sublime.git
fi

# Hayaku Bundle
if [ -d ./hayaku ]; then
	echo "Updating Hayaku Bundle..."
	cd hayaku
	git pull
	git submodule update
	cd ..
else
	echo "Installing Hayaku Bundle..."
	git clone -b sublime-master git://github.com/hayaku/hayaku.git --recursive
fi
