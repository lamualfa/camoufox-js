export {
	addDefaultAddons,
	confirmPaths,
	DefaultAddons,
	downloadAndExtract,
	maybeDownloadAddons,
} from "./addons.js";
export {
	type CamoufoxPaths,
	getDefaultInstallationDirectory,
	getDefaultExecutableNames,
	getDefaultDataDirectory,
} from "./pkgman.js";
export { launchServer } from "./server.js";
export { Camoufox, NewBrowser } from "./sync_api.js";
export { type LaunchOptions, launchOptions } from "./utils.js";
