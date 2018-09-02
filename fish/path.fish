# Prepend $PATH
function _prepend_path
    set -g fish_user_paths $argv $fish_user_paths
end

# Construct $PATH
# 1. Default paths
# 2. ./node_modules/.bin - shorcut to run locally installed Node bins
# 3. Custom bin folder for n, Ruby, CoreUtils, dotfiles, etc.
[ -d "$N_PREFIX/bin" ]; and _prepend_path "$N_PREFIX/bin"
[ -d /usr/local/bin ]; and _prepend_path "/usr/local/bin"
[ -d /usr/local/opt/ruby/bin ]; and _prepend_path "/usr/local/opt/ruby/bin"
[ -d /usr/local/opt/coreutils/libexec/gnubin ]; and _prepend_path "/usr/local/opt/coreutils/libexec/gnubin"
[ -d ~/dotfiles/bin ]; and _prepend_path "$HOME/dotfiles/bin"
[ -d ~/bin ]; and _prepend_path "$HOME/bin"
