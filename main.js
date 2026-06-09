const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
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

app.whenReady().then(createWindow);

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
