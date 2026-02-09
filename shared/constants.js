// shared/constants.js
// This contract ensures the frontend and backend always speak the same language.
// Changing a value here updates it everywhere.

module.exports = {
  IPC_CHANNELS: {
    // File operations
    FILE_SELECT: 'file:select',
    FILE_ENCRYPT: 'file:encrypt',
    FILE_DECRYPT: 'file:decrypt',
    
    // Database: Keys
    DB_GET_KEYS: 'db:get-keys',
    DB_SAVE_KEY: 'db:save-key',
    DB_DELETE_KEY: 'db:delete-key',

    // Database: Peers & Seeds
    DB_GET_PEERS: 'db:get-peers',
    DB_ADD_PEER: 'db:add-peer',

    // P2P operations
    P2P_CREATE_SEED: 'p2p:create-seed',
    P2P_SEND_FILE: 'p2p:send-file',

    // UI Notifications
    NOTIFY_USER: 'notify:user',
    NOTIFY_PROGRESS: 'notify:progress',
  }
};