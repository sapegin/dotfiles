# Iosevka font custom build

[Building from source](https://github.com/be5invis/Iosevka/blob/main/doc/custom-build.md)

1. Clone the repo:

```shell
git clone --depth 1 https://github.com/be5invis/Iosevka.git
cd Iosevka
```

2. Install dependencies:

```shell
brew install ttfautohint
npm install
```

3. Add [the config](./private-build-plans.toml) to the repository root.

4. Build:

```shell
npm run build -- ttf::IosevkaCustom
```
