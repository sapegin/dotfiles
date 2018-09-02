function sudo!! -e "Run previous command as sudo user"
    echo "sudo $history[1]"
    echo
    eval sudo $history[1]
end
