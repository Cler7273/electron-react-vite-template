// backend/server.js - CHUNK 1
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const fileService = require("./services/file-service");
// const dbService = require("./services/db-service"); // Temporarily ignored as per instruction
const systemService = require("./services/system-service");

const PORT = 4000;
const app = express();
// Helper: Safe Duration Calculator
const getDuration = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return isNaN(s) || isNaN(e) ? 0 : e - s;
};
// Args handling
const SECRET_TOKEN = process.argv[2];
const USER_DATA_PATH = process.argv[3];

if (!SECRET_TOKEN || !USER_DATA_PATH) {
    console.error("FATAL ERROR: Server started without token or path.");
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// Security Middleware
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
        return res.status(403).json({ error: "Forbidden: Invalid token." });
    }
    next();
});

// Database Initialization
const db = new Database("cognicanvas.db");

// Register Regex Function for Search
db.function("regexp", (pattern, str) => {
    try {
        return new RegExp(pattern, "i").test(str) ? 1 : 0;
    } catch (e) {
        return 0;
    }
});
db.pragma("foreign_keys = ON");

// --- MIGRATION SYSTEM ---
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
        `,
    },
    {
        version: 2,
        up: `
            ALTER TABLE time_logs ADD COLUMN rating INTEGER DEFAULT 0;
            ALTER TABLE time_logs ADD COLUMN session_notes TEXT;
        `,
    },
    {
        version: 3,
        up: `
            ALTER TABLE tasks ADD COLUMN color_hex TEXT DEFAULT '#1f2937';
        `,
    },
    {
        version: 4,
        up: `
            ALTER TABLE time_logs ADD COLUMN manual_note TEXT;
        `,
    },
    {
        version: 5,
        up: `
            UPDATE tasks SET is_done = 0 WHERE is_done IS NULL;
        `,
    },
];

const runMigrations = () => {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER DEFAULT 0)`);
    const result = db.prepare("SELECT version FROM schema_version").get();
    let currentVersion = result ? result.version : 0;

    if (!result) db.prepare("INSERT INTO schema_version (version) VALUES (0)").run();

    console.log(`[DB] Current Schema Version: ${currentVersion}`);

    db.transaction(() => {
        for (const migration of MIGRATIONS) {
            if (migration.version > currentVersion) {
                console.log(`[DB] Applying migration v${migration.version}...`);
                try {
                    const tableInfoTimeLogs = db.prepare("PRAGMA table_info(time_logs)").all();
                    const tableInfoTasks = db.prepare("PRAGMA table_info(tasks)").all();

                    if (migration.version === 2 && tableInfoTimeLogs.some((c) => c.name === "rating")) {
                        /* skip */
                    } else if (migration.version === 3 && tableInfoTasks.some((c) => c.name === "color_hex")) {
                        /* skip */
                    } else if (migration.version === 4 && tableInfoTimeLogs.some((c) => c.name === "manual_note")) {
                        /* skip */
                    } else {
                        db.exec(migration.up);
                    }
                } catch (e) {
                    if (!e.message.includes("duplicate column")) throw e;
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

// --- API ROUTES: GENERAL & CANVAS ---
app.get("/api/shortcuts", (req, res) => {
    try {
        const shortcuts = db.prepare("SELECT * FROM shortcuts").all();
        res.json(shortcuts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/shortcuts", (req, res) => {
    try {
        const { title, target, type } = req.body;
        const stmt = db.prepare("INSERT INTO shortcuts (title, target, type) VALUES (?, ?, ?)");
        const info = stmt.run(title, target, type);
        res.json({ id: info.lastInsertRowid, ...req.body });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/shortcuts/:id", (req, res) => {
    db.prepare("DELETE FROM shortcuts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

app.get("/api/settings", (req, res) => {
    const rows = db.prepare("SELECT * FROM settings").all();
    const settings = {};
    rows.forEach((r) => (settings[r.key] = r.value));
    res.json(settings);
});

app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
});

app.get("/api/all", (req, res) => {
    const notes = db
        .prepare("SELECT * FROM notes")
        .all()
        .map((n) => ({ ...n, tags: getTagsFor("note", n.id) }));
    const frames = db
        .prepare("SELECT * FROM frames")
        .all()
        .map((f) => ({ ...f, tags: getTagsFor("frame", f.id) }));

    const tasks = db
        .prepare("SELECT * FROM tasks")
        .all()
        .map((task) => {
            // Check for active session (is_running)
            const activeLog = db.prepare("SELECT start_time FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(task.id);
            const tags = getTagsFor("task", task.id);
            return {
                ...task,
                is_running: !!activeLog,
                current_session_start: activeLog ? activeLog.start_time : null,
                tags: tags,
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
            const noteIds = db
                .prepare(`SELECT id FROM notes WHERE content LIKE ?`)
                .all(fallbackQuery)
                .map((r) => r.id);
            const frameIds = db
                .prepare(`SELECT id FROM frames WHERE title LIKE ?`)
                .all(fallbackQuery)
                .map((r) => r.id);
            res.status(200).json({ noteIds, frameIds });
        } catch (e) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.put("/api/notes/:id", (req, res) => {
    try {
        const { content, pos_x, pos_y, width, height, color_hex, frame_id } = req.body;
        const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
        if (!existing) return res.status(404).json({ error: "Note not found" });

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
    if (itemType === "notes") table = "note";
    else if (itemType === "frames") table = "frame";
    else if (itemType === "tasks") table = "task";
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
    if (itemType === "notes") table = "note";
    else if (itemType === "frames") table = "frame";
    else if (itemType === "tasks") table = "task";

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

// --- KEYS & CRYPTO (Stubbed to not fail, mostly ignored for now) ---
app.get("/api/keys", async (req, res) => {
    // dbService is ignored as per instructions, returning empty array
    res.json([]);
});
app.post("/api/keys", async (req, res) => {
    res.status(501).json({ error: "Not implemented in this version" });
});
app.delete("/api/keys/:id", async (req, res) => {
    res.status(501).json({ error: "Not implemented in this version" });
});
app.post("/api/encrypt", async (req, res) => {
    const { filePath, keyConfig, intensity, savePath } = req.body;
    try {
        const result = await fileService.encryptFile(
            filePath,
            keyConfig,
            intensity,
            savePath,
            () => {},
            () => {},
        );
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/decrypt", async (req, res) => {
    const { filePath, keyConfig, savePath } = req.body;
    try {
        const result = await fileService.decryptFile(
            filePath,
            keyConfig,
            savePath,
            () => {},
            () => {},
        );
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SYSTEM ---
app.post("/api/system/open", async (req, res) => res.json(await systemService.openExternal(req.body.target)));
app.post("/api/system/run", async (req, res) => res.json(await systemService.runCommand(req.body.command, req.body.args)));

// --- FRAMES ---
app.post("/api/frames", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height } = req.body;
        const stmt = db.prepare("INSERT INTO frames (title, pos_x, pos_y, width, height, is_collapsed) VALUES (?, ?, ?, ?, ?, 0)");
        const info = stmt.run(title, pos_x, pos_y, width, height);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/api/frames/:id", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height, is_collapsed } = req.body;
        const updates = [];
        const params = [];

        const fields = { title, pos_x, pos_y, width, height, is_collapsed };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                updates.push(`${key} = ?`);
                params.push(val);
            }
        }

        params.push(req.params.id);
        db.prepare(`UPDATE frames SET ${updates.join(", ")} WHERE id = ?`).run(...params);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/frames/:id", (req, res) => {
    db.prepare("DELETE FROM frames WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// backend/server.js - CHUNK 2

// --- TASKS API ---

// 1. STATUS ENDPOINT (Heartbeat)
// Objective: Check if ANY task is currently running.
// GET: The "Authority" check for persistence
app.get("/api/tasks/active-session", (req, res) => {
    try {
        const activeLog = db
            .prepare(
                `
            SELECT t.id, t.title, t.color_hex, t.total_time_ms, l.start_time, l.id as log_id 
            FROM time_logs l 
            JOIN tasks t ON l.task_id = t.id 
            WHERE l.end_time IS NULL
        `,
            )
            .get();

        if (activeLog) {
            const tags = getTagsFor("task", activeLog.id);
            res.json({ ...activeLog, tags });
        } else {
            res.json(null);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/tasks", (req, res) => {
    try {
        const { title, color_hex } = req.body;
        const stmt = db.prepare("INSERT INTO tasks (title, is_done, created_at, total_time_ms, color_hex) VALUES (?, 0, ?, 0, ?)");
        const info = stmt.run(title, Date.now(), color_hex || "#1f2937");
        res.status(201).json({ id: info.lastInsertRowid, title, is_done: 0, total_time_ms: 0, color_hex: color_hex || "#1f2937", tags: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put("/api/tasks/:id", (req, res) => {
    try {
        const { color_hex, title, is_done } = req.body;
        const updates = [];
        const params = [];

        if (color_hex !== undefined) {
            updates.push("color_hex = ?");
            params.push(color_hex);
        }
        if (title !== undefined) {
            updates.push("title = ?");
            params.push(title);
        }
        if (is_done !== undefined) {
            updates.push("is_done = ?");
            params.push(is_done ? 1 : 0);
        }

        if (updates.length === 0) return res.json({ success: true, message: "No fields to update" });

        params.push(req.params.id);
        db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/tasks/:id", (req, res) => {
    try {
        const deleteTransaction = db.transaction((id) => {
            db.prepare("DELETE FROM time_logs WHERE task_id = ?").run(id);
            db.prepare("DELETE FROM task_tags WHERE task_id = ?").run(id);
            db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        });
        deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. START TASK (Validation)
// Objective: Prevent starting a new task if one is already running (Global Singleton).
app.post("/api/tasks/:id/start", (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date().toISOString();
        const running = db.prepare(`SELECT t.id, t.title FROM time_logs l JOIN tasks t ON l.task_id = t.id WHERE l.end_time IS NULL`).get();

        if (running) {
            return res.status(409).json({ error: "Protocol already active", runningTask: running });
        }

        const info = db.prepare("INSERT INTO time_logs (task_id, start_time) VALUES (?, ?)").run(id, now);
        res.json({ logId: info.lastInsertRowid, start_time: now });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. ATOMIC STOP
// Objective: Stop timer, update totals, and return the FULL updated task object to sync frontend.
// POST: Atomic Stop with full task return
app.post("/api/tasks/:id/stop", (req, res) => {
    try {
        const { manual_note } = req.body;
        const nowStr = new Date().toISOString();
        const log = db.prepare("SELECT * FROM time_logs WHERE task_id = ? AND end_time IS NULL").get(req.params.id);

        if (log) {
            const durationMs = new Date(nowStr).getTime() - new Date(log.start_time).getTime();

            db.transaction(() => {
                db.prepare("UPDATE time_logs SET end_time = ?, manual_note = ? WHERE id = ?").run(nowStr, manual_note || "", log.id);
                db.prepare("UPDATE tasks SET total_time_ms = total_time_ms + ? WHERE id = ?").run(durationMs, req.params.id);
            })();

            const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
            res.json({
                success: true,
                task: { ...updatedTask, is_running: false, tags: getTagsFor("task", req.params.id) },
            });
        } else {
            res.status(400).json({ error: "No running timer" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// NEW: Delete individual log
app.delete("/api/history/:id", (req, res) => {
    try {
        // We also need to deduct this log's duration from the task's total_time_ms
        const log = db.prepare("SELECT * FROM time_logs WHERE id = ?").get(req.params.id);
        if (log && log.end_time) {
            const duration = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
            
            db.transaction(() => {
                db.prepare("UPDATE tasks SET total_time_ms = total_time_ms - ? WHERE id = ?").run(duration, log.task_id);
                db.prepare("DELETE FROM time_logs WHERE id = ?").run(req.params.id);
            })();
        } else {
            // If it's a running log (active session), just delete it without time deduction
            db.prepare("DELETE FROM time_logs WHERE id = ?").run(req.params.id);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/dev/generate-logs", (req, res) => {
    try {
        const { taskId, count } = req.body;
        const now = new Date();
        const logs = [];
        
        const insertLog = db.prepare("INSERT INTO time_logs (task_id, start_time, end_time, rating, manual_note) VALUES (?, ?, ?, ?, ?)");
        const updateTask = db.prepare("UPDATE tasks SET total_time_ms = total_time_ms + ? WHERE id = ?");

        db.transaction(() => {
            for (let i = 0; i < count; i++) {
                // Random day in current month
                const day = Math.floor(Math.random() * 28) + 1;
                // Random duration 15m to 4h
                const durationMs = (Math.floor(Math.random() * 240) + 15) * 60 * 1000; 
                
                const start = new Date(now.getFullYear(), now.getMonth(), day, 9 + Math.floor(Math.random()*8), 0, 0);
                const end = new Date(start.getTime() + durationMs);

                insertLog.run(taskId, start.toISOString(), end.toISOString(), 3, "Auto-generated test log");
                updateTask.run(durationMs, taskId);
            }
        })();
        
        res.json({ success: true, message: `Generated ${count} logs` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 4. HISTORY WITH FILTERING
// Objective: Retrieve task logs with optional date range filtering for calendar view.
// GET: History with Range Filtering
app.get("/api/history", (req, res) => {
    const { start, end } = req.query;
    let sql = `SELECT l.*, t.title as task_title, t.color_hex FROM time_logs l JOIN tasks t ON l.task_id = t.id WHERE l.end_time IS NOT NULL`;
    const params = [];
    if (start && end) {
        sql += ` AND l.start_time >= ? AND l.start_time <= ?`;
        params.push(start, end);
    }
    sql += ` ORDER BY l.start_time DESC LIMIT 100`;
    res.json(db.prepare(sql).all(...params));
});

// --- END OF API ROUTES ---


app.post("/api/dev/init-test", (req, res) => {
    try {
        const now = new Date();
        const title = `TEST PROTOCOL ${now.getHours()}${now.getMinutes()}`;
        
        // 1. Create the Task
        const taskInfo = db.prepare("INSERT INTO tasks (title, created_at, color_hex, is_done) VALUES (?, ?, ?, 0)").run(title, now.getTime(), "#ef4444");
        const taskId = taskInfo.lastInsertRowid;
        
        let totalDuration = 0;
        const insertLog = db.prepare("INSERT INTO time_logs (task_id, start_time, end_time, rating, manual_note) VALUES (?, ?, ?, ?, ?)");
        
        // 2. Generate 15 logs spread over the current month
        db.transaction(() => {
            for (let i = 1; i <= 15; i++) {
                // Random day, random time
                const day = (i % 28) + 1; 
                const start = new Date(now.getFullYear(), now.getMonth(), day, 8 + (i%10), 0, 0);
                const durationMinutes = 30 + (i * 10); // 40m, 50m, etc.
                const end = new Date(start.getTime() + (durationMinutes * 60000));
                
                insertLog.run(taskId, start.toISOString(), end.toISOString(), 3, `Auto-gen log ${i}`);
                totalDuration += (durationMinutes * 60000);
            }
            // 3. Update Task Total
            db.prepare("UPDATE tasks SET total_time_ms = ? WHERE id = ?").run(totalDuration, taskId);
        })();

        res.json({ success: true, message: "Test Data Injected" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Start Server
app.listen(PORT, "127.0.0.1", () => {
    console.log(`COGNICANVAS_BACKEND_READY on port ${PORT}`);
    // dbService.init(USER_DATA_PATH); // Ignored as per Q4 instruction
});
