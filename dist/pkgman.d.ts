import type { PathLike } from "node:fs";
import type { Writable } from "node:stream";
export interface CamoufoxPaths {
    /** Directory where Camoufox is installed */
    installDir?: PathLike;
    /** Directory containing local data files */
    localData?: PathLike;
    /** Launch file name for each OS */
    launchFile?: {
        [key: string]: string;
    };
}
export declare const OS_NAME: "mac" | "win" | "lin";
export declare const OS_ARCH_MATRIX: {
    [key: string]: string[];
};
export declare function getDefaultInstallDir(): PathLike;
export declare function getDefaultLocalData(): PathLike;
export declare function getDefaultLaunchFile(): {
    [key: string]: string;
};
export declare const INSTALL_DIR: PathLike;
export declare const LOCAL_DATA: PathLike;
export declare const LAUNCH_FILE: {
    [key: string]: string;
};
declare class Version {
    release: string;
    version?: string;
    sorted_rel: number[];
    constructor(release: string, version?: string);
    private buildSortedRel;
    get fullString(): string;
    equals(other: Version): boolean;
    lessThan(other: Version): boolean;
    isSupported(): boolean;
    static fromPath(filePath?: PathLike): Version;
    static isSupportedPath(path: PathLike): boolean;
    static buildMinMax(): [Version, Version];
}
export declare class GitHubDownloader {
    githubRepo: string;
    apiUrl: string;
    constructor(githubRepo: string);
    checkAsset(asset: any): any;
    missingAssetError(): void;
    getAsset({ retries }?: {
        retries: number;
    }): Promise<any>;
}
export declare class CamoufoxFetcher extends GitHubDownloader {
    arch: string;
    _version_obj?: Version;
    pattern: RegExp;
    _url?: string;
    constructor();
    init(): Promise<void>;
    checkAsset(asset: any): [Version, string] | null;
    missingAssetError(): void;
    static getPlatformArch(): string;
    fetchLatest(): Promise<void>;
    static downloadFile(url: string): Promise<Buffer>;
    extractZip(zipFile: string | Buffer, installDir?: PathLike): Promise<void>;
    static cleanup(installDir?: PathLike): boolean;
    setVersion(installDir?: PathLike): void;
    install(paths?: CamoufoxPaths): Promise<void>;
    get url(): string;
    get version(): string;
    get release(): string;
    get verstr(): string;
}
export declare function installedVerStr(paths?: CamoufoxPaths): string;
export declare function camoufoxPath(downloadIfMissing?: boolean, paths?: CamoufoxPaths): PathLike;
export declare function getPath(file: string, paths?: CamoufoxPaths): string;
export declare function launchPath(paths?: CamoufoxPaths): string;
export declare function webdl(url: string, desc?: string, bar?: boolean, buffer?: Writable | null, { retries }?: {
    retries: number;
}): Promise<Buffer>;
export declare function unzip(zipFile: Buffer, extractPath: string, desc?: string, bar?: boolean): Promise<void>;
export {};
