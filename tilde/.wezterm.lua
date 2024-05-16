local wezterm = require 'wezterm'
local config = wezterm.config_builder()

--- 8< -- 8< ---

-- Fonts
local font = 'MonoLisa'
config.font = wezterm.font_with_fallback({
	{ family = font, weight = 'Regular', italic = false },
  { family = 'Symbols Nerd Font Mono', scale = 1 },
})
config.font_rules = {
	{
		intensity = 'Bold',
		font = wezterm.font_with_fallback({
			{ family = font, weight = 'Regular', italic = false, weight = 'Bold' },
			{ family = 'Symbols Nerd Font Mono', scale = 1 },
		}),
  }
}

-- Disable font ligatures
config.harfbuzz_features = { 'calt=1', 'clig=0', 'liga=0', 'zero', 'ss01' }

-- Colors
local colors = require 'squirrelsong-dark'
config.colors = colors

config.window_frame = {
	font = wezterm.font { family = font, weight = 'Bold' },
	font_size = 15,
	-- Fancy tab bar
	active_titlebar_bg = '#574131',
	inactive_titlebar_bg = '#352a21',
}

-- Command Palette
config.command_palette_rows = 7
config.command_palette_font_size = 15
config.command_palette_bg_color = "#44382D"
config.command_palette_fg_color = "#c4a389"

-- Hot keys
config.keys = {
	-- Make Page up/down work
	{ key = 'PageUp', action = wezterm.action.ScrollByPage(-1) },
	{ key = 'PageDown', action = wezterm.action.ScrollByPage(1) },

	-- Pane splitting
	{
		key = 'd',
		mods = 'CMD',
		action = wezterm.action.SplitHorizontal({ domain = 'CurrentPaneDomain' }),
	},
	{
		key = 'w',
		mods = 'CMD',
		action = wezterm.action.CloseCurrentPane({ confirm = false }),
	},

	-- Switch between tabs
	{
		key = 'LeftArrow',
		mods = 'CMD|ALT',
		action = wezterm.action.ActivateTabRelative(-1),
	},
	{
		key = 'RightArrow',
		mods = 'CMD|ALT',
		action = wezterm.action.ActivateTabRelative(1),
	},

	-- Switch between panes
	{
		key = 'LeftArrow',
		mods = 'CMD|SHIFT',
		action = wezterm.action.ActivatePaneDirection('Prev'),
	},
	{
		key = 'RightArrow',
		mods = 'CMD|SHIFT',
		action = wezterm.action.ActivatePaneDirection('Next'),
	},

	-- Jump word to the left
	{
		key = 'LeftArrow',
		mods = 'OPT',
		action = wezterm.action.SendKey({
		key = 'b',
		mods = 'ALT',
		}),
	},
	-- Jump word to the right
	{
		key = 'RightArrow',
		mods = 'OPT',
		action = wezterm.action.SendKey({ key = 'f', mods = 'ALT' }),
	},

	-- TODO: Select character to the left
	{
		key = 'LeftArrow',
		mods = 'SHIFT',
		action = wezterm.action.DisableDefaultAssignment,
	},
	-- TODO: Select character to the right
	{
		key = 'RightArrow',
		mods = 'SHIFT',
		action = wezterm.action.DisableDefaultAssignment,
	},

	-- Go to beginning of line
	{
		key = 'LeftArrow',
		mods = 'CMD',
		action = wezterm.action.SendKey({
		key = 'a',
		mods = 'CTRL',
		}),
	},
	-- Go to end of line
	{
		key = 'RightArrow',
		mods = 'CMD',
		action = wezterm.action.SendKey({ key = 'e', mods = 'CTRL' }),
	},

	-- Case-insensitive search
	{
		key = 'f',
		mods = 'CMD',
		action = wezterm.action.Search({ CaseInSensitiveString = '' }),
	},

	-- Open WezTerm config file quickly
  {
		key = ',',
		mods = 'CMD',
		action = wezterm.action.SpawnCommandInNewTab {
			cwd = os.getenv('WEZTERM_CONFIG_DIR'),
			set_environment_variables = {
				TERM = 'screen-256color',
			},
			args = {
				'/Applications/CotEditor.app/Contents/MacOS/CotEditor',
				os.getenv('WEZTERM_CONFIG_FILE'),
			},
		},
	},

	-- Disable some default hotkeys
	{
		key = 'Enter',
		mods = 'OPT',
		action = wezterm.action.DisableDefaultAssignment,
	},

	-- Rename tab title
	{
		key = 'R',
		mods = 'CMD|SHIFT',
		action = wezterm.action.PromptInputLine {
			description = 'Enter new name for tab',
			action = wezterm.action_callback(function(window, _, line)
				-- line will be `nil` if they hit escape without entering anything
				-- An empty string if they just hit enter
				-- Or the actual line of text they wrote
				if line then
					window:active_tab():set_title(line)
				end
			end),
		},
	},
}

-- Mouse
config.mouse_bindings = {
	-- Change the default click behavior so that it only selects
	-- text and doesn't open hyperlinks
	{
		event = { Up = { streak = 1, button = 'Left' } },
		mods = 'NONE',
		action = wezterm.action.CompleteSelection('ClipboardAndPrimarySelection'),
	},

	-- Open links on Cmd+click
	{
		event = { Up = { streak = 1, button = 'Left' } },
		mods = 'CMD',
		action = wezterm.action.OpenLinkAtMouseCursor,
	},
  }

-- Visual bell
config.audible_bell = 'Disabled'
config.visual_bell = {
	target = "CursorColor",
	fade_in_function = "EaseIn",
	fade_in_duration_ms = 150,
	fade_out_function = "EaseOut",
	fade_out_duration_ms = 300,
}

-- Misc
config.adjust_window_size_when_changing_font_size = false
config.bold_brightens_ansi_colors = 'No'
config.cursor_thickness = 2
config.default_cursor_style = 'SteadyBar'
config.default_cwd = wezterm.home_dir
config.font_size = 15
config.hyperlink_rules = wezterm.default_hyperlink_rules()
config.inactive_pane_hsb = { saturation = 1.0, brightness = 0.8}
config.line_height = 1.1
config.scrollback_lines = 10000
config.show_new_tab_button_in_tab_bar = false
config.switch_to_last_active_tab_when_closing_tab = true
config.tab_max_width = 60
config.use_fancy_tab_bar = false
config.window_close_confirmation = 'NeverPrompt'
config.window_decorations = "INTEGRATED_BUTTONS|RESIZE"
config.window_padding = { left = 8, right = 8, top = 12, bottom = 8}

local function get_current_working_dir(tab)
	local current_dir = tab.active_pane and tab.active_pane.current_working_dir or { file_path = '' }
	local HOME_DIR = string.format('file://%s', os.getenv('HOME'))

	return current_dir == HOME_DIR and '.'
	or string.gsub(current_dir.file_path, '(.*[/\\])(.*)', '%2')
end

-- Set tab title to the one that was set via `tab:set_title()`
-- or fall back to the current working directory as a title
wezterm.on('format-tab-title', function(tab, tabs, panes, config, hover, max_width)
	local index = tonumber(tab.tab_index) + 1
	local custom_title = tab.tab_title
	local title = get_current_working_dir(tab)

	if custom_title and #custom_title > 0 then
		title = custom_title
	end

	return string.format('  %s•%s  ', index, title)
end)

-- Set window title to the current working directory
wezterm.on('format-window-title', function(tab, pane, tabs, panes, config)
	return get_current_working_dir(tab)
end)

-- Set the correct window size at the startup
wezterm.on('gui-startup', function(cmd)
	local active_screen = wezterm.gui.screens()["active"]
	local _, _, window = wezterm.mux.spawn_window(cmd or {})

	-- MacBook Pro 14" 2023
	if active_screen.width <= 3024 then
		-- Laptop: open full screen
		window:gui_window():maximize()
	else
		-- Desktop: place on the right half of the screen
		window:gui_window():set_position(active_screen.width / 2, 0)
		window:gui_window():set_inner_size(active_screen.width / 2, active_screen.height)
	end
end)

--- 8< -- 8< ---

return config
