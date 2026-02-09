// MODIFIED: Replaced ES Module imports with CommonJS requires
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 4000;
app.use(cors());
app.use(express.json());

const db = new Database("cognicanvas.db");

// This pragma command is critical for data integrity.
db.pragma("foreign_keys = ON");

// --- DATABASE SCHEMA ---
// The schema remains the same, using ON DELETE CASCADE for robust deletions.
db.exec(`
  CREATE TABLE IF NOT EXISTS frames ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT 'New Frame', pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, is_collapsed BOOLEAN DEFAULT 0 );
  CREATE TABLE IF NOT EXISTS notes ( id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, pos_x INTEGER, pos_y INTEGER, width INTEGER, height INTEGER, color_hex TEXT, frame_id INTEGER, FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS tags ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color_hex TEXT DEFAULT '#3b82f6' );
  CREATE TABLE IF NOT EXISTS note_tags ( note_id INTEGER, tag_id INTEGER, PRIMARY KEY (note_id, tag_id), FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE );
  CREATE TABLE IF NOT EXISTS frame_tags ( frame_id INTEGER, tag_id INTEGER, PRIMARY KEY (frame_id, tag_id), FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE );
`);

// --- API Helper Function for Tags ---
const getTagsFor = (table, id) => {
    const stmt = db.prepare(`SELECT t.name, t.color_hex FROM tags t JOIN ${table}_tags nt ON t.id = nt.tag_id WHERE nt.${table}_id = ?`);
    return stmt.all(id) || [];
};

// --- API ROUTES (No changes to logic) ---
app.get("/api/all", (req, res) => {
    try {
        const notes = db
            .prepare("SELECT * FROM notes")
            .all()
            .map((n) => ({ ...n, tags: getTagsFor("note", n.id) }));
        const frames = db
            .prepare("SELECT * FROM frames")
            .all()
            .map((f) => ({ ...f, tags: getTagsFor("frame", f.id) }));
        const tags = db.prepare("SELECT * FROM tags ORDER BY name").all();
        res.status(200).json({ notes, frames, tags });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/search", (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(200).json({ noteIds: [], frameIds: [] });
        const searchQuery = `%${query}%`;
        const noteIds = db
            .prepare(`SELECT id FROM notes WHERE content LIKE ?`)
            .all(searchQuery)
            .map((row) => row.id);
        const frameIds = db
            .prepare(`SELECT id FROM frames WHERE title LIKE ?`)
            .all(searchQuery)
            .map((row) => row.id);
        res.status(200).json({ noteIds, frameIds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/notes", (req, res) => {
    try {
        const { content, pos_x, pos_y, width, height, color_hex } = req.body;
        const stmt = db.prepare("INSERT INTO notes (content, pos_x, pos_y, width, height, color_hex) VALUES (?, ?, ?, ?, ?, ?)");
        const info = stmt.run(content, pos_x, pos_y, width, height, color_hex);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body, tags: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put("/api/notes/:id", (req, res) => {
    try {
        const { content, pos_x, pos_y, width, height, color_hex, frame_id } = req.body;
        const stmt = db.prepare("UPDATE notes SET content = ?, pos_x = ?, pos_y = ?, width = ?, height = ?, color_hex = ?, frame_id = ? WHERE id = ?");
        stmt.run(content, pos_x, pos_y, width, height, color_hex, frame_id ?? null, req.params.id);
        res.status(200).json({ message: "Note updated" });
    } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ error: error.message });
    }
});
app.delete("/api/notes/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
        res.status(200).json({ message: "Note deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/frames", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height } = req.body;
        const stmt = db.prepare("INSERT INTO frames (title, pos_x, pos_y, width, height, is_collapsed) VALUES (?, ?, ?, ?, ?, 0)");
        const info = stmt.run(title, pos_x, pos_y, width, height);
        res.status(201).json({ id: info.lastInsertRowid, ...req.body, is_collapsed: 0, tags: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put("/api/frames/:id", (req, res) => {
    try {
        const { title, pos_x, pos_y, width, height, is_collapsed } = req.body;
        const stmt = db.prepare("UPDATE frames SET title = ?, pos_x = ?, pos_y = ?, width = ?, height = ?, is_collapsed = ? WHERE id = ?");
        stmt.run(title, pos_x, pos_y, width, height, is_collapsed ? 1 : 0, req.params.id);
        res.status(200).json({ message: "Frame updated" });
    } catch (error) {
        console.error("Error updating frame:", error);
        res.status(500).json({ error: error.message });
    }
});
app.delete("/api/frames/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM frames WHERE id = ?").run(req.params.id);
        res.status(200).json({ message: "Frame and its notes deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const addTagTo = db.transaction((table, itemId, tagName) => {
    let tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
    if (!tag) {
        const info = db.prepare("INSERT INTO tags (name) VALUES (?)").run(tagName);
        tag = { id: info.lastInsertRowid };
    }
    db.prepare(`INSERT OR IGNORE INTO ${table}_tags (${table}_id, tag_id) VALUES (?, ?)`).run(itemId, tag.id);
});
app.put("/api/tags/:name", (req, res) => {
    try {
        const { name } = req.params;
        const { color_hex } = req.body;
        if (!color_hex) return res.status(400).json({ error: "color_hex is required." });
        const info = db.prepare("UPDATE tags SET color_hex = ? WHERE name = ?").run(color_hex, name);
        if (info.changes === 0) return res.status(404).json({ message: "Tag not found" });
        res.status(200).json({ message: `Tag '${name}' color updated` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete("/api/tags/:name", (req, res) => {
    try {
        const { name } = req.params;
        const info = db.prepare("DELETE FROM tags WHERE name = ?").run(name);
        if (info.changes === 0) return res.status(404).json({ message: "Tag not found" });
        res.status(200).json({ message: `Tag '${name}' was deleted globally.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post("/api/:itemType(notes|frames)/:itemId/tags", (req, res) => {
    try {
        const { itemType, itemId } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Tag name is required." });
        addTagTo(itemType.slice(0, -1), itemId, name.toLowerCase());
        res.status(201).json({ message: "Tag added" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete("/api/:itemType(notes|frames)/:itemId/tags/:tagName", (req, res) => {
    try {
        const { itemType, itemId, tagName } = req.params;
        const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
        if (tag) {
            db.prepare(`DELETE FROM ${itemType.slice(0, -1)}_tags WHERE ${itemType.slice(0, -1)}_id = ? AND tag_id = ?`).run(itemId, tag.id);
        }
        res.status(200).json({ message: `Tag '${tagName}' removed` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Backend server MVP+ running on http://localhost:${PORT}`));
