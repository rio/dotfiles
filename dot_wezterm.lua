local wezterm = require("wezterm")

function scheme_for_appearance(appearance)
	if appearance:find("Dark") then
		return "Catppuccin Macchiato"
	else
		return "Catppuccin Latte"
	end
end

if wezterm.config_builder then
	config = wezterm.config_builder()

	config.color_scheme = scheme_for_appearance(wezterm.gui.get_appearance())
	config.hide_tab_bar_if_only_one_tab = true
	config.window_decorations = "NONE"
	config.window_background_opacity = 0.8
end

return config
