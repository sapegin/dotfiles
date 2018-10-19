#
# Simplified Git branch and status
#

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

SPACESHIP_GIT_SIMPLE_CLEAN_SYMBOL="${SPACESHIP_GIT_SIMPLE_CLEAN_SYMBOL=☀}"
SPACESHIP_GIT_SIMPLE_DIRTY_SYMBOL="${SPACESHIP_GIT_SIMPLE_DIRTY_SYMBOL=☂}"
SPACESHIP_GIT_SIMPLE_CLEAN_COLOR="${SPACESHIP_GIT_SIMPLE_CLEAN_COLOR="green"}"
SPACESHIP_GIT_SIMPLE_DIRTY_COLOR="${SPACESHIP_GIT_SIMPLE_DIRTY_COLOR="red"}"

# ------------------------------------------------------------------------------
# Section
# ------------------------------------------------------------------------------

spaceship_git_simple() {
  [[ $SPACESHIP_GIT_SIMPLE_SHOW == false ]] && return

  spaceship::is_git || return

  # Get the branch name
  local git_current_branch="$vcs_info_msg_0_"
  [[ -z "$git_current_branch" ]] && return

  git_current_branch="${git_current_branch#heads/}"
  git_current_branch="${git_current_branch/.../}"

  # Check if the repo is dirty
  local is_dirty=$(git status -s --ignore-submodules=dirty 2> /dev/null)

  local COLOR="$SPACESHIP_GIT_SIMPLE_CLEAN_COLOR"
  local SYMBOL="$SPACESHIP_GIT_SIMPLE_CLEAN_SYMBOL"
  if [[ -n "$is_dirty" ]]; then
    COLOR="$SPACESHIP_GIT_SIMPLE_DIRTY_COLOR"
    SYMBOL="$SPACESHIP_GIT_SIMPLE_DIRTY_SYMBOL"
  fi

  spaceship::section \
    "$COLOR" \
    "$SYMBOL ${git_current_branch}"
}
