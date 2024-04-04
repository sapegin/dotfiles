# Installs GUI apps
# https://formulae.brew.sh/cask/

# Common stuff
RED="$(tput setaf 1)"
UNDERLINE="$(tput sgr 0 1)"
NOCOLOR="$(tput sgr0)"
function error() { echo -e "$UNDERLINE$RED$1$NOCOLOR\n"; }

# Check that Homebrew is installed
command -v brew > /dev/null 2>&1 || {
	error "Homebrew not installed: https://brew.sh/"
	exit 1
}

# Apps
brew install --cask 1password
brew install --cask alfred
brew install --cask bartender
brew install --cask colorsnapper
brew install --cask coteditor
brew install --cask dash
brew install --cask devtoys
brew install --cask firefox
brew install --cask github # GitHub Desktop
brew install --cask kap
brew install --cask keka
brew install --cask microsoft-edge
brew install --cask mimestream
brew install --cask nimble-commander
brew install --cask notion
brew install --cask numi
brew install --cask optimage
brew install --cask quitter
brew install --cask rectangle
brew install --cask shottr
brew install --cask telegram
brew install --cask visual-studio-code
brew install --cask wezterm
brew install --cask whatsapp

# Fonts
brew tap homebrew/cask-fonts
brew install --cask font-symbols-only-nerd-font

# Extra apps
echo ""
echo "Install more apps if you need them:"
echo "brew install --cask adobe-creative-cloud"
echo "brew install --cask charles"
echo "brew install --cask choosy"
echo "brew install --cask daisydisk"
echo "brew install --cask gemini"
echo "brew install --cask kaleidoscope"
echo "brew install --cask messenger"
echo "brew install --cask rapidapi"
echo "brew install --cask replacicon"
echo "brew install --cask slack"
echo "brew install --cask zoom"

# Mac App Store apps
echo ""
echo "Install additional apps from Mac App Store:"
echo "https://github.com/sapegin/dotfiles/wiki/OS-X-Apps"
