/* global user_pref */
// Docs: https://github.com/arkenfox/user.js/blob/master/user.js

////////
// UI //
////////

// Disable annoying tooltips for
user_pref('browser.tabs.hoverPreview.enabled', false);
// Don't show warning on about:config
user_pref('browser.aboutConfig.showWarning', false);
// Disable downloads panel opening on every download
user_pref('browser.download.alwaysOpenPanel', false);
// Don't add new downloads to recent documents list
user_pref('browser.download.manager.addToRecentDocs', false);
// Open previous windows and tabs on restart
user_pref('browser.startup.page', 3);
// Don't check whether Firefox is a default browser
// (I use Choosy to switch between browsers)
user_pref('browser.shell.checkDefaultBrowser', false);
// Disable websites overriding Firefox's keyboard shortcuts
// 0 (default) or 1=allow, 2=block
// Add site exceptions: Ctrl+I>Permissions>Override Keyboard Shortcuts
user_pref('permissions.default.shortcuts', 2);
// Allow UI customizations with userChrome.css
user_pref('toolkit.legacyUserProfileCustomizations.stylesheets', true);
// Block autoplay in tabs until selected
user_pref('media.block-autoplay-until-in-foreground', true);
user_pref('media.block-play-until-document-interaction', true);
user_pref('media.block-play-until-visible', true);
// Ask for confirmation when closing a window
user_pref('browser.warnOnQuit', true);
// Ask for confirmation when closing a window with multiple tabs
user_pref('browser.tabs.warnOnClose', true);
// Don't close the window when closing the last tab
user_pref('browser.tabs.closeWindowWithLastTab', false);
// Set monospace font
user_pref('font.name.monospace.x-western', 'Monolisa');

// ??? Enable using system accent colors
user_pref('widget.non-native-theme.use-theme-accent', true);
// ??? Disable overscroll animation
user_pref('apz.overscroll.enabled', false);

/////////////////
// Development //
/////////////////

// Enable remote debugging (useful for debugging userChrome.css)
user_pref('devtools.chrome.enabled', true);
user_pref('devtools.debugger.remote-enabled', true);
user_pref('devtools.debugger.prompt-connection', false);

//////////////////////////////
// Security and performance //
//////////////////////////////

// Disable "Sync and save data"
user_pref('identity.fxaccounts.enabled', false);
// Disable Pocket extension
user_pref('extensions.pocket.enabled', false);
// Disable AI chatbot
user_pref('browser.ml.chat.enabled', false);
// Disable some Telemetry
user_pref('datareporting.healthreport.service.enabled', false);
user_pref('datareporting.healthreport.uploadEnabled', false);
user_pref('datareporting.policy.dataSubmissionEnabled', false);
user_pref('toolkit.telemetry.unified', false);
user_pref('toolkit.telemetry.enabled', false);
user_pref('toolkit.telemetry.server', 'data:,');
user_pref('toolkit.telemetry.archive.enabled', false);
user_pref('toolkit.telemetry.newProfilePing.enabled', false);
user_pref('toolkit.telemetry.shutdownPingSender.enabled', false);
user_pref('toolkit.telemetry.updatePing.enabled', false);
user_pref('toolkit.telemetry.bhrPing.enabled', false);
user_pref('toolkit.telemetry.firstShutdownPing.enabled', false);
user_pref('toolkit.telemetry.coverage.opt-out', true);
user_pref('toolkit.coverage.opt-out', true);
user_pref('toolkit.coverage.endpoint.base', '');
// Disable Normandy/Shield (Shield is a telemetry system that can push and test "recipes")
user_pref('app.normandy.enabled', false);
user_pref('app.normandy.api_url', '');
// Disable studies
user_pref('app.shield.optoutstudies.enabled', false);
// Disable recommendation pane in about:addons (uses Google Analytics)
user_pref('extensions.getAddons.showPane', false);
// Disable recommendations in about:addons' Extensions and Themes panes
user_pref('extensions.htmlaboutaddons.recommendations.enabled', false);
// Don't recommend extensions as you browse (doesn't seem to work)
user_pref('browser.newtabpage.activity-stream.asrouter.userprefs.cfr', false);
// Don't recommend  features as you browse
user_pref(
	'browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features',
	false
);
// Disable shopping experience
// https://bugzilla.mozilla.org/show_bug.cgi?id=1840156#c0
user_pref('browser.shopping.experience2023.enabled', false);
// Disable Crash Reports
user_pref('breakpad.reportURL', '');
user_pref('browser.tabs.crashReporting.sendReport', false);
// Disable Firefox Data Collection and Allow Firefox to send backlogged crash reports
user_pref('browser.crashReports.unsubmittedCheck.autoSubmit2', false);
// Disable urlbar trending search suggestions
user_pref('browser.urlbar.trending.featureGate', false);
// Disable urlbar suggestions
user_pref('browser.urlbar.addons.featureGate', false);
user_pref('browser.urlbar.fakespot.featureGate', false);
user_pref('browser.urlbar.mdn.featureGate', false);
user_pref('browser.urlbar.pocket.featureGate', false);
user_pref('browser.urlbar.weather.featureGate', false);
user_pref('browser.urlbar.yelp.featureGate', false);
// Enable ETP Strict Mode
// ETP Strict Mode enables Total Cookie Protection (TCP)
// Adding site exceptions disables all ETP protections for that site and increases the risk of
// cross-site state tracking e.g. exceptions for SiteA and SiteB means PartyC on both sites is shared
//  https://blog.mozilla.org/security/2021/02/23/total-cookie-protection/
// Add site exceptions: Urlbar>ETP Shield
// Manage site exceptions: Options>Privacy & Security>Enhanced Tracking Protection>Manage Exceptions
user_pref('browser.contentblocking.category', 'strict');
// Enforce Firefox extension blocklist, which includes updates for "revoked certificates"
// https://blog.mozilla.org/security/2015/03/03/revoking-intermediate-certificates-introducing-onecrl/
user_pref('extensions.blocklist.enabled', true);
