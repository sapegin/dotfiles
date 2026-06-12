# Do not overwrite files when redirecting using ">". Note that you can still
# override this with ">|"
set -o noclobber

# Enable extended glob
setopt extendedglob
# Case insensitive globbing (to mimic macOS file system behavior)
setopt no_case_glob

# Allow comments in interactive shells (like Bash does)
setopt interactive_comments

# Remove older duplicate entries from history
setopt hist_ignore_all_dups
# Remove superfluous blanks from history items
setopt hist_reduce_blanks
# Don't store commands prefixed with a space
setopt hist_ignore_space
# Show command with history expansion to user before running it
setopt hist_verify

# Hide the inverse "%" partial-line marker that cmux leaves above the prompt on
# session switch (standalone Ghostty doesn't show it).
setopt no_prompt_sp

# Move cursor to end if word had one match
setopt always_to_end
# Required for menu selection (see zsh/complist)
setopt menucomplete
