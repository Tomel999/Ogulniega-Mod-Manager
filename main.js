const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { pipeline } = require('stream/promises');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const CURSEFORGE_API_KEY = 'YOUR CURSEFORGE API KEY HERE';
const CURSEFORGE_API_URL = 'https://api.curseforge.com';
const MINECRAFT_GAME_ID = 432;
const MODS_CLASS_ID = 6;

const FABRIC_LOADER_ID = 4;

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

ipcMain.handle('search-curseforge', async (event, { query, gameVersion, classId }) => {
    if (!fetch) return { success: false, error: 'Moduł fetch nie jest załadowany.' };

    const searchParams = new URLSearchParams({
        gameId: MINECRAFT_GAME_ID,
        classId: classId,
        searchFilter: query,
        sortField: 2,
        sortOrder: 'desc',
    });

    if (classId === MODS_CLASS_ID) {
        searchParams.append('modLoaderType', FABRIC_LOADER_ID);
    }

    if (gameVersion) {
        searchParams.append('gameVersion', gameVersion);
    }

    const url = `${CURSEFORGE_API_URL}/v1/mods/search?${searchParams.toString()}`;
    console.log(`[MainJS] Zapytanie do CurseForge: ${url}`);

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json', 'x-api-key': CURSEFORGE_API_KEY }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Błąd API CurseForge (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        return { success: true, data: data.data };
    } catch (error) {
        console.error('Błąd wyszukiwania na CurseForge:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-mod-files-curseforge', async (event, { modId, gameVersion, category }) => {
    if (!fetch) return { success: false, error: 'Moduł fetch nie jest załadowany.' };

    const searchParams = new URLSearchParams({
        gameId: MINECRAFT_GAME_ID,
    });

    if (category === 'mod') {
        searchParams.append('modLoaderType', FABRIC_LOADER_ID);
    }

    if (gameVersion) {
        searchParams.append('gameVersion', gameVersion);
    }

    const url = `${CURSEFORGE_API_URL}/v1/mods/${modId}/files?${searchParams.toString()}`;
    console.log(`[MainJS] Zapytanie o pliki CurseForge: ${url}`);

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json', 'x-api-key': CURSEFORGE_API_KEY }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Błąd API CurseForge (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        return { success: true, data: data.data };
    } catch (error) {
        console.error('Błąd pobierania plików z CurseForge:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-profile-folders', async () => {
    let baseOgulniegaProfileModsPath = "";
    const profiles = {
        baseProfilePath: null,
        minecraftVersions: new Set(),
        groupedProfileFolders: {}
    };
    const platformPath = os.platform() === 'win32' && process.env.APPDATA
        ? path.join(process.env.APPDATA, '.ogulniega', 'profile', 'mods')
        : path.join(os.homedir(), '.ogulniega', 'profile', 'mods');
    baseOgulniegaProfileModsPath = platformPath;

    try {
        await fs.access(baseOgulniegaProfileModsPath);
        const items = await fs.readdir(baseOgulniegaProfileModsPath, { withFileTypes: true });

        for (const item of items) {
            if (item.isDirectory()) {
                const versionMatch = item.name.match(/(\d+\.\d+(\.\d+)?)/);
                if (versionMatch?.[1]) {
                    const mcVersion = versionMatch[1];
                    profiles.minecraftVersions.add(mcVersion);
                    if (!profiles.groupedProfileFolders[mcVersion]) {
                        profiles.groupedProfileFolders[mcVersion] = [];
                    }
                    profiles.groupedProfileFolders[mcVersion].push({
                        name: item.name,
                        path: path.join(baseOgulniegaProfileModsPath, item.name)
                    });
                }
            }
        }
        profiles.baseProfilePath = baseOgulniegaProfileModsPath;
    } catch (err) {
        console.log(`[MainJS] Bazowy folder profili ${baseOgulniegaProfileModsPath} nie istnieje.`);
    }

    profiles.minecraftVersions = Array.from(profiles.minecraftVersions).sort((a, b) => {
        const vA = a.split('.').map(Number);
        const vB = b.split('.').map(Number);
        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
            if ((vA[i] || 0) !== (vB[i] || 0)) return (vB[i] || 0) - (vA[i] || 0);
        }
        return 0;
    });

    return profiles;
});

ipcMain.handle('get-shader-path', async () => {
  const basePath = os.platform() === 'win32' && process.env.APPDATA
      ? process.env.APPDATA
      : os.homedir();
  return path.join(basePath, '.ogulniega', 'profile', 'shaderpacks');
});

ipcMain.handle('browse-for-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('download-file', async (event, { url, directoryPath, filename }) => {
  if (!fetch) return { success: false, error: 'Moduł fetch nie jest załadowany.' };

  const mainWindow = BrowserWindow.getFocusedWindow();
  const fullPath = path.join(directoryPath, filename);

  try {
    await fs.mkdir(directoryPath, { recursive: true });

    try {
        await fs.access(fullPath);
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Plik już istnieje',
            message: `Plik "${filename}" już istnieje. Czy chcesz go nadpisać?`,
            buttons: ['Tak', 'Nie'],
            defaultId: 1,
            cancelId: 1
        });
        if (response === 1) return { success: false, error: 'Pobieranie anulowane.' };
    } catch (e) {  }

    const response = await fetch(url, { headers: { 'User-Agent': 'OgulniegaModManager/2.0' } });
    if (!response.ok) throw new Error(`Nie udało się pobrać pliku: ${response.statusText}`);

    const totalBytes = Number(response.headers.get('content-length') || 0);
    mainWindow?.webContents.send('download-started', { filename, totalBytes });

    let receivedBytes = 0;
    response.body.on('data', (chunk) => {
        receivedBytes += chunk.length;
        mainWindow?.webContents.send('download-progress', { filename, receivedBytes, totalBytes });
    });

    await pipeline(response.body, require('fs').createWriteStream(fullPath));

    mainWindow?.webContents.send('download-complete', { filename, path: fullPath });
    return { success: true };
  } catch (error) {
    console.error(`Błąd podczas pobierania ${filename}:`, error);
    mainWindow?.webContents.send('download-error', { filename, error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.on('show-error-message', (event, { title, content }) => {
    dialog.showErrorBox(title || 'Błąd', content || 'Wystąpił nieznany błąd.');
});

ipcMain.on('show-info-message', (event, { title, content }) => {
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'info',
        title: title || 'Informacja',
        message: content || '',
        buttons: ['OK']
    });
});

async function checkWindowsHiddenAttribute(filePath) {
    if (os.platform() !== 'win32') return false;
    try {
        const { stdout } = await exec(`attrib "${filePath}"`, { windowsHide: true });
        return stdout.trim().toUpperCase().startsWith('H');
    } catch (e) {
        console.error(`[MainJS] Błąd sprawdzania atrybutu 'ukryty': ${e.message}`);
        return false;
    }
}

ipcMain.handle('get-preinstalled-mods', async (event, profileBasePath) => {
  const preinstalledFolderPath = path.join(profileBasePath, 'preinstalled');
  try {
    await fs.access(preinstalledFolderPath);
    const items = await fs.readdir(preinstalledFolderPath, { withFileTypes: true });

    const filesDataPromises = items
      .filter(item => item.isFile() && item.name.endsWith('.jar'))
      .map(async item => {
        const fullPath = path.join(preinstalledFolderPath, item.name);
        let isHidden = os.platform() === 'win32'
            ? await checkWindowsHiddenAttribute(fullPath)
            : item.name.startsWith('.');
        let displayName = isHidden && os.platform() !== 'win32' ? item.name.substring(1) : item.name;

        return {
          displayName,
          diskName: item.name,
          path: fullPath,
          relativePath: path.relative(profileBasePath, fullPath).replace(/\\/g, '/'),
          isDisabled: isHidden,
        };
      });
    return { success: true, files: await Promise.all(filesDataPromises) };
  } catch (error) {
    if (error.code === 'ENOENT') return { success: true, files: [] };
    console.error(`[MainJS] Błąd odczytu preinstalowanych modów:`, error);
    return { success: false, error: error.message, files: [] };
  }
});

ipcMain.on('show-item-in-folder', (event, filePath) => {
    if (filePath) shell.showItemInFolder(filePath);
});

ipcMain.handle('toggle-mod-state', async (event, currentPath) => {
  try {
    const dirName = path.dirname(currentPath);
    const currentName = path.basename(currentPath);
    let newPath;

    if (os.platform() === 'win32') {
        const isHidden = await checkWindowsHiddenAttribute(currentPath);
        await exec(`attrib ${isHidden ? '-h' : '+h'} "${currentPath}"`, { windowsHide: true });
        newPath = currentPath;
    } else {
        newPath = currentName.startsWith('.')
            ? path.join(dirName, currentName.substring(1))
            : path.join(dirName, `.${currentName}`);
        await fs.rename(currentPath, newPath);
    }
    return { success: true, newPath };
  } catch (error) {
    console.error(`[MainJS] Błąd podczas zmiany stanu moda:`, error);
    return { success: false, error: error.message };
  }
});
