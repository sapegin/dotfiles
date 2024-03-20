local wezterm = require 'wezterm'
local config = wezterm.config_builder()

--- 8< -- 8< ---

-- Fonts
local font = 'MonoLisa'
config.font = wezterm.font(font, { weight = 'Regular', italic = false })
config.font_rules = {
	{
		intensity = 'Bold',
		font = wezterm.font(font, { italic = false, weight = 'Bold' }),
	},
  }

-- Disable font ligatures
config.harfbuzz_features = { 'calt=1', 'clig=0', 'liga=0', 'zero', 'ss01' }

-- Colors
-- https://github.com/sapegin/squirrelsong
config.colors = {
	foreground = '#9e8a74',
	background = '#352a21',

	cursor_bg = '#9e8a74',
	cursor_fg = '#352a21',
	cursor_border = '#9e8a74',

	selection_fg = '#9e8a74',
	selection_bg = '#564538',

	ansi = {
		'#352a21',
		'#ac493e',
		'#558240',
		'#ceb250',
		'#5d99cb',
		'#7f61b3',
		'#4f9593',
		'#c4a389',
	},

	brights = {
		'#6b503c',
		'#db7666',
		'#73a15c',
		'#e2c54c',
		'#64a1d3',
		'#a08ac2',
		'#adccc5',
		'#dcd5c0',
	},

	tab_bar = {
		background = '#352a21',
		active_tab = {
			bg_color = '#574131',
			fg_color = '#c4a389',
			intensity = 'Bold',
		},
		inactive_tab = {
			bg_color = '#352a21',
			fg_color = '#9e8a74',
		},
		inactive_tab_hover = {
			bg_color = '#453327',
			fg_color = '#c4a389',
		},
		new_tab = {
			bg_color = '#352a21',
			fg_color = '#9e8a74',
		},
		new_tab_hover = {
			bg_color = '#453327',
			fg_color = '#c4a389',
		},
	}
}

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

	-- Disable some default hotkeys
	{
		key = 'Enter',
		mods = 'OPT',
		action = wezterm.action.DisableDefaultAssignment,
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

-- Misc
config.adjust_window_size_when_changing_font_size = false
config.audible_bell = 'Disabled'
config.bold_brightens_ansi_colors = 'No'
config.color_scheme = 'AdventureTime'
config.cursor_thickness = 2
config.default_cursor_style = 'SteadyBar'
config.default_cwd = wezterm.home_dir
config.font_size = 15
config.hyperlink_rules = wezterm.default_hyperlink_rules()
config.inactive_pane_hsb = { saturation = 1.0, brightness = 0.8}
config.scrollback_lines = 10000
config.show_new_tab_button_in_tab_bar = false
config.switch_to_last_active_tab_when_closing_tab = true
config.tab_max_width = 60
config.use_fancy_tab_bar = false
config.window_close_confirmation = 'NeverPrompt'
config.window_padding = { left = 8, right = 8, top = 4, bottom = 4}

local function get_current_working_dir(tab)
	local current_dir = tab.active_pane and tab.active_pane.current_working_dir or { file_path = '' }
	local HOME_DIR = string.format('file://%s', os.getenv('HOME'))

	return current_dir == HOME_DIR and '.'
	or string.gsub(current_dir.file_path, '(.*[/\\])(.*)', '%2')
end

-- Set tab title to the current working directory
wezterm.on('format-tab-title', function(tab, tabs, panes, config, hover, max_width)
	local index = tonumber(tab.tab_index) + 1
	return string.format('  %s•%s  ', index, get_current_working_dir(tab))
end)

-- Set window title to the current working directory
wezterm.on('format-window-title', function(tab, pane, tabs, panes, config)
	return get_current_working_dir(tab)
end)

-- Set the correct window size at the startup
wezterm.on('gui-startup', function(cmd)
	local active_screen = wezterm.gui.screens()["active"]
	local _, _, window = wezterm.mux.spawn_window(cmd or {})

	if active_screen.width < 2560 then
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
