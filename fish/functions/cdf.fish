function cdf -d "cd into whatever is the forefront Finder window"
    cd (osascript -e 'tell app "Finder" to POSIX path of (insertion location as alias)')
end
