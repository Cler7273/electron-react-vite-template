// backend/services/system-service.js
const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');

class SystemService {
  
  // Open a URL or File using the default OS handler
  async openExternal(target) {
    const platform = os.platform();
    let command;
    
    // NORMALIZE PATH: Fix mixed slashes for Windows
    const safeTarget = path.normalize(target);

    if (platform === 'win32') {
      // WINDOWS FIX: 
      // 1. "start" needs a dummy title argument ("") before the path.
      // 2. We wrap the path in quotes to handle spaces.
      command = `start "" "${safeTarget}"`;
    } else if (platform === 'darwin') {
      command = `open "${safeTarget}"`;
    } else {
      command = `xdg-open "${safeTarget}"`;
    }

    console.log(`[System] Executing: ${command}`); // Debug log

    return new Promise((resolve) => {
      exec(command, (error) => {
        if (error) {
            console.error(`[System] Exec error: ${error.message}`);
            resolve({ success: false, error: error.message });
        } else {
            resolve({ success: true });
        }
      });
    });
  }

  // Execute a specific command (e.g., Run a Python script for MPSI)
  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { shell: true });
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => stdout += data.toString());
      process.stderr.on('data', (data) => stderr += data.toString());

      process.on('close', (code) => {
        resolve({ 
            success: code === 0, 
            output: stdout, 
            error: stderr,
            code 
        });
      });
    });
  }
}

module.exports = new SystemService();