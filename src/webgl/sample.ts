import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
	type CamoufoxPaths,
	getDefaultLocalData,
	OS_ARCH_MATRIX,
} from "../pkgman.js";

// Get database path relative to this file
function getDbPath(paths?: CamoufoxPaths): string {
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
				.prepare(
					"SELECT name FROM sqlite_master WHERE type='table' AND name='webgl_fingerprints'",
				)
				.get();
			testDb.close();

			if (!tableExists) {
				// Database exists but doesn't have the required table, remove it to trigger recreation
				fs.unlinkSync(dbPath);
			}
		} catch (error) {
			// If there's any error checking the database, remove it to be safe
			fs.unlinkSync(dbPath);
		}
	}

	// If database doesn't exist, create it with the required schema
	if (!fs.existsSync(dbPath)) {
		try {
			const db = new Database(dbPath);

			// Create the webgl_fingerprints table
			db.exec(`
				CREATE TABLE IF NOT EXISTS webgl_fingerprints (
					vendor TEXT NOT NULL,
					renderer TEXT NOT NULL,
					data TEXT NOT NULL,
					win INTEGER NOT NULL DEFAULT 0,
					mac INTEGER NOT NULL DEFAULT 0,
					lin INTEGER NOT NULL DEFAULT 0,
					PRIMARY KEY (vendor, renderer)
				)
			`);

			// Check if there's a source database to copy data from
			const sourceDbPath = path.join(
				import.meta.dirname,
				"..",
				"data-files",
				"webgl_data.db",
			);
			if (fs.existsSync(sourceDbPath) && sourceDbPath !== dbPath) {
				try {
					const sourceDb = new Database(sourceDbPath, { readonly: true });

					// Check if source has the table
					const sourceTableExists = sourceDb
						.prepare(
							"SELECT name FROM sqlite_master WHERE type='table' AND name='webgl_fingerprints'",
						)
						.get();

					if (sourceTableExists) {
						// Copy data from source database
						const rows = sourceDb
							.prepare("SELECT * FROM webgl_fingerprints")
							.all() as Array<{
							vendor: string;
							renderer: string;
							data: string;
							win?: number;
							mac?: number;
							lin?: number;
						}>;
						const insert = db.prepare(
							"INSERT OR REPLACE INTO webgl_fingerprints (vendor, renderer, data, win, mac, lin) VALUES (?, ?, ?, ?, ?, ?)",
						);

						for (const row of rows) {
							insert.run(
								row.vendor,
								row.renderer,
								row.data,
								row.win || 0,
								row.mac || 0,
								row.lin || 0,
							);
						}
					}

					sourceDb.close();
				} catch (copyError) {
					console.warn(
						"Warning: Could not copy data from source database:",
						copyError,
					);
				}
			}

			db.close();
		} catch (error) {
			console.error("Error creating database:", error);
			throw error;
		}
	}

	return dbPath;
}

interface WebGLData {
	vendor: string;
	renderer: string;
	data: string;
	win: number;
	mac: number;
	lin: number;
	webGl2Enabled: boolean;
}

export async function sampleWebGL(
	os: "win" | "mac" | "lin",
	vendor?: string,
	renderer?: string,
	paths?: CamoufoxPaths,
): Promise<WebGLData> {
	if (!OS_ARCH_MATRIX[os]) {
		throw new Error(`Invalid OS: ${os}. Must be one of: win, mac, lin`);
	}

	const db = new Database(getDbPath(paths));
	let query = "";
	let params: any[] = [];

	if (vendor && renderer) {
		query = `SELECT vendor, renderer, data, ${os} FROM webgl_fingerprints WHERE vendor = ? AND renderer = ?`;
		params = [vendor, renderer];
	} else {
		query = `SELECT vendor, renderer, data, ${os} FROM webgl_fingerprints WHERE ${os} > 0`;
	}

	return new Promise<WebGLData>((resolve, reject) => {
		try {
			const rows: WebGLData[] = db.prepare(query).all(...params) as WebGLData[];

			if (rows.length === 0) {
				reject(new Error(`No WebGL data found for OS: ${os}`));
				return;
			}

			if (vendor && renderer) {
				const result = rows[0]!;
				if (result[os]! <= 0) {
					const pairs = db
						.prepare(
							`SELECT DISTINCT vendor, renderer FROM webgl_fingerprints WHERE ${os} > 0`,
						)
						.all();
					reject(
						new Error(
							`Vendor "${vendor}" and renderer "${renderer}" combination not valid for ${os}. Possible pairs: ${(pairs as Array<VendorRenderer>).map((pair) => `${pair.vendor}, ${pair.renderer}`).join(", ")}`,
						),
					);
					return;
				}
				resolve(JSON.parse(result.data));
			} else {
				const dataStrs = rows.map((row) => row.data);
				const probs = rows.map((row) => row[os]);
				const probsArray = probs.map(
					(p) => p / probs.reduce((a, b) => a + b, 0),
				);
				function weightedRandomChoice(weights: number[]): number {
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
		} catch (err) {
			reject(err);
		}
	}).finally(() => {
		db.close();
	});
}

interface VendorRenderer {
	vendor: string;
	renderer: string;
}

interface PossiblePairs {
	[key: string]: Array<VendorRenderer>;
}

export async function getPossiblePairs(
	paths?: CamoufoxPaths,
): Promise<PossiblePairs> {
	const db = new Database(getDbPath(paths));
	const result: PossiblePairs = {};

	return new Promise<PossiblePairs>((resolve, reject) => {
		try {
			const osTypes = Object.keys(OS_ARCH_MATRIX);

			osTypes.forEach((os_type) => {
				const rows = db
					.prepare(
						`SELECT DISTINCT vendor, renderer FROM webgl_fingerprints WHERE ${os_type} > 0 ORDER BY ${os_type} DESC`,
					)
					.all();

				result[os_type] = rows as Array<{ vendor: string; renderer: string }>;
			});

			resolve(result);
		} catch (err) {
			reject(err);
		}
	}).finally(() => {
		db.close();
	});
}
