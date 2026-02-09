// backend/services/system-service.js
const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');

class SystemService {
  
  // Open a URL or File using the default OS handler
  async openExternal(target) {
    const platform = os.platform();
    let command;
    
    // Determine the command based on OS
    if (platform === 'win32') {
      command = `start "" "${target}"`;
    } else if (platform === 'darwin') {
      command = `open "${target}"`;
    } else {
      command = `xdg-open "${target}"`;
    }

    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) {
            console.error(`Exec error: ${error}`);
            // Don't reject, sometimes 'start' returns distinct codes
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