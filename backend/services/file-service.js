// electron/services/file-service.js
const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');
const { processBuffer } = require('./nasm-engine');

class FileService {
  async encryptFile(filePath, keyConfig, intensity, savePath = null, onProgress = () => {}, onNotify = () => {}) {
    try {
      onProgress(0);
      onNotify({ title: 'Encryption', body: `Reading file ${path.basename(filePath)}...` });
      const sourceBuffer = await fs.readFile(filePath);

      onNotify({ title: 'Encryption', body: `Encrypting... This may take a while.` });
      const encryptedBuffer = processBuffer(sourceBuffer, keyConfig, intensity, (p) => onProgress(p));
      
      let finalSavePath = savePath;
      if (!finalSavePath) {
        const { canceled, filePath: chosenPath } = await dialog.showSaveDialog({
          defaultPath: `${filePath}.nasm`,
        });

        if (canceled || !chosenPath) {
          onNotify({ title: 'Cancelled', body: 'Save operation was cancelled.' });
          return { success: false, error: 'Cancelled by user.' };
        }

        finalSavePath = chosenPath;
      }

      await fs.writeFile(finalSavePath, encryptedBuffer);
      onNotify({ title: 'Success', body: `File successfully encrypted to ${path.basename(finalSavePath)}` });
      return { success: true, path: finalSavePath };

    } catch (error) {
      console.error('Encryption failed:', error);
      onNotify({ title: 'Error', body: `Encryption failed: ${error.message}` });
      return { success: false, error: error.message };
    }
  }

  async decryptFile(filePath, keyConfig, savePath = null, onProgress = () => {}, onNotify = () => {}) {
    // Similar structure to encryptFile, but calls processBuffer and suggests a decrypted filename.
    try {
      onProgress(0);
      onNotify({ title: 'Decryption', body: `Reading file ${path.basename(filePath)}...` });
      const sourceBuffer = await fs.readFile(filePath);

      onNotify({ title: 'Decryption', body: `Decrypting...` });
      const decryptedBuffer = processBuffer(sourceBuffer, keyConfig, 1, (p) => onProgress(p)); // Intensity is 1 for decryption

      const originalName = filePath.endsWith('.nasm') ? filePath.slice(0, -5) : `${filePath}.decrypted`;
      let finalSavePath = savePath;
      if (!finalSavePath) {
        const { canceled, filePath: chosenPath } = await dialog.showSaveDialog({
          defaultPath: originalName,
        });

        if (canceled || !chosenPath) {
          onNotify({ title: 'Cancelled', body: 'Save operation was cancelled.' });
          return { success: false, error: 'Cancelled by user.' };
        }

        finalSavePath = chosenPath;
      }

      await fs.writeFile(finalSavePath, decryptedBuffer);
      onNotify({ title: 'Success', body: `File successfully decrypted to ${path.basename(finalSavePath)}` });
      return { success: true, path: finalSavePath };

    } catch (error) {
      console.error('Decryption failed:', error);
      onNotify({ title: 'Error', body: `Decryption failed: ${error.message}` });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FileService();