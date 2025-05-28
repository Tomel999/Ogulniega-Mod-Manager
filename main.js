const { app, BrowserWindow, ipcMain, dialog, net, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { pipeline } = require('stream/promises');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let fetch;
import('node-fetch').then(nodeFetch => {
  fetch = nodeFetch.default;
}).catch(err => console.error('Failed to load node-fetch:', err));


function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle('get-profile-folders', async () => {
    let baseOgulniegaProfileModsPath = "";
    const profiles = {
        baseProfilePath: null,
        minecraftVersions: new Set(),
        groupedProfileFolders: {}
    };

    if (os.platform() === 'win32' && process.env.APPDATA) {
        baseOgulniegaProfileModsPath = path.join(process.env.APPDATA, '.ogulniega', 'profile', 'mods');
    } else if (os.platform() === 'darwin') {
        baseOgulniegaProfileModsPath = path.join(os.homedir(), '.ogulniega', 'profile', 'mods');
    } else {
        baseOgulniegaProfileModsPath = path.join(os.homedir(), '.ogulniega', 'profile', 'mods');
    }

    console.log(`[MainJS] Docelowa bazowa ścieżka profili: ${baseOgulniegaProfileModsPath}`);

    try {
        const stats = await fs.stat(baseOgulniegaProfileModsPath);
        if (stats.isDirectory()) {
            profiles.baseProfilePath = baseOgulniegaProfileModsPath;
            console.log(`[MainJS] Znaleziono bazowy folder: ${baseOgulniegaProfileModsPath}`);

            const items = await fs.readdir(baseOgulniegaProfileModsPath);
            for (const itemName of items) {
                const itemFullPath = path.join(baseOgulniegaProfileModsPath, itemName);
                try {
                    const itemStat = await fs.stat(itemFullPath);
                    if (itemStat.isDirectory()) {
                        const versionMatch = itemName.match(/(\d+\.\d+(\.\d+)?)/);
                        if (versionMatch && versionMatch[1]) {
                            const mcVersion = versionMatch[1];
                            profiles.minecraftVersions.add(mcVersion);

                            if (!profiles.groupedProfileFolders[mcVersion]) {
                                profiles.groupedProfileFolders[mcVersion] = [];
                            }
                            profiles.groupedProfileFolders[mcVersion].push({
                                name: itemName,
                                path: itemFullPath
                            });
                        }
                        console.log(`[MainJS] Znaleziono podfolder-profil '${itemName}': ${itemFullPath}`);
                    }
                } catch (e) {
                }
            }
        } else {
            console.log(`[MainJS] Ścieżka ${baseOgulniegaProfileModsPath} istnieje, ale nie jest folderem.`);
        }
    } catch (err) {
        console.log(`[MainJS] Bazowy folder profili ${baseOgulniegaProfileModsPath} nie istnieje lub brak dostępu.`);
    }


    profiles.minecraftVersions = Array.from(profiles.minecraftVersions).sort((a, b) => {
        const normalize = (version) => {
            return version.split('.').map(part => parseInt(part, 10) || 0);
        };
        const vA = normalize(a);
        const vB = normalize(b);

        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
            const numA = vA[i] || 0;
            const numB = vB[i] || 0;
            if (numA !== numB) {
                return numB - numA;
            }
        }
        return 0;
    });

    console.log('[MainJS] Zwracane profile i wyodrębnione wersje Minecrafta do renderera:', profiles);
    return profiles;
});

ipcMain.handle('browse-for-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Wybierz folder docelowy'
  });
  if (canceled || filePaths.length === 0) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('download-file', async (event, { url, directoryPath, filename }) => {
  if (!fetch) {
    console.error('node-fetch is not loaded yet.');
    return { success: false, error: 'Moduł fetch nie jest załadowany.' };
  }
  const mainWindow = BrowserWindow.getFocusedWindow();
  const fullPath = path.join(directoryPath, filename);

  try {
    try {
        await fs.access(fullPath);
        const userResponse = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Plik już istnieje',
            message: `Plik "${filename}" już istnieje w folderze docelowym. Czy chcesz go nadpisać?`,
            buttons: ['Tak', 'Nie'],
            defaultId: 1,
            cancelId: 1
        });
        if (userResponse.response === 1) {
            return { success: false, error: 'Pobieranie anulowane przez użytkownika (plik istnieje).' };
        }
    } catch (e) {
    }

    const response = await fetch(url, {
        headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.8 (NativeHiddenAttribute)' }
    });

    if (!response.ok) {
      throw new Error(`Nie udało się pobrać pliku: ${response.statusText} (status: ${response.status})`);
    }

    const totalBytes = Number(response.headers.get('content-length') || 0);
    let receivedBytes = 0;

    mainWindow.webContents.send('download-started', { filename, totalBytes });

    const fileStream = require('fs').createWriteStream(fullPath);

    response.body.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', { filename, receivedBytes, totalBytes });
        }
    });

    await pipeline(response.body, fileStream);

    if (mainWindow && !mainWindow.isDestroyed()) {
         mainWindow.webContents.send('download-complete', { filename, path: fullPath });
    }
    return { success: true, path: fullPath };

  } catch (error) {
    console.error(`Błąd podczas pobierania pliku ${filename}:`, error);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-error', { filename, error: error.message });
    }
    return { success: false, error: error.message };
  }
});

ipcMain.on('show-error-message', (event, { title, content }) => {
    dialog.showErrorBox(title || 'Błąd', content || 'Wystąpił nieznany błąd.');
});

ipcMain.on('show-info-message', (event, { title, content }) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        dialog.showMessageBox(focusedWindow, {
            type: 'info',
            title: title || 'Informacja',
            message: content || '',
            buttons: ['OK']
        });
    } else {
        console.info(`Info Message (no focused window): ${title} - ${content}`);
    }
});

async function checkWindowsHiddenAttribute(filePath) {
    if (os.platform() !== 'win32') return false;
    try {
        const { stdout } = await exec(`attrib "${filePath}"`, { windowsHide: true });
        const firstLine = stdout.split('\n')[0].trim();
        const pathStartIndex = firstLine.toUpperCase().indexOf(filePath.charAt(0).toUpperCase() + ":\\");
        if (pathStartIndex > 0) {
            const attributesPart = firstLine.substring(0, pathStartIndex).trim();
            return attributesPart.split(/\s+/).includes('H');
        } else if (pathStartIndex === 0 && firstLine.length > filePath.length) {
             const attributesPart = firstLine.substring(0, firstLine.toUpperCase().indexOf(filePath.toUpperCase())).trim();
             return attributesPart.split(/\s+/).includes('H');
        }
        return false;
    } catch (e) {
        console.error(`[MainJS] Błąd sprawdzania atrybutu 'ukryty' dla ${filePath}: ${e.message}`);
        return false;
    }
}

ipcMain.handle('get-preinstalled-mods', async (event, profileBasePath) => {
  const preinstalledFolderPath = path.join(profileBasePath, 'preinstalled');
  console.log(`[MainJS] Odczytywanie preinstalowanych modów z: ${preinstalledFolderPath}`);
  try {
    await fs.access(preinstalledFolderPath);
    const items = await fs.readdir(preinstalledFolderPath, { withFileTypes: true });
    
    const filesDataPromises = items
      .filter(item => item.isFile())
      .map(async item => {
        const fullPathToDiskName = path.join(preinstalledFolderPath, item.name);
        let isHidden = false;
        let displayName = item.name;
        let diskName = item.name;

        if (os.platform() === 'win32') {
            if (item.name.endsWith('.jar')) {
                isHidden = await checkWindowsHiddenAttribute(fullPathToDiskName);
            } else {
                return null;
            }
        } else {
            if (item.name.startsWith('.') && item.name.endsWith('.jar')) {
                isHidden = true;
                displayName = item.name.substring(1);
            } else if (item.name.endsWith('.jar')) {
                isHidden = false;
            } else {
                return null;
            }
        }
        
        const relativePathOnDisk = path.relative(profileBasePath, fullPathToDiskName).replace(/\\/g, '/');

        return {
          displayName: displayName,
          diskName: diskName, 
          path: fullPathToDiskName,
          relativePath: relativePathOnDisk,
          isDisabled: isHidden,
        };
      });

    const resolvedFilesData = (await Promise.all(filesDataPromises)).filter(file => file !== null);
    return { success: true, files: resolvedFilesData };

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`[MainJS] Folder preinstalowanych modów nie znaleziony: ${preinstalledFolderPath}`);
      return { success: true, files: [] };
    }
    console.error(`[MainJS] Błąd podczas odczytu preinstalowanych modów z ${preinstalledFolderPath}:`, error);
    return { success: false, error: error.message, files: [] };
  }
});

ipcMain.on('show-item-in-folder', (event, filePath) => {
    if (filePath) {
        shell.showItemInFolder(filePath);
    }
});

ipcMain.handle('toggle-mod-state', async (event, currentFullPathToDiskName) => {
  try {
    const currentDiskName = path.basename(currentFullPathToDiskName);
    const dirName = path.dirname(currentFullPathToDiskName);
    let newStateIsDisabled;
    let newDiskName = currentDiskName; 
    let newDisplayName = currentDiskName.startsWith('.') ? currentDiskName.substring(1) : currentDiskName;
    let newFullPath = currentFullPathToDiskName;
    let newRelativePath;

    if (os.platform() === 'win32') {
        if (!currentDiskName.endsWith('.jar')) {
            throw new Error('Operacja ukrywania/pokazywania wspierana tylko dla plików .jar');
        }
        const isCurrentlyHidden = await checkWindowsHiddenAttribute(currentFullPathToDiskName);
        const command = `attrib ${isCurrentlyHidden ? '-h' : '+h'} "${currentFullPathToDiskName}"`;
        await exec(command, { windowsHide: true });
        newStateIsDisabled = !isCurrentlyHidden;
        console.log(`[MainJS] Zmieniono atrybut ukrycia dla ${currentDiskName} (Windows). Nowy stan isDisabled: ${newStateIsDisabled}`);
    } else {
        if (currentDiskName.startsWith('.')) { 
            newDiskName = currentDiskName.substring(1);
            newStateIsDisabled = false;
            newDisplayName = newDiskName;
        } else if (currentDiskName.endsWith('.jar')) { 
            newDiskName = '.' + currentDiskName;
            newStateIsDisabled = true;
            newDisplayName = currentDiskName; 
        } else {
            throw new Error('Nieprawidłowy format nazwy pliku moda dla operacji ukryj/pokaż na POSIX.');
        }
        newFullPath = path.join(dirName, newDiskName);
        if (currentFullPathToDiskName !== newFullPath) {
            await fs.rename(currentFullPathToDiskName, newFullPath);
            console.log(`[MainJS] Zmieniono nazwę pliku (POSIX hidden) z ${currentDiskName} na ${newDiskName}`);
        }
    }
    
    const profileBasePath = path.dirname(dirName);
    newRelativePath = path.relative(profileBasePath, newFullPath).replace(/\\/g, '/');

    return { 
        success: true, 
        newStateIsDisabled, 
        newFullPath, 
        newDiskName, 
        newDisplayName,
        newRelativePath
    };
  } catch (error) {
    console.error(`[MainJS] Błąd podczas zmiany stanu ukrycia moda (${currentFullPathToDiskName}):`, error);
    return { success: false, error: error.message };
  }
});
