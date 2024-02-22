#!/bin/bash

# Installs Visual Studio Code extensions
# code --list-extensions

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

brew install --cask visual-studio-code

# Check that Code command line tool is installed
command -v code > /dev/null 2>&1 || {
	error "Run “Install 'code' command in PATH” from the command palette (View → Command Palette)"
	exit 1
}

code --install-extension astro-build.astro-vscode
code --install-extension ban.spellright
code --install-extension bibhasdn.unique-lines
code --install-extension Catppuccin.catppuccin-vsc-icons
code --install-extension dbaeumer.vscode-eslint
code --install-extension EditorConfig.EditorConfig
code --install-extension esbenp.prettier-vscode
code --install-extension fabiospampinato.vscode-highlight
code --install-extension github.copilot
code --install-extension GraphQL.vscode-graphql-syntax
code --install-extension lafe.contextualduplicate
code --install-extension mdickin.markdown-shortcuts
code --install-extension naumovs.color-highlight
code --install-extension sapegin.Theme-SquirrelsongLight
code --install-extension SonarSource.sonarlint-vscode
code --install-extension styled-components.vscode-styled-components
code --install-extension zhengxiaoyao0716.intelligence-change-case
code --install-extension znck.grammarly
