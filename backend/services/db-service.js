// backend/services/db-service.js
const Datastore = require('nedb-promises');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
// REMOVED: const { app } = require('electron'); // This caused the crash

// CONSTANTS
const MASTER_PASSWORD = 'this-should-be-securely-obtained-from-user';
const SALT = 'nas-m-cryptor-static-salt';

class DatabaseService {
  constructor() {
    this.db = null;
    this.masterKey = null;
    this.dbPath = null; // Path will be set in init()
  }

  // Initialize: Derived key + Load DB. 
  // userDataPath is passed from server.js (who got it from main.js)
  async init(userDataPath) {
    if (!userDataPath) throw new Error("DatabaseService initialized without path");
    
    this.dbPath = path.join(userDataPath, 'secure.db');
    this.masterKey = crypto.pbkdf2Sync(MASTER_PASSWORD, SALT, 100000, 32, 'sha512');
    await this._load();
  }

  async _load() {
    try {
      const encryptedData = await fs.readFile(this.dbPath);
      const iv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(16, 32);
      const ciphertext = encryptedData.slice(32);

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      
      this.db = Datastore.create({ inMemoryOnly: true });
      await this.db.loadDatabase();
      const docs = JSON.parse(decrypted.toString('utf-8'));
      await this.db.insert(docs);
      console.log("Secure DB loaded successfully.");

    } catch (error) {
      console.log("Creating new Secure DB at", this.dbPath);
      this.db = Datastore.create({ inMemoryOnly: true });
    }
  }

  async _persist() {
    if (!this.db) return;
    const docs = await this.db.find({});
    const data = JSON.stringify(docs);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    await fs.writeFile(this.dbPath, Buffer.concat([iv, authTag, encrypted]));
  }

  async getKeys() { return this.db ? this.db.find({ type: 'key' }) : []; }
  
  async saveKey(key) {
    if (!this.db) return null;
    const result = await this.db.update({ _id: key._id }, { ...key, type: 'key' }, { upsert: true });
    await this._persist();
    return result;
  }
  
  async deleteKey(keyId) {
    if (!this.db) return null;
    const result = await this.db.remove({ _id: keyId, type: 'key' });
    await this._persist();
    return result;
  }
  
  async getPeers() { return this.db ? this.db.find({ type: 'peer' }) : []; }
  async addPeer(peerName, seedFilePath) {
      // Stub for peer addition
      const peer = { peerName, seedFilePath, type: 'peer' };
      await this.db.insert(peer);
      await this._persist();
      return peer;
  }
}

module.exports = new DatabaseService();