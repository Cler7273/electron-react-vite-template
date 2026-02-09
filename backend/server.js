// backend/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fileService = require('./services/file-service'); // We will move our services here
const dbService = require('./services/db-service');
const p2pService = require('./services/p2p-service');

const PORT = 4000;
const app = express();

// The secret token is passed as a command-line argument from the Electron main process.
const SECRET_TOKEN = process.argv[2];
if (!SECRET_TOKEN) {
  console.error('FATAL ERROR: Server started without a secret token.');
  process.exit(1);
}

// --- Middleware ---
app.use(cors()); // Allow requests from our Vite frontend
app.use(express.json());

// Security Middleware: Every single request must have the correct token.
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return res.status(403).json({ error: 'Forbidden: Invalid authentication token.' });
  }
  next();
});

// --- API Routes ---

// Keys
app.get('/api/keys', async (req, res) => res.json(await dbService.getKeys()));
app.post('/api/keys', async (req, res) => res.json(await dbService.saveKey(req.body)));
app.delete('/api/keys/:id', async (req, res) => res.json(await dbService.deleteKey(req.params.id)));

// Peers
app.get('/api/peers', async (req, res) => res.json(await dbService.getPeers()));
app.post('/api/peers', async (req, res) => {
  const { peerName, seedFilePath } = req.body;
  res.json(await dbService.addPeer(peerName, seedFilePath));
});

// File Operations
// Note: We pass file paths, not file data, for efficiency.
app.post('/api/encrypt', async (req, res) => {
  const { filePath, keyConfig, intensity } = req.body;
  // We don't have a progress callback here, this would require WebSockets for real-time updates.
  // For now, we return the final result.
  res.json(await fileService.encryptFile(filePath, keyConfig, intensity));
});

app.post('/api/decrypt', async (req, res) => {
  const { filePath, keyConfig } = req.body;
  res.json(await fileService.decryptFile(filePath, keyConfig));
});

// --- Server Startup ---
app.listen(PORT, '127.0.0.1', () => {
  console.log(`NASMCryptor backend listening securely on http://127.0.0.1:${PORT}`);
  dbService.init(); // Initialize the database once the server is ready.
});