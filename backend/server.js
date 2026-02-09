// backend/server.js
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fileService = require('./services/file-service');
const dbService = require('./services/db-service'); // Crypto/P2P DB (NeDB)
const systemService = require('./services/system-service');

const PORT = 4000;
const app = express();

// ARGS: [node, server.js, SECRET_TOKEN, USER_DATA_PATH]
const SECRET_TOKEN = process.argv[2];
const USER_DATA_PATH = process.argv[3];

if (!SECRET_TOKEN || !USER_DATA_PATH) {
  console.error('FATAL ERROR: Server started without token or path.');
  process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Security: Check Token for EVERY request
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return res.status(403).json({ error: 'Forbidden: Invalid authentication token.' });
  }
  next();
});

// ==========================================
// 1. SQLITE DATABASE (Notes, Canvas, MPSI)
// ==========================================
// We use 'cognicanvas.db' for structured app data
const db = new Database("cognicanvas.db");
db.pragma("foreign_keys = ON");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS frames ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT 'New Frame', pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, is_collapsed BOOLEAN DEFAULT 0 );
  CREATE TABLE IF NOT EXISTS notes ( id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, color_hex TEXT, frame_id INTEGER, FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS tags ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color_hex TEXT DEFAULT '#3b82f6' );
  CREATE TABLE IF NOT EXISTS note_tags ( note_id INTEGER, tag_id INTEGER, PRIMARY KEY (note_id, tag_id), FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS frame_tags ( frame_id INTEGER, tag_id INTEGER, PRIMARY KEY (frame_id, tag_id), FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE );

  -- MPSI: Tasks & Time Logs
  CREATE TABLE IF NOT EXISTS tasks ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, is_done BOOLEAN DEFAULT 0, created_at INTEGER, total_time_ms INTEGER DEFAULT 0 );
  CREATE TABLE IF NOT EXISTS time_logs ( id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, start_time INTEGER, end_time INTEGER, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE );
`);

// Helper: Get tags for an item
const getTagsFor = (table, id) => {
    const stmt = db.prepare(`SELECT t.name, t.color_hex FROM tags t JOIN ${table}_tags nt ON t.id = nt.tag_id WHERE nt.${table}_id = ?`);
    return stmt.all(id) || [];
};

// ==========================================
// 2. API ROUTES: CANVAS (Notes & Frames)
// ==========================================

// GET ALL (The "Desktop" State)
app.get("/api/all", (req, res) => {
    try {
        const notes = db.prepare("SELECT * FROM notes").all().map((n) => ({ ...n, tags: getTagsFor("note", n.id) }));
        const frames = db.prepare("SELECT * FROM frames").all().map((f) => ({ ...f, tags: getTagsFor("frame", f.id) }));
        const tasks = db.prepare("SELECT * FROM tasks").all();
        res.status(200).json({ notes, frames, tasks });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// NOTES CRUD
app.post("/api/notes", (req, res) => {
    try {
        const { content, pos_x, pos_y, width, height, color_hex } = req.body;
        const stmt = db.prepare("INSERT INTO notes (content, pos_x, pos_y, width, height, color_hex) VALUES (?, ?, ?, ?, ?, ?)");
        const info = stmt.run(content, pos_x, pos_y, width, height, color_hex);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body, tags: [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/notes/:id", (req, res) => {
    try {
        const { content, pos_x, pos_y, width, height, color_hex, frame_id } = req.body;
        // Dynamic update query to handle partial updates
        const updates = [];
        const params = [];
        if (content !== undefined) { updates.push("content = ?"); params.push(content); }
        if (pos_x !== undefined) { updates.push("pos_x = ?"); params.push(pos_x); }
        if (pos_y !== undefined) { updates.push("pos_y = ?"); params.push(pos_y); }
        if (width !== undefined) { updates.push("width = ?"); params.push(width); }
        if (height !== undefined) { updates.push("height = ?"); params.push(height); }
        if (color_hex !== undefined) { updates.push("color_hex = ?"); params.push(color_hex); }
        if (frame_id !== undefined) { updates.push("frame_id = ?"); params.push(frame_id); }
        
        params.push(req.params.id);
        
        const stmt = db.prepare(`UPDATE notes SET ${updates.join(", ")} WHERE id = ?`);
        stmt.run(...params);
        res.status(200).json({ message: "Note updated" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete("/api/notes/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
        res.status(200).json({ message: "Note deleted" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// FRAMES CRUD
app.post("/api/frames", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height } = req.body;
        const stmt = db.prepare("INSERT INTO frames (title, pos_x, pos_y, width, height) VALUES (?, ?, ?, ?, ?)");
        const info = stmt.run(title, pos_x, pos_y, width, height);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body, tags: [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 3. API ROUTES: CRYPTO & FILES
// ==========================================

app.post('/api/encrypt', async (req, res) => {
  const { filePath, keyConfig, intensity, savePath } = req.body;
  res.json(await fileService.encryptFile(filePath, keyConfig, intensity, savePath, () => {}, () => {}));
});

app.post('/api/decrypt', async (req, res) => {
  const { filePath, keyConfig, savePath } = req.body;
  res.json(await fileService.decryptFile(filePath, keyConfig, savePath, () => {}, () => {}));
});

app.get('/api/keys', async (req, res) => res.json(await dbService.getKeys()));
app.post('/api/keys', async (req, res) => res.json(await dbService.saveKey(req.body)));
app.delete('/api/keys/:id', async (req, res) => res.json(await dbService.deleteKey(req.params.id)));

// ==========================================
// 4. API ROUTES: SYSTEM & MPSI
// ==========================================

app.post('/api/system/open', async (req, res) => {
    res.json(await systemService.openExternal(req.body.target));
});

app.post('/api/system/run', async (req, res) => {
    res.json(await systemService.runCommand(req.body.command, req.body.args));
});

// MPSI Task Timer
app.post("/api/tasks", (req, res) => {
    const info = db.prepare("INSERT INTO tasks (title, created_at) VALUES (?, ?)").run(req.body.title, Date.now());
    res.json({ id: info.lastInsertRowid, ...req.body });
});

// --- Server Startup ---
app.listen(PORT, '127.0.0.1', () => {
  console.log(`CogniCanvas OS Backend listening on http://127.0.0.1:${PORT}`);
  // Initialize Crypto DB with user data path
  dbService.init(USER_DATA_PATH); 
});