const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Fix for Windows invisible / transparent window bug (GPU acceleration conflict)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Permanent File Database Storage in userData
function getDbFilePath() {
  return path.join(app.getPath('userData'), 'estimate_database.json');
}

function readDatabase() {
  try {
    const file = getDbFilePath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read estimate_database.json:', err);
  }
  return {};
}

function writeDatabase(data) {
  try {
    const file = getDbFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write estimate_database.json:', err);
  }
}

ipcMain.handle('db:get', (_event, key) => {
  const db = readDatabase();
  return db[key] !== undefined ? db[key] : null;
});

ipcMain.handle('db:set', (_event, key, value) => {
  const db = readDatabase();
  db[key] = value;
  writeDatabase(db);
  return true;
});

ipcMain.handle('db:getAll', () => {
  return readDatabase();
});

ipcMain.handle('db:saveAll', (_event, allData) => {
  writeDatabase(allData);
  return true;
});

let localServer = null;
const PREFERRED_PORT = 48753;

function startStaticServer(callback) {
  const distDir = path.join(app.getAppPath(), 'dist');

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || !reqPath) {
      reqPath = '/index.html';
    }

    const filePath = path.join(distDir, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(distDir, 'index.html'), (errIndex, indexData) => {
          if (errIndex) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(indexData);
          }
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PREFERRED_PORT} in use, using dynamic fallback...`);
      server.listen(0, '127.0.0.1', () => {
        callback(server, server.address().port);
      });
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(PREFERRED_PORT, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(`Internal offline server running on fixed origin http://127.0.0.1:${port}`);
    callback(server, port);
  });
}

function createWindow(port) {
  const iconCandidates = [
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'public', 'app-icon.png'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'dist', 'app-icon.png'),
    path.join(app.getAppPath(), 'public', 'app-icon.png'),
  ];
  const iconPath = iconCandidates.find((p) => fs.existsSync(p));

  const win = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 420,
    minHeight: 480,
    title: 'InvoicePro - Offline Estimate Bill Printer',
    icon: iconPath,
    autoHideMenuBar: false,
    show: true,
    center: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadURL(`http://127.0.0.1:${port}/`).then(() => {
    win.show();
    win.focus();
  }).catch((err) => {
    console.error('Failed to load URL:', err);
  });
}

app.whenReady().then(() => {
  startStaticServer((server, port) => {
    localServer = server;
    createWindow(port);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (localServer) {
        createWindow(localServer.address().port);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
