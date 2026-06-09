const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    theme: 'dark',
    accentColor: '#6c5ce7',
    sidebarOpen: false,
    sidebarPanel: 'ai',
    homepage: 'aspire://newtab',
    searchEngine: 'https://www.google.com/search?q=',
    quickAccess: [
      { name: 'Pinterest', url: 'https://www.pinterest.com', icon: '📌' },
      { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' },
      { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
      { name: 'Discord', url: 'https://discord.com', icon: '💬' }
    ],
    blockedTrackers: true,
    httpsOnly: true,
    adBlock: true
  }
});

let mainWindow;
let popoutWindows = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, 'aspire-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  mainWindow.loadFile('browser.html');

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Security: block known trackers
  if (store.get('blockedTrackers')) {
    setupTrackerBlocking();
  }
}

function setupTrackerBlocking() {
  const blockedDomains = [
    'googleadservices.com',
    'doubleclick.net',
    'facebook.net',
    'facebook.com/tr',
    'analytics.google.com',
    'google-analytics.com',
    'adservice.google.com',
    'pagead2.googlesyndication.com',
    'tracking.',
    'tracker.',
    'ads.',
    'adserver.'
  ];

  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url.toLowerCase();
    const shouldBlock = blockedDomains.some(domain => url.includes(domain));
    callback({ cancel: shouldBlock });
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

// ---- Auto Updater ----
function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info.version);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', Math.round(progress.percent));
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    console.log('Auto-updater error:', err.message);
  });

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('get-settings', () => store.store);
ipcMain.handle('set-setting', (_, key, value) => {
  store.set(key, value);
  return true;
});
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow.close());
ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized());

// ---- Auto Update IPC ----
ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate();
});
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});
ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch(() => {});
});

// ---- Pop-out Windows ----
ipcMain.handle('popout-panel', (_, panel) => {
  if (popoutWindows[panel]) {
    popoutWindows[panel].focus();
    return;
  }

  const titles = { ai: 'Aspire AI', chat: 'Guild Chat' };
  const win = new BrowserWindow({
    width: 420,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, 'aspire-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('popout.html', { query: { panel } });

  win.on('closed', () => {
    delete popoutWindows[panel];
    if (mainWindow) {
      mainWindow.webContents.send('popout-closed', panel);
    }
  });

  popoutWindows[panel] = win;
});

ipcMain.handle('popout-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.handle('popout-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// ---- Discord OAuth ----
ipcMain.handle('discord-login', async () => {
  const clientId = store.get('discordClientId');
  if (!clientId) {
    return { error: 'Set your Discord Client ID in Settings first.' };
  }

  const redirectUri = 'http://localhost:59283/callback';
  const scope = 'identify';
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

  return new Promise((resolve) => {
    const http = require('http');
    let server;

    // Temporary local server to capture the OAuth callback
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:59283');
      const code = url.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body style="background:#0a0a0f;color:#f0f0f5;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>Signed in! You can close this window.</h2></body></html>');

        try {
          // Exchange code for token
          const fetch = require('electron').net.fetch || globalThis.fetch;
          const tokenRes = await (await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri
            }).toString()
          })).json();

          if (tokenRes.access_token) {
            // Get user info
            const userRes = await (await fetch('https://discord.com/api/v10/users/@me', {
              headers: { Authorization: `Bearer ${tokenRes.access_token}` }
            })).json();

            const userData = {
              id: userRes.id,
              username: userRes.global_name || userRes.username,
              avatar: userRes.avatar
                ? `https://cdn.discordapp.com/avatars/${userRes.id}/${userRes.avatar}.png`
                : null,
              accessToken: tokenRes.access_token
            };

            store.set('discordUser', userData);
            resolve({ success: true, user: userData });
          } else {
            resolve({ error: 'Failed to get access token' });
          }
        } catch (err) {
          resolve({ error: err.message });
        }

        server.close();
      }
    });

    server.listen(59283, () => {
      const authWin = new BrowserWindow({
        width: 500,
        height: 700,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'aspire-logo.png')
      });
      authWin.loadURL(authUrl);
      authWin.on('closed', () => {
        server.close();
        resolve({ error: 'Auth window closed' });
      });
    });
  });
});

ipcMain.handle('discord-logout', () => {
  store.delete('discordUser');
  return true;
});

ipcMain.handle('get-discord-user', () => {
  return store.get('discordUser') || null;
});
