// backend/server.js
const express = require('express');
const cors = require('cors');
// const crypto = require('crypto'); // Unused currently
const Database = require('better-sqlite3');
const fileService = require('./services/file-service');
const systemService = require('./services/system-service');
const dbService = require('./services/db-service');
// const p2pService = require('./services/p2p-service'); // Commented out to reduce complexity for now

const PORT = 4000;
const app = express();

// ARGS: [node, server.js, SECRET_TOKEN, USER_DATA_PATH]
const SECRET_TOKEN = process.argv[2];
const USER_DATA_PATH = process.argv[3];

if (!SECRET_TOKEN || !USER_DATA_PATH) {
  console.error('FATAL ERROR: Server started without token or path.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return res.status(403).json({ error: 'Forbidden: Invalid authentication token.' });
  }
  next();
});

// --- SQLITE (Notes/Canvas/TimeTracking) ---
const db = new Database("cognicanvas.db");
db.pragma("foreign_keys = ON");

// Updated Schema for MPSI (Time Tracking & Events)
db.exec(`
  CREATE TABLE IF NOT EXISTS frames ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT 'New Frame', pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, is_collapsed BOOLEAN DEFAULT 0 );
  CREATE TABLE IF NOT EXISTS notes ( id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, color_hex TEXT, frame_id INTEGER, FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS tags ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color_hex TEXT DEFAULT '#3b82f6' );
  CREATE TABLE IF NOT EXISTS note_tags ( note_id INTEGER, tag_id INTEGER, PRIMARY KEY (note_id, tag_id), FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS frame_tags ( frame_id INTEGER, tag_id INTEGER, PRIMARY KEY (frame_id, tag_id), FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE );

  -- MPSI: Tasks & Time Logs
  CREATE TABLE IF NOT EXISTS tasks ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, is_done BOOLEAN DEFAULT 0, created_at INTEGER, total_time_ms INTEGER DEFAULT 0 );
  CREATE TABLE IF NOT EXISTS time_logs ( id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, start_time INTEGER, end_time INTEGER, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE );

  -- MPSI: Calendar Events
  CREATE TABLE IF NOT EXISTS events ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, start_time INTEGER, end_time INTEGER, description TEXT, color TEXT );
`);

const getTagsFor = (table, id) => {
    const stmt = db.prepare(`SELECT t.name, t.color_hex FROM tags t JOIN ${table}_tags nt ON t.id = nt.tag_id WHERE nt.${table}_id = ?`);
    return stmt.all(id) || [];
};

// --- ROUTES ---

// 1. NASM Encrypt/Decrypt
app.post('/api/encrypt', async (req, res) => {
  const { filePath, keyConfig, intensity, savePath } = req.body;
  // Note: We use the savePath passed from frontend (which got it from main process dialog)
  res.json(await fileService.encryptFile(filePath, keyConfig, intensity, savePath, () => {}, () => {}));
});
app.post('/api/decrypt', async (req, res) => {
  const { filePath, keyConfig, savePath } = req.body;
  res.json(await fileService.decryptFile(filePath, keyConfig, savePath, () => {}, () => {}));
});

// 2. Keys (NeDB)
app.get('/api/keys', async (req, res) => res.json(await dbService.getKeys()));
app.post('/api/keys', async (req, res) => res.json(await dbService.saveKey(req.body)));
app.delete('/api/keys/:id', async (req, res) => res.json(await dbService.deleteKey(req.params.id)));

// 3. Canvas (SQLite)
app.get("/api/all", (req, res) => {
    try {
        const notes = db.prepare("SELECT * FROM notes").all().map((n) => ({ ...n, tags: getTagsFor("note", n.id) }));
        const frames = db.prepare("SELECT * FROM frames").all().map((f) => ({ ...f, tags: getTagsFor("frame", f.id) }));
        const tasks = db.prepare("SELECT * FROM tasks").all();
        const events = db.prepare("SELECT * FROM events").all();
        res.status(200).json({ notes, frames, tasks, events });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ... (Previous Note/Frame Routes remain similar, just ensure they are here) ...

// 4. MPSI Time Tracking Routes
app.post("/api/tasks", (req, res) => {
    const info = db.prepare("INSERT INTO tasks (title, created_at) VALUES (?, ?)").run(req.body.title, Date.now());
    res.json({ id: info.lastInsertRowid, ...req.body });
});
app.post("/api/tasks/:id/start", (req, res) => {
    // Start a timer = create a log with start_time, null end_time
    const info = db.prepare("INSERT INTO time_logs (task_id, start_time) VALUES (?, ?)").run(req.params.id, Date.now());
    res.json({ logId: info.lastInsertRowid });
});
app.post("/api/tasks/:id/stop", (req, res) => {
    // Find the open log for this task and close it
    const now = Date.now();
    const log = db.prepare("SELECT * FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(req.params.id);
    if(log) {
        db.prepare("UPDATE time_logs SET end_time = ? WHERE id = ?").run(now, log.id);
        // Update total time cache
        const duration = now - log.start_time;
        db.prepare("UPDATE tasks SET total_time_ms = total_time_ms + ? WHERE id = ?").run(duration, req.params.id);
        res.json({ message: "Timer stopped", duration });
    } else {
        res.status(400).json({ error: "No running timer found for this task" });
    }
});


app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend listening on http://127.0.0.1:${PORT}`);
  // Initialize DB Service with the path we got from Main
  dbService.init(USER_DATA_PATH); 
});
// Open a URL or File (The "Shortcut" feature)
app.post('/api/system/open', async (req, res) => {
    const { target } = req.body; // target can be "https://google.com" or "C:\\Users\\..."
    const result = await systemService.openExternal(target);
    res.json(result);
});

// Run a terminal command (Great for MPSI Python scripts)
app.post('/api/system/run', async (req, res) => {
    const { command, args } = req.body;
    const result = await systemService.runCommand(command, args || []);
    res.json(result);
});