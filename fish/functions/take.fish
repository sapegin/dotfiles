function take --wraps mkdir -d "Create a directory and cd into it"
	command mkdir -p $argv
		if test $status = 0
			switch $argv[(count $argv)]
				case '-*'
				case '*'
					cd $argv[(count $argv)]
					return
		end
	end
end
