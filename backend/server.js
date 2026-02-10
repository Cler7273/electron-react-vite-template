// backend/server.js
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fileService = require('./services/file-service');
const dbService = require('./services/db-service');
const systemService = require('./services/system-service');

const PORT = 4000;
const app = express();

const SECRET_TOKEN = process.argv[2];
const USER_DATA_PATH = process.argv[3];

if (!SECRET_TOKEN || !USER_DATA_PATH) {
  console.error('FATAL ERROR: Server started without token or path.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Security Middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return res.status(403).json({ error: 'Forbidden: Invalid token.' });
  }
  next();
});


const db = new Database("cognicanvas.db");
db.pragma("foreign_keys = ON");

// 1. INITIAL SCHEMA
db.exec(`
  CREATE TABLE IF NOT EXISTS frames (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, is_collapsed BOOLEAN DEFAULT 0);
  CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, color_hex TEXT, frame_id INTEGER, FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color_hex TEXT DEFAULT '#3b82f6');
  CREATE TABLE IF NOT EXISTS note_tags (note_id INTEGER, tag_id INTEGER, PRIMARY KEY (note_id, tag_id), FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS frame_tags (frame_id INTEGER, tag_id INTEGER, PRIMARY KEY (frame_id, tag_id), FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, is_done BOOLEAN DEFAULT 0, created_at INTEGER, total_time_ms INTEGER DEFAULT 0, color_hex TEXT DEFAULT '#1f2937');
  CREATE TABLE IF NOT EXISTS time_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, start_time INTEGER, end_time INTEGER, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS task_tags (task_id INTEGER, tag_id INTEGER, PRIMARY KEY (task_id, tag_id), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS shortcuts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, target TEXT, type TEXT DEFAULT 'url', icon TEXT DEFAULT '🚀');
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

// 2. FORCED MIGRATION (Fixes the "no such column: rating" error)
const migrate = () => {
    const columns = db.prepare("PRAGMA table_info(time_logs)").all();
    const hasRating = columns.some(c => c.name === 'rating');
    if (!hasRating) {
        console.log("Migrating time_logs table...");
        db.exec("ALTER TABLE time_logs ADD COLUMN rating INTEGER DEFAULT 0;");
        db.exec("ALTER TABLE time_logs ADD COLUMN session_notes TEXT;");
    }
    const taskCols = db.prepare("PRAGMA table_info(tasks)").all();
    if (!taskCols.some(c => c.name === 'color_hex')) {
        db.exec("ALTER TABLE tasks ADD COLUMN color_hex TEXT DEFAULT '#1f2937';");
    }
};
migrate();


const getTagsFor = (table, id) => {
  return db.prepare(`SELECT t.name, t.color_hex FROM tags t JOIN ${table}_tags nt ON t.id = nt.tag_id WHERE nt.${table}_id = ?`).all(id);
};

// --- API ROUTES: CANVAS ---
// 2. NEW ROUTES FOR SHORTCUTS
app.get("/api/shortcuts", (req, res) => {
    try {
        const shortcuts = db.prepare("SELECT * FROM shortcuts").all();
        res.json(shortcuts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/shortcuts", (req, res) => {
    try {
        const { title, target, type } = req.body;
        const stmt = db.prepare("INSERT INTO shortcuts (title, target, type) VALUES (?, ?, ?)");
        const info = stmt.run(title, target, type);
        res.json({ id: info.lastInsertRowid, ...req.body });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/shortcuts/:id", (req, res) => {
    db.prepare("DELETE FROM shortcuts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// 3. NEW ROUTES FOR SETTINGS
app.get("/api/settings", (req, res) => {
    const rows = db.prepare("SELECT * FROM settings").all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
});

app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
});
// --- UPDATE GET /api/all (Include Task Tags) ---
app.get("/api/all", (req, res) => {
  const notes = db.prepare("SELECT * FROM notes").all().map(n => ({ ...n, tags: getTagsFor("note", n.id) }));
  const frames = db.prepare("SELECT * FROM frames").all().map(f => ({ ...f, tags: getTagsFor("frame", f.id) }));
  
  // Update Task Fetching
  const tasks = db.prepare("SELECT * FROM tasks").all().map(task => {
    const activeLog = db.prepare("SELECT start_time FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(task.id);
    // NEW: Get Tags for task
    const tags = getTagsFor("task", task.id); 
    return {
      ...task,
      is_running: !!activeLog,
      current_session_start: activeLog ? activeLog.start_time : null,
      tags: tags // <--- Added
    };
  });

  res.json({ notes, frames, tasks });
});

app.post("/api/notes", (req, res) => {
  const { content, pos_x, pos_y, width, height, color_hex } = req.body;
  const info = db.prepare("INSERT INTO notes (content, pos_x, pos_y, width, height, color_hex) VALUES (?, ?, ?, ?, ?, ?)").run(content, pos_x, pos_y, width, height, color_hex);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body, tags: [] });
});

app.put("/api/notes/:id", (req, res) => {
  const { content, pos_x, pos_y, width, height, color_hex } = req.body;
  db.prepare("UPDATE notes SET content = COALESCE(?, content), pos_x = COALESCE(?, pos_x), pos_y = COALESCE(?, pos_y), width = COALESCE(?, width), height = COALESCE(?, height), color_hex = COALESCE(?, color_hex) WHERE id = ?")
    .run(content, pos_x, pos_y, width, height, color_hex, req.params.id);
  res.json({ success: true });
});

app.delete("/api/notes/:id", (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// --- API ROUTES: TAGS (The fix for your 404) ---

// --- UPDATE TAG ROUTE (Support Tasks) ---
// Find your existing app.post("/api/tags/:itemType/:itemId"...) and replace it with:
app.post("/api/tags/:itemType/:itemId", (req, res) => {
  const { itemType, itemId } = req.params; 
  const { name } = req.body;
  
  // Map URL param to DB table prefix
  let table;
  if (itemType === 'notes') table = 'note';
  else if (itemType === 'frames') table = 'frame';
  else if (itemType === 'tasks') table = 'task';
  else return res.status(400).json({ error: "Invalid item type" });
  
  db.transaction(() => {
    let tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(name);
    if (!tag) {
      const info = db.prepare("INSERT INTO tags (name) VALUES (?)").run(name);
      tag = { id: info.lastInsertRowid };
    }
    db.prepare(`INSERT OR IGNORE INTO ${table}_tags (${table}_id, tag_id) VALUES (?, ?)`).run(itemId, tag.id);
  })();
  res.status(201).json({ message: "Tag added" });
});

app.delete("/api/:itemType/:itemId/tags/:tagName", (req, res) => {
  const { itemType, itemId, tagName } = req.params;
  let table;
  if (itemType === 'notes') table = 'note';
  else if (itemType === 'frames') table = 'frame';
  else if (itemType === 'tasks') table = 'task';
  
  const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
  if (tag) {
    db.prepare(`DELETE FROM ${table}_tags WHERE ${table}_id = ? AND tag_id = ?`).run(itemId, tag.id);
  }
  res.json({ message: "Tag removed" });
});
// Update tag color
app.put("/api/tags/:name", (req, res) => {
  db.prepare("UPDATE tags SET color_hex = ? WHERE name = ?").run(req.body.color_hex, req.params.name);
  res.json({ success: true });
});

// --- FIXED KEY ROUTES ---
app.get('/api/keys', async (req, res) => {
  try {
    const keys = await dbService.getKeys();
    res.json(keys || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/keys', async (req, res) => {
  try {
    // Ensure we handle both creation and updates
    const result = await dbService.saveKey(req.body);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/keys/:id', async (req, res) => {
  try {
    await dbService.deleteKey(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FIXED CRYPTO ROUTES ---
app.post('/api/encrypt', async (req, res) => {
  const { filePath, keyConfig, intensity, savePath } = req.body;
  // Passing empty functions as fallback progress/notify handlers
  const result = await fileService.encryptFile(filePath, keyConfig, intensity, savePath, () => {}, () => {});
  res.json(result);
});

app.post('/api/decrypt', async (req, res) => {
  const { filePath, keyConfig, savePath } = req.body;
  const result = await fileService.decryptFile(filePath, keyConfig, savePath, () => {}, () => {});
  res.json(result);
});
app.post('/api/system/open', async (req, res) => res.json(await systemService.openExternal(req.body.target)));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`COGNICANVAS_BACKEND_READY on port ${PORT}`);
  dbService.init(USER_DATA_PATH); 
});

app.put("/api/frames/:id", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height, is_collapsed } = req.body;
        // Dynamic update similar to notes
        const updates = [];
        const params = [];
        if (title !== undefined) { updates.push("title = ?"); params.push(title); }
        if (pos_x !== undefined) { updates.push("pos_x = ?"); params.push(pos_x); }
        if (pos_y !== undefined) { updates.push("pos_y = ?"); params.push(pos_y); }
        if (width !== undefined) { updates.push("width = ?"); params.push(width); }
        if (height !== undefined) { updates.push("height = ?"); params.push(height); }
        if (is_collapsed !== undefined) { updates.push("is_collapsed = ?"); params.push(is_collapsed); }
        
        params.push(req.params.id);
        
        db.prepare(`UPDATE frames SET ${updates.join(", ")} WHERE id = ?`).run(...params);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- MPSI TASKS ROUTES (Fix for 404) ---
app.post("/api/tasks", (req, res) => {
    try {
        const { title } = req.body;
        // Default is_done to 0, total_time_ms to 0
        const stmt = db.prepare("INSERT INTO tasks (title, is_done, created_at, total_time_ms) VALUES (?, 0, ?, 0)");
        const info = stmt.run(title, Date.now());
        res.status(201).json({ id: info.lastInsertRowid, title, is_done: 0, total_time_ms: 0 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post("/api/tasks/:id/start", (req, res) => {
    try {
        const info = db.prepare("INSERT INTO time_logs (task_id, start_time) VALUES (?, ?)").run(req.params.id, Date.now());
        res.json({ logId: info.lastInsertRowid });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. UPDATED TASK ROUTES (Stop with Rating)
app.post("/api/tasks/:id/stop", (req, res) => {
    const { rating, notes } = req.body; // New optional params
    const now = Date.now();
    const log = db.prepare("SELECT * FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(req.params.id);
    
    if(log) {
        db.prepare("UPDATE time_logs SET end_time = ?, rating = ?, session_notes = ? WHERE id = ?")
          .run(now, rating || 0, notes || "", log.id);
        
        const duration = now - log.start_time;
        db.prepare("UPDATE tasks SET total_time_ms = total_time_ms + ? WHERE id = ?").run(duration, req.params.id);
        res.json({ success: true, duration });
    } else {
        res.status(400).json({ error: "No running timer" });
    }
});
app.delete("/api/frames/:id", (req, res) => {
    db.prepare("DELETE FROM frames WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// ADD THIS ROUTE:
app.post("/api/frames", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height } = req.body;
        const stmt = db.prepare("INSERT INTO frames (title, pos_x, pos_y, width, height, is_collapsed) VALUES (?, ?, ?, ?, ?, 0)");
        const info = stmt.run(title, pos_x, pos_y, width, height);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body });
    } catch (error) { res.status(500).json({ error: error.message }); }
});