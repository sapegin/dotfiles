# Runs build system specified in `build_system` argument
# Based on http://www.bit-101.com/blog/?p=3439

import sublime_plugin


class RunBuildCommand(sublime_plugin.WindowCommand):
	def run(self, build_system):
		self.window.run_command("set_build_system", {"file": build_system})
		self.window.run_command("build")
		self.window.run_command("set_build_system")  # Automatic
