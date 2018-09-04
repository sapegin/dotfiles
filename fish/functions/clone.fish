function clone -a repo dir -d "Git clone, cd into it, npm install it"
    git clone --depth=1 $repo $dir
	if [ $dir ]
		cd $dir
	else
    	cd (basename $repo .git)
	end
    npm install
end
