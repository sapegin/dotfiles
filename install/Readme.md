# Dotfiles installer

Installs git, clones repository and symlinks dotfiles to your home directory

```bash
curl https://raw.github.com/sapegin/dotfiles/master/install/install.sh | bash
```


## Installing from subdomain

You can put it to subdomain on you hosting and use short path. For example:

```bash
curl dot.sapegin.me | bash
```

Copy install script to your public directory:

```bash
curl -O https://raw.github.com/sapegin/dotfiles/master/install/install.sh
```

And add to your `.htacess`:

```
RewriteEngine on
RewriteRule (.*) /install.sh [L]
```