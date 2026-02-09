import Database from 'better-sqlite3';
const db = new Database('cognicanvas.db');

const stmt = db.prepare(
    'INSERT INTO notes (content, pos_x, pos_y, width, height, color_hex) VALUES (?, ?, ?, ?, ?, ?)'
);

stmt.run('Hello, World!', 100, 150, 200, 200, '#FFFF88');

console.log('Test note added to cognicanvas.db');