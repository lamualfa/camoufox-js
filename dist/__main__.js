#!/usr/bin/env node
import { existsSync, rmSync } from "node:fs";
import { Command } from "commander";
import { DefaultAddons, maybeDownloadAddons } from "./addons.js";
import { ALLOW_GEOIP, downloadMMDB, removeMMDB } from "./locale.js";
import { CamoufoxFetcher, getDefaultInstallDir, getDefaultLaunchFile, getDefaultLocalData, installedVerStr, } from "./pkgman.js";
import { launchServer } from "./server.js";
import { Camoufox } from "./sync_api.js";
import { getAsBooleanFromENV } from "./utils.js";
class CamoufoxUpdate extends CamoufoxFetcher {
    currentVerStr;
    customPaths;
    constructor(paths) {
        super();
        this.customPaths = paths;
        this.currentVerStr = null;
        try {
            this.currentVerStr = installedVerStr(paths);
        }
        catch (error) {
            if (error instanceof Error && error.name === "FileNotFoundError") {
                this.currentVerStr = null;
            }
            else {
                throw error;
            }
        }
    }
    static async create(paths) {
        const updater = new CamoufoxUpdate(paths);
        await updater.init();
        return updater;
    }
    isUpdateNeeded() {
        if (getAsBooleanFromENV("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", false)) {
            console.log("Skipping browser download / update check due to PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD set!");
            return false;
        }
        return this.currentVerStr === null || this.currentVerStr !== this.verstr;
    }
    async update() {
        if (!this.isUpdateNeeded()) {
            console.log("Camoufox binaries up to date!");
            console.log(`Current version: v${this.currentVerStr}`);
            return;
        }
        if (this.currentVerStr !== null) {
            console.log(`Updating Camoufox binaries from v${this.currentVerStr} => v${this.verstr}`, "yellow");
        }
        else {
            console.log(`Fetching Camoufox binaries...`);
        }
        await this.install(this.customPaths);
    }
    async cleanup() {
        const installDir = this.customPaths?.installDir || getDefaultInstallDir();
        if (!existsSync(installDir)) {
            return false;
        }
        await rmSync(installDir, { recursive: true, force: true });
        console.log("Camoufox binaries removed!");
        return true;
    }
}
const program = new Command();
program
    .command("fetch")
    .option("-i, --install-dir <path>", "Custom installation directory")
    .option("-d, --data-dir <path>", "Custom data directory")
    .option("-l, --launch-file <path>", "Custom launch file path")
    .action(async (options) => {
    const customPaths = {};
    if (options.installDir) {
        customPaths.installDir = options.installDir;
    }
    if (options.dataDir) {
        customPaths.localData = options.dataDir;
    }
    if (options.launchFile) {
        // Parse launch file option in format "win:exe,mac:app,lin:bin"
        const launchFiles = {};
        options.launchFile.split(",").forEach((file) => {
            const [os, path] = file.split(":");
            if (os && path) {
                launchFiles[os.trim()] = path.trim();
            }
        });
        customPaths.launchFile = launchFiles;
    }
    const updater = await CamoufoxUpdate.create(customPaths);
    await updater.update();
    if (ALLOW_GEOIP) {
        downloadMMDB();
    }
    maybeDownloadAddons(DefaultAddons);
});
program.command("remove").action(async () => {
    const updater = await CamoufoxUpdate.create();
    if (!(await updater.cleanup())) {
        console.log("Camoufox binaries not found!", "red");
    }
    removeMMDB();
});
program
    .command("test")
    .argument("[url]", "URL to open", null)
    .action(async (url) => {
    const browser = await Camoufox({
        headless: false,
        env: process.env,
        config: { showcursor: true },
        humanize: 0.5,
        geoip: true,
    });
    const page = await browser.newPage();
    if (url) {
        await page.goto(url);
    }
    await page.pause();
});
program.command("server").action(async () => {
    const server = await launchServer({});
    console.log(`Camoufox server started at ${server.wsEndpoint()}`);
    console.log();
    console.log(`You can connect to it using Playwright's BrowserType.connect() method.`);
    console.log(`To stop the server, press Ctrl+C or close this terminal.`);
});
program
    .command("path")
    .option("-i, --install-dir <path>", "Custom installation directory")
    .option("-d, --data-dir <path>", "Custom data directory")
    .option("-l, --launch-file <path>", "Custom launch file path")
    .action((options) => {
    const customPaths = {};
    if (options.installDir) {
        customPaths.installDir = options.installDir;
    }
    if (options.dataDir) {
        customPaths.localData = options.dataDir;
    }
    if (options.launchFile) {
        // Parse launch file option in format "win:exe,mac:app,lin:bin"
        const launchFiles = {};
        options.launchFile.split(",").forEach((file) => {
            const [os, path] = file.split(":");
            if (os && path) {
                launchFiles[os.trim()] = path.trim();
            }
        });
        customPaths.launchFile = launchFiles;
    }
    const installDir = customPaths.installDir || getDefaultInstallDir();
    const localData = customPaths.localData || getDefaultLocalData();
    const launchFile = customPaths.launchFile || getDefaultLaunchFile();
    console.log(`Install Directory: ${installDir}`);
    console.log(`Data Directory: ${localData}`);
    console.log(`Launch Files: ${JSON.stringify(launchFile)}`);
});
program.command("version").action(async () => {
    try {
        const pkgVersion = require("pkg-version");
        console.log(`Pip package:\tv${pkgVersion("camoufox")}`);
    }
    catch (_error) {
        console.log("Pip package:\tNot installed!", "red");
    }
    const updater = await CamoufoxUpdate.create();
    const binVer = updater.currentVerStr;
    if (!binVer) {
        console.log("Camoufox:\tNot downloaded!", "red");
        return;
    }
    console.log(`Camoufox:\tv${binVer} `, "green", false);
    if (updater.isUpdateNeeded()) {
        console.log(`(Latest supported: v${updater.verstr})`, "red");
    }
    else {
        console.log("(Up to date!)", "yellow");
    }
});
program.parse(process.argv);
