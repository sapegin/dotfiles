# Squirrelsong color theme

[Squirrelsong](https://sapegin.me/squirrelsong/) is my custom color theme that I use everywhere: ligth and dark.

## Bat

![Squirrelsong Dark in Bat](https://github-production-user-asset-6210df.s3.amazonaws.com/70067/259703583-8322747d-45f8-427b-9721-20d0c9987e50.png)

```shell
bat cache --build
```

[More info in the Bat docs](https://github.com/sharkdp/bat#adding-new-themes)

**Note:** The theme is included in [the Zsh config](../zsh/env.zsh).

## Bear

Run this command after each Bear update:

```shell
sudo command rm "/Applications/Bear.app/Contents/Frameworks/BearCore.framework/Resources/Ayu.theme"
sudo command cp "$HOME/_/squirrelsong/themes/Bear/Squirrelsong Light.theme" "/Applications/Bear.app/Contents/Frameworks/BearCore.framework/Resources/Ayu.theme"
```

## JetBrains

![Squirrelsong light in WebStorm](https://github.com/sapegin/squirrelsong/raw/master/themes/JetBrains/squirrelsong-light/screenshot.png)

[Download from Marketplace](https://plugins.jetbrains.com/plugin/22568-squirrelsong-light-theme)

## Visual Studio Code

![Squirrelsong light in Visual Studio Code](https://raw.githubusercontent.com/sapegin/squirrelsong/master/themes/VSCode/SquirrelsongLight/screenshots/screenshot.jpg)

[Download from Marketplace](https://marketplace.visualstudio.com/items?itemName=sapegin.Theme-SquirrelsongLight)

**Note:** The theme is included in the [config file](../vscode/User/settings.json).

## Ghostty

![Squirrelsong dark in Ghostty](https://github.com/sapegin/squirrelsong/raw/master/themes/Ghostty/screenshot-dark.jpg)

**Note:** The theme is included in [the Ghostty config](../tilde/.config/ghostty/config).
