// electron/services/db-service.js
const Datastore = require('nedb-promises');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const DB_PATH = path.join(app.getPath('userData'), 'secure.db');
const MASTER_PASSWORD = 'this-should-be-securely-obtained-from-user'; // In a real app, use a login prompt
const SALT = 'nas-m-cryptor-static-salt'; // Static salt for this example

class DatabaseService {
  constructor() {
    this.db = null;
    this.masterKey = null;
  }

  // Initialize the service: derive the master key and load the database.
  async init() {
    this.masterKey = crypto.pbkdf2Sync(MASTER_PASSWORD, SALT, 100000, 32, 'sha512');
    await this._load();
  }

  // Load and decrypt the database from disk.
  async _load() {
    try {
      const encryptedData = await fs.readFile(DB_PATH);
      const iv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(16, 32);
      const ciphertext = encryptedData.slice(32);

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      
      // nedb can load from a string dump.
      this.db = Datastore.create({ inMemoryOnly: true });
      await this.db.loadDatabase();
      const docs = JSON.parse(decrypted.toString('utf-8'));
      await this.db.insert(docs);

    } catch (error) {
      // If file doesn't exist or is corrupt, create a new DB.
      this.db = Datastore.create({ inMemoryOnly: true });
    }
  }

  // Encrypt and persist the database to disk.
  async _persist() {
    const docs = await this.db.find({});
    const data = JSON.stringify(docs);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    await fs.writeFile(DB_PATH, Buffer.concat([iv, authTag, encrypted]));
  }

  // --- Public API ---
  async getKeys() { return this.db.find({ type: 'key' }); }
  async saveKey(key) {
    const result = await this.db.update({ _id: key._id }, { ...key, type: 'key' }, { upsert: true });
    await this._persist();
    return result;
  }
  async deleteKey(keyId) {
    const result = await this.db.remove({ _id: keyId, type: 'key' });
    await this._persist();
    return result;
  }
  
  async getPeers() { return this.db.find({ type: 'peer' }); }
  // More peer methods would go here...
}

module.exports = new DatabaseService();