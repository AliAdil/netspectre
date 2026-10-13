const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const http = require('http');

let mainWindow = null;
let engineProcess = null;

function startEngine() {
  const req = http.get('http://127.0.0.1:48123/api/status', (res) => {
    console.log('[NETSPECTRE] Native engine is already running on port 48123');
  });

  req.on('error', () => {
    const enginePath = path.join(__dirname, '..', 'src-engine', 'NetSpectreEngine.exe');
    console.log('[NETSPECTRE] Spawning native telemetry engine:', enginePath);

    try {
      engineProcess = spawn(enginePath, ['--port', '48123'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      engineProcess.stdout.on('data', (data) => {
        console.log(`[ENGINE] ${data.toString().trim()}`);
      });

      engineProcess.stderr.on('data', (data) => {
        console.error(`[ENGINE ERR] ${data.toString().trim()}`);
      });

      engineProcess.on('exit', (code) => {
        console.log(`[ENGINE] Process exited with code ${code}`);
      });
    } catch (err) {
      console.error('[NETSPECTRE] Failed to spawn engine:', err);
    }
  });
}

function stopEngine() {
  if (engineProcess) {
    console.log('[NETSPECTRE] Terminating native telemetry engine...');
    try {
      engineProcess.kill();
    } catch (e) {}
    engineProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#070a13',
    title: 'NETSPECTRE — Real-Time Windows Network Intelligence',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(prodPath);

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[NETSPECTRE] Renderer finished loading');
    setTimeout(async () => {
      try {
          let img = await mainWindow.webContents.capturePage();
          const fs = require('fs');
          const shotPath = path.join(__dirname, '..', 'netspectre_live_window.png');
          fs.writeFileSync(shotPath, img.toPNG());
          console.log('[NETSPECTRE] Captured live window screenshot to:', shotPath);

          if (process.argv.includes('--capture-all')) {
            console.log('[NETSPECTRE] Capturing Personal Workspace (Network Doctor)...');
            await mainWindow.webContents.executeJavaScript(`
              window.__useNetworkStore?.getState().setActiveWorkspace('personal');
              window.__useNetworkStore?.getState().setActiveScreen('network-doctor');
            `);
            await new Promise((r) => setTimeout(r, 2000));
            img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '..', 'netspectre_doctor.png'), img.toPNG());
            console.log('[NETSPECTRE] Captured netspectre_doctor.png');

            console.log('[NETSPECTRE] Capturing Personal Workspace (App Firewall)...');
            await mainWindow.webContents.executeJavaScript(`
              window.__useNetworkStore?.getState().setActiveScreen('firewall');
            `);
            await new Promise((r) => setTimeout(r, 1500));
            img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '..', 'netspectre_firewall.png'), img.toPNG());
            console.log('[NETSPECTRE] Captured netspectre_firewall.png');

            console.log('[NETSPECTRE] Capturing Developer Workspace (API Traffic Debugger)...');
            await mainWindow.webContents.executeJavaScript(`
              window.__useNetworkStore?.getState().setActiveWorkspace('developer');
              window.__useNetworkStore?.getState().setActiveScreen('api-debugger');
            `);
            await new Promise((r) => setTimeout(r, 1500));
            img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '..', 'netspectre_api_debugger.png'), img.toPNG());
            console.log('[NETSPECTRE] Captured netspectre_api_debugger.png');

            console.log('[NETSPECTRE] Capturing Operations Workspace (Troubleshooting Workbench)...');
            await mainWindow.webContents.executeJavaScript(`
              window.__useNetworkStore?.getState().setActiveWorkspace('operations');
              window.__useNetworkStore?.getState().setActiveScreen('workbench');
            `);
            await new Promise((r) => setTimeout(r, 1500));
            img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '..', 'netspectre_workbench.png'), img.toPNG());
            console.log('[NETSPECTRE] Captured netspectre_workbench.png');

            console.log('[NETSPECTRE] Capturing Operations Workspace (Neural Highway Universe)...');
            await mainWindow.webContents.executeJavaScript(`
              window.__useNetworkStore?.getState().setActiveScreen('command-center');
              window.__useNetworkStore?.getState().setVisMode('neural-flow');
            `);
            await new Promise((r) => setTimeout(r, 2000));
            img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '..', 'netspectre_neural_highway.png'), img.toPNG());
            console.log('[NETSPECTRE] Captured netspectre_neural_highway.png');
          }

          if (process.argv.includes('--capture-and-exit') || process.argv.includes('--capture-all')) {
            console.log('[NETSPECTRE] Exiting as requested by CLI capture flag');
            setTimeout(() => app.quit(), 500);
          }
      } catch (err) {
        console.error('[NETSPECTRE] Screenshot capture error:', err);
      }
    }, 6500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startEngine();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopEngine();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  stopEngine();
});
