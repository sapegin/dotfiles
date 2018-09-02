function fish_title --description "Set current directory name as a terminal title"
    if [ $_ = 'fish' ]
        echo (basename (pwd))
    	if [ $SSH_CONNECTION ]
            echo " — "(prompt_hostname)
        end
    else
        echo $_
    end
end
