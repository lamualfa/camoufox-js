import { type BrowserServer } from "playwright-core";
import type { CamoufoxPaths } from "./pkgman.js";
import { type LaunchOptions } from "./utils.js";
export declare function launchServer({ port, ws_path, ...options }: LaunchOptions | {
    port?: number;
    ws_path?: string;
    paths?: CamoufoxPaths;
}): Promise<BrowserServer>;
