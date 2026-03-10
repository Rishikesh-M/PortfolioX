import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Aim for the same root directory of the project
const DB_PATH = path.resolve(__dirname, '../../db.json');

const initialState = {
    users: [],
    portfolios: []
};

async function ensureDbExists() {
    try {
        await fs.access(DB_PATH);
    } catch {
        await fs.writeFile(DB_PATH, JSON.stringify(initialState, null, 2));
    }
}

export async function readDb() {
    await ensureDbExists();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
}

export async function writeDb(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}
