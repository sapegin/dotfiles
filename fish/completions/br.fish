function _git_branches
    # This is much faster than using `git branch`,
    # and avoids having to deal with localized "detached HEAD" messages.
    command git for-each-ref --format='%(refname)' refs/heads/ refs/remotes/ 2>/dev/null \
        | string replace -r '^refs/heads/(.*)$' '$1\tLocal Branch' \
        | string replace -r '^refs/remotes/(.*)$' '$1\tRemote Branch'
end

complete --no-files --command br --short d -d "Delete local branch"
complete --no-files --command br --short D -d "Delete remote branch"
complete --no-files --command br --arguments '(_git_branches)'
