import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getDefaultLocalData, OS_ARCH_MATRIX, } from "../pkgman.js";
// Get database path relative to this file
function getDbPath(paths) {
    const localData = paths?.localData || getDefaultLocalData();
    const dbPath = path.join(localData.toString(), "webgl_data.db");
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    // Check if database file exists and has the required table
    if (fs.existsSync(dbPath)) {
        try {
            const testDb = new Database(dbPath, { readonly: true });
            const tableExists = testDb
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='webgl_fingerprints'")
                .get();
            testDb.close();
            if (!tableExists) {
                // Database exists but doesn't have the required table, remove it to trigger recreation
                fs.unlinkSync(dbPath);
            }
        }
        catch (error) {
            // If there's any error checking the database, remove it to be safe
            fs.unlinkSync(dbPath);
        }
    }
    return dbPath;
}
export async function sampleWebGL(os, vendor, renderer, paths) {
    if (!OS_ARCH_MATRIX[os]) {
        throw new Error(`Invalid OS: ${os}. Must be one of: win, mac, lin`);
    }
    const db = new Database(getDbPath(paths));
    let query = "";
    let params = [];
    if (vendor && renderer) {
        query = `SELECT vendor, renderer, data, ${os} FROM webgl_fingerprints WHERE vendor = ? AND renderer = ?`;
        params = [vendor, renderer];
    }
    else {
        query = `SELECT vendor, renderer, data, ${os} FROM webgl_fingerprints WHERE ${os} > 0`;
    }
    return new Promise((resolve, reject) => {
        try {
            const rows = db.prepare(query).all(...params);
            if (rows.length === 0) {
                reject(new Error(`No WebGL data found for OS: ${os}`));
                return;
            }
            if (vendor && renderer) {
                const result = rows[0];
                if (result[os] <= 0) {
                    const pairs = db
                        .prepare(`SELECT DISTINCT vendor, renderer FROM webgl_fingerprints WHERE ${os} > 0`)
                        .all();
                    reject(new Error(`Vendor "${vendor}" and renderer "${renderer}" combination not valid for ${os}. Possible pairs: ${pairs.map((pair) => `${pair.vendor}, ${pair.renderer}`).join(", ")}`));
                    return;
                }
                resolve(JSON.parse(result.data));
            }
            else {
                const dataStrs = rows.map((row) => row.data);
                const probs = rows.map((row) => row[os]);
                const probsArray = probs.map((p) => p / probs.reduce((a, b) => a + b, 0));
                function weightedRandomChoice(weights) {
                    const sum = weights.reduce((acc, weight) => acc + weight, 0);
                    const threshold = Math.random() * sum;
                    let cumulativeSum = 0;
                    for (let i = 0; i < weights.length; i++) {
                        cumulativeSum += weights[i];
                        if (cumulativeSum >= threshold) {
                            return i;
                        }
                    }
                    return weights.length - 1; // Fallback in case of rounding errors
                }
                const idx = weightedRandomChoice(probsArray);
                resolve(JSON.parse(dataStrs[idx]));
            }
        }
        catch (err) {
            reject(err);
        }
    }).finally(() => {
        db.close();
    });
}
export async function getPossiblePairs(paths) {
    const db = new Database(getDbPath(paths));
    const result = {};
    return new Promise((resolve, reject) => {
        try {
            const osTypes = Object.keys(OS_ARCH_MATRIX);
            osTypes.forEach((os_type) => {
                const rows = db
                    .prepare(`SELECT DISTINCT vendor, renderer FROM webgl_fingerprints WHERE ${os_type} > 0 ORDER BY ${os_type} DESC`)
                    .all();
                result[os_type] = rows;
            });
            resolve(result);
        }
        catch (err) {
            reject(err);
        }
    }).finally(() => {
        db.close();
    });
}
