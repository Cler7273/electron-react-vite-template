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
// --- NEW: Register Regex Function ---
db.function('regexp', (pattern, str) => {
    try {
        return new RegExp(pattern, 'i').test(str) ? 1 : 0;
    } catch (e) { return 0; }
});
db.pragma("foreign_keys = ON");

// --- ROBUST MIGRATION SYSTEM ---
const MIGRATIONS = [
    {
        version: 1,
        up: `
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
        `
    },
    {
        version: 2,
        up: `
            ALTER TABLE time_logs ADD COLUMN rating INTEGER DEFAULT 0;
            ALTER TABLE time_logs ADD COLUMN session_notes TEXT;
        `
    },
    {
        version: 3,
        up: `
            ALTER TABLE tasks ADD COLUMN color_hex TEXT DEFAULT '#1f2937';
        `
    },
    {
        version: 4,
        up: `
            ALTER TABLE time_logs ADD COLUMN manual_note TEXT;
        `
    }
];

const runMigrations = () => {
    // 1. Initialize Version Table
    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER DEFAULT 0)`);
    const result = db.prepare("SELECT version FROM schema_version").get();
    let currentVersion = result ? result.version : 0;

    if (!result) db.prepare("INSERT INTO schema_version (version) VALUES (0)").run();

    console.log(`[DB] Current Schema Version: ${currentVersion}`);

    // 2. Apply Missing Migrations
    db.transaction(() => {
        for (const migration of MIGRATIONS) {
            if (migration.version > currentVersion) {
                console.log(`[DB] Applying migration v${migration.version}...`);
                try {
                    // Check if columns exist before altering (defensive coding for dev envs)
                    if (migration.version === 2) {
                        const cols = db.prepare("PRAGMA table_info(time_logs)").all();
                        if (!cols.some(c => c.name === 'rating')) db.exec(migration.up);
                    } else if (migration.version === 3) {
                        const cols = db.prepare("PRAGMA table_info(tasks)").all();
                        if (!cols.some(c => c.name === 'color_hex')) db.exec(migration.up);
                    } else if (migration.version === 4) {
                        const cols = db.prepare("PRAGMA table_info(time_logs)").all();
                        if (!cols.some(c => c.name === 'manual_note')) db.exec(migration.up);
                    } else {
                        db.exec(migration.up);
                    }
                } catch (e) {
                    // Ignore "duplicate column" errors if manual hotfixes were applied previously
                    if (!e.message.includes('duplicate column')) throw e;
                }
                currentVersion = migration.version;
            }
        }
        db.prepare("UPDATE schema_version SET version = ?").run(currentVersion);
    })();
    console.log(`[DB] Database is up to date (v${currentVersion}).`);
};

runMigrations();

// --- HELPERS ---
const getTagsFor = (table, id) => {
  return db.prepare(`SELECT t.name, t.color_hex FROM tags t JOIN ${table}_tags nt ON t.id = nt.tag_id WHERE nt.${table}_id = ?`).all(id);
};

// --- API ROUTES: CANVAS ---
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

app.get("/api/all", (req, res) => {
  const notes = db.prepare("SELECT * FROM notes").all().map(n => ({ ...n, tags: getTagsFor("note", n.id) }));
  const frames = db.prepare("SELECT * FROM frames").all().map(f => ({ ...f, tags: getTagsFor("frame", f.id) }));
  
  const tasks = db.prepare("SELECT * FROM tasks").all().map(task => {
    const activeLog = db.prepare("SELECT start_time FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(task.id);
    const tags = getTagsFor("task", task.id); 
    return {
      ...task,
      is_running: !!activeLog,
      current_session_start: activeLog ? activeLog.start_time : null,
      tags: tags 
    };
  });

  res.json({ notes, frames, tasks });
});

app.post("/api/notes", (req, res) => {
  const { content, pos_x, pos_y, width, height, color_hex } = req.body;
  const info = db.prepare("INSERT INTO notes (content, pos_x, pos_y, width, height, color_hex) VALUES (?, ?, ?, ?, ?, ?)").run(content, pos_x, pos_y, width, height, color_hex);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body, tags: [] });
});
app.get("/api/search", (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(200).json({ noteIds: [], frameIds: [] });
        
        const noteIds = db
            .prepare(`SELECT id FROM notes WHERE content REGEXP ?`)
            .all(query)
            .map((row) => row.id);
            
        const frameIds = db
            .prepare(`SELECT id FROM frames WHERE title REGEXP ?`)
            .all(query)
            .map((row) => row.id);
            
        res.status(200).json({ noteIds, frameIds });
    } catch (error) {
        try {
             const fallbackQuery = `%${query}%`;
             const noteIds = db.prepare(`SELECT id FROM notes WHERE content LIKE ?`).all(fallbackQuery).map(r => r.id);
             const frameIds = db.prepare(`SELECT id FROM frames WHERE title LIKE ?`).all(fallbackQuery).map(r => r.id);
             res.status(200).json({ noteIds, frameIds });
        } catch(e) {
             res.status(500).json({ error: error.message });
        }
    }
});

app.put("/api/notes/:id", (req, res) => {
  try {
      const { content, pos_x, pos_y, width, height, color_hex, frame_id } = req.body;
      
      const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
      if (!existing) {
          return res.status(404).json({ error: "Note not found" });
      }

      const finalFrameId = frame_id === undefined ? existing.frame_id : frame_id;

      const stmt = db.prepare(`
        UPDATE notes SET 
        content = COALESCE(?, content), 
        pos_x = COALESCE(?, pos_x), 
        pos_y = COALESCE(?, pos_y), 
        width = COALESCE(?, width), 
        height = COALESCE(?, height), 
        color_hex = COALESCE(?, color_hex),
        frame_id = ?
        WHERE id = ?`);
        
      stmt.run(content, pos_x, pos_y, width, height, color_hex, finalFrameId, req.params.id);
      res.json({ success: true });
  } catch (error) {
      console.error("Update Note Error:", error);
      res.status(500).json({ error: error.message });
  }
});
app.delete("/api/notes/:id", (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// --- TAGS ---
app.post("/api/tags/:itemType/:itemId", (req, res) => {
  const { itemType, itemId } = req.params; 
  const { name } = req.body;
  
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

app.put("/api/tags/:name", (req, res) => {
  db.prepare("UPDATE tags SET color_hex = ? WHERE name = ?").run(req.body.color_hex, req.params.name);
  res.json({ success: true });
});

// --- KEYS & CRYPTO ---
app.get('/api/keys', async (req, res) => {
  try { res.json(await dbService.getKeys() || []); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/keys', async (req, res) => {
  try { res.json({ success: true, result: await dbService.saveKey(req.body) }); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/keys/:id', async (req, res) => {
  try { await dbService.deleteKey(req.params.id); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/encrypt', async (req, res) => {
  const { filePath, keyConfig, intensity, savePath } = req.body;
  const result = await fileService.encryptFile(filePath, keyConfig, intensity, savePath, () => {}, () => {});
  res.json(result);
});

app.post('/api/decrypt', async (req, res) => {
  const { filePath, keyConfig, savePath } = req.body;
  const result = await fileService.decryptFile(filePath, keyConfig, savePath, () => {}, () => {});
  res.json(result);
});

// --- SYSTEM ---
app.post('/api/system/open', async (req, res) => res.json(await systemService.openExternal(req.body.target)));
app.post('/api/system/run', async (req, res) => res.json(await systemService.runCommand(req.body.command, req.body.args)));

// --- FRAMES ---
app.post("/api/frames", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height } = req.body;
        const stmt = db.prepare("INSERT INTO frames (title, pos_x, pos_y, width, height, is_collapsed) VALUES (?, ?, ?, ?, ?, 0)");
        const info = stmt.run(title, pos_x, pos_y, width, height);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/frames/:id", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height, is_collapsed } = req.body;
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

app.delete("/api/frames/:id", (req, res) => {
    db.prepare("DELETE FROM frames WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// --- TASKS ---
app.post("/api/tasks", (req, res) => {
    try {
        const { title } = req.body;
        const stmt = db.prepare("INSERT INTO tasks (title, is_done, created_at, total_time_ms) VALUES (?, 0, ?, 0)");
        const info = stmt.run(title, Date.now());
        res.status(201).json({ id: info.lastInsertRowid, title, is_done: 0, total_time_ms: 0 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put("/api/tasks/:id", (req, res) => {
    try {
        const { color_hex, title } = req.body;
        db.prepare("UPDATE tasks SET color_hex = COALESCE(?, color_hex), title = COALESCE(?, title) WHERE id = ?")
          .run(color_hex, title, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE Task: Transactional to clear logs
app.delete("/api/tasks/:id", (req, res) => {
    try {
        const deleteTransaction = db.transaction((id) => {
            db.prepare("DELETE FROM time_logs WHERE task_id = ?").run(id);
            db.prepare("DELETE FROM task_tags WHERE task_id = ?").run(id);
            db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        });
        deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// START Task Session: Atomic Check
app.post("/api/tasks/:id/start", (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date().toISOString();

        // Atomic check: Is there already a running session for this task?
        const running = db.prepare("SELECT id FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(id);
        
        if (running) {
            return res.status(409).json({ error: "Session already running for this task." });
        }

        const info = db.prepare("INSERT INTO time_logs (task_id, start_time) VALUES (?, ?)").run(id, now);
        res.json({ logId: info.lastInsertRowid, start_time: now });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// STOP Task Session: Duration Calculation & ISO Updates
app.post("/api/tasks/:id/stop", (req, res) => {
    try {
        const { rating, notes, manual_note } = req.body; 
        const nowStr = new Date().toISOString();
        const now = new Date(nowStr).getTime();
        
        const log = db.prepare("SELECT * FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(req.params.id);
        
        if(log) {
            // Handle start_time being potentially INT (legacy) or String (new)
            const startTimeMs = new Date(log.start_time).getTime();
            const durationMs = now - startTimeMs;
            const durationSec = durationMs / 1000;

            db.prepare("UPDATE time_logs SET end_time = ?, rating = ?, session_notes = ?, manual_note = ? WHERE id = ?")
              .run(nowStr, rating || 0, notes || "", manual_note || "", log.id);
            
            // Update total accumulated time for the task
            db.prepare("UPDATE tasks SET total_time_ms = total_time_ms + ? WHERE id = ?")
              .run(durationMs, req.params.id);
              
            res.json({ success: true, duration: durationSec, end_time: nowStr });
        } else {
            res.status(400).json({ error: "No running timer" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/history", (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT l.id, l.start_time, l.end_time, l.rating, l.session_notes, l.manual_note, t.title as task_title, t.color_hex 
            FROM time_logs l 
            JOIN tasks t ON l.task_id = t.id 
            WHERE l.end_time IS NOT NULL 
            ORDER BY l.start_time DESC 
            LIMIT 50
        `).all();
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`COGNICANVAS_BACKEND_READY on port ${PORT}`);
  dbService.init(USER_DATA_PATH); 
});