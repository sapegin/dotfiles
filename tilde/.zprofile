# If the shell cannot write to the default XDG state directory, move transient
# shell-manager state into /tmp:
# - fnm creates a per-shell "multishell" directory under XDG_STATE_HOME.
# - In sandboxed runners, the default location (~/.local/state) may be read-only
#   or blocked.
# - /tmp is writable in those environments, so fnm can still expose node,
#   corepack, and pnpm correctly.
# - This only changes ephemeral runtime state; it does not move your actual
#   installed Node versions.
if [[ ! -w "${XDG_STATE_HOME:-$HOME/.local/state}" ]]; then
  export XDG_STATE_HOME=/tmp
fi

# Make the normal shell PATH setup available to login/non-interactive shells too
# (such as ones used by AI agents). This should make all the necessary tooling
# (such as corepack and pnpm) working correctly in those shells. In short: this
# keeps shell tooling consistent between human and machine use.
source ~/dotfiles/zsh/path.zsh
