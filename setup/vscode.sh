#!/bin/bash

# Installs Visual Studio Code extensions
# code --list-extensions

# Check that Code command line tool is installed
command -v code >/dev/null 2>&1 || { error "Run “Install 'code' command in PATH” from the command palette (View → Command Palette)"; exit 1; }

code --install-extension astro-build.astro-vscode
code --install-extension ban.spellright
code --install-extension bibhasdn.unique-lines
code --install-extension bungcip.better-toml
code --install-extension csharpier.csharpier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension EditorConfig.EditorConfig
code --install-extension esbenp.prettier-vscode
code --install-extension keesschollaart.vscode-home-assistant
code --install-extension lafe.contextualduplicate
code --install-extension mdickin.markdown-shortcuts
code --install-extension ms-dotnettools.csharp
code --install-extension naumovs.color-highlight
code --install-extension sapegin.Theme-SquirrelsongLight
code --install-extension SonarSource.sonarlint-vscode
code --install-extension zhengxiaoyao0716.intelligence-change-case
code --install-extension znck.grammarly
