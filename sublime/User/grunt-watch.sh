# Finds directory with `grunt.js` and runs `grunt watch`

cd_to_project_root() {
	dir=`pwd`
	while [ "$dir" != "/" ]; do
		if [ -f "$dir/grunt.js" ]; then
			cd "$dir"
			break
		fi
		dir=`dirname "$dir"`
	done
}

cd_to_project_root

grunt deploy --no-color --debug
grunt watch --no-color --debug