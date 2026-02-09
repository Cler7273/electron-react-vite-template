// electron/services/file-service.js
const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');
const { processBuffer } = require('./nasm-engine');

class FileService {
  async encryptFile(filePath, keyConfig, intensity, onProgress, onNotify) {
    try {
      onProgress(0);
      onNotify({ title: 'Encryption', body: `Reading file ${path.basename(filePath)}...` });
      const sourceBuffer = await fs.readFile(filePath);

      onNotify({ title: 'Encryption', body: `Encrypting... This may take a while.` });
      const encryptedBuffer = processBuffer(sourceBuffer, keyConfig, intensity, (p) => onProgress(p));
      
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        defaultPath: `${filePath}.nasm`,
      });

      if (canceled || !savePath) {
        onNotify({ title: 'Cancelled', body: 'Save operation was cancelled.' });
        return { success: false, error: 'Cancelled by user.' };
      }

      await fs.writeFile(savePath, encryptedBuffer);
      onNotify({ title: 'Success', body: `File successfully encrypted to ${path.basename(savePath)}` });
      return { success: true, path: savePath };

    } catch (error) {
      console.error('Encryption failed:', error);
      onNotify({ title: 'Error', body: `Encryption failed: ${error.message}` });
      return { success: false, error: error.message };
    }
  }

  async decryptFile(filePath, keyConfig, onProgress, onNotify) {
    // Similar structure to encryptFile, but calls processBuffer and suggests a decrypted filename.
    try {
      onProgress(0);
      onNotify({ title: 'Decryption', body: `Reading file ${path.basename(filePath)}...` });
      const sourceBuffer = await fs.readFile(filePath);

      onNotify({ title: 'Decryption', body: `Decrypting...` });
      const decryptedBuffer = processBuffer(sourceBuffer, keyConfig, 1, (p) => onProgress(p)); // Intensity is 1 for decryption

      const originalName = filePath.endsWith('.nasm') ? filePath.slice(0, -5) : `${filePath}.decrypted`;
      const { canceled, filePath: savePath } = await dialog.showSaveDialog({
        defaultPath: originalName,
      });

      if (canceled || !savePath) {
        onNotify({ title: 'Cancelled', body: 'Save operation was cancelled.' });
        return { success: false, error: 'Cancelled by user.' };
      }

      await fs.writeFile(savePath, decryptedBuffer);
      onNotify({ title: 'Success', body: `File successfully decrypted to ${path.basename(savePath)}` });
      return { success: true, path: savePath };

    } catch (error) {
      console.error('Decryption failed:', error);
      onNotify({ title: 'Error', body: `Decryption failed: ${error.message}` });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FileService();