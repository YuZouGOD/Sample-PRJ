const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { checkAllServices } = require('./utils/service-check');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

let mainWindow;
let dockerProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../electron-frontend/build/index.html'));
    }
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// HANDLERS
ipcMain.handle('select-install-path', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Seleccione la carpeta de instalación',
    });
    return canceled ? null : filePaths[0];
});

ipcMain.handle('check-docker', async () => {
    return new Promise((resolve) => exec('docker --version', (err) => resolve(!err)));
});

ipcMain.handle('check-docker-compose', async () => {
    return new Promise((resolve) => {
        // Intentamos primero con el comando moderno
        exec('docker compose version', (err) => {
            if (!err) return resolve(true);
            // Si falla, intentamos con el ejecutable antiguo
            exec('docker-compose --version', (err2) => {
                resolve(!err2);
            });
        });
    });
});

ipcMain.handle('start-services', async (event, installPath) => {
    const isDev = process.env.NODE_ENV === 'development';
    const composePath = isDev
        ? path.join(__dirname, '..', 'server-services', 'docker-compose.yml')
        : path.join(process.resourcesPath, 'server-services', 'docker-compose.yml');

    const localIP = getLocalIP();
    const secretPassword = crypto.randomBytes(8).toString('hex');

    return new Promise((resolve, reject) => {
        const cmd = process.platform === 'win32' ? 'docker' : 'docker-compose';
        const args = process.platform === 'win32'
            ? ['compose', '-f', composePath, 'up', '-d']
            : ['-f', composePath, 'up', '-d'];

        dockerProcess = spawn(cmd, args, {
            env: { ...process.env, MONGO_PASS: secretPassword },
            // Solo usamos shell en Windows para evitar el warning de seguridad y errores en Linux
            shell: process.platform === 'win32'
        });

        dockerProcess.on('error', (err) => {
            console.error("Fallo al ejecutar el comando:", err);
            event.sender.send('update-status', `Error: No se pudo ejecutar ${cmd}`);
            dockerProcess = null;
            reject({ success: false, error: err.message });
        });

        dockerProcess.stdout.on('data', (data) => event.sender.send('update-status', data.toString()));
        dockerProcess.stderr.on('data', (data) => event.sender.send('update-status', data.toString()));


        dockerProcess.stdout.on('data', (data) => event.sender.send('update-status', data.toString()));
        dockerProcess.stderr.on('data', (data) => event.sender.send('update-status', data.toString()));

        dockerProcess.on('close', async (code) => {
            dockerProcess = null;
            if (code !== 0) return reject({ success: false, error: 'Docker falló al iniciar' });

            event.sender.send('update-status', '>>> Contenedores creados. Verificando servicios...');

            // HEALTH CHECK
            let allReady = false;
            let attempts = 0;
            while (!allReady && attempts < 15) {
                const results = await checkAllServices();
                allReady = results.every(s => s.status === 'running');
                if (!allReady) {
                    attempts++;
                    event.sender.send('update-status', `Esperando servicios (${attempts}/15)...`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (allReady) {
                // GENERAR ARCHIVOS DE CONFIGURACIÓN
                const envContent = [
                    '# Configuración Generada por el Instalador',
                    `SERVER_IP=${localIP}`,
                    `REACT_APP_MONGO_URI=mongodb://admin:${secretPassword}@${localIP}:27017`,
                    `REACT_APP_REDIS_URL=redis://${localIP}:6379`,
                    `REACT_APP_MINIO_ENDPOINT=${localIP}`,
                    `REACT_APP_MINIO_PORT=9000`,
                    `REACT_APP_MINIO_ACCESS_KEY=minioadmin`,
                    `REACT_APP_MINIO_SECRET_KEY=${secretPassword}`,
                    `REACT_APP_CHROMA_URL=http://${localIP}:8000`,
                    `INSTALL_DATE=${new Date().toISOString()}`,
                    `INSTALL_PATH=${installPath}`
                ].join('\n');

                try {
                    // Guardar .env en la carpeta elegida
                    fs.writeFileSync(path.join(installPath, '.env'), envContent);

                    // Guardar pass en la carpeta de servicios para persistencia de docker
                    const servicesEnvPath = path.join(path.dirname(composePath), '.env');
                    fs.writeFileSync(servicesEnvPath, `MONGO_PASS=${secretPassword}`);

                    event.sender.send('update-status', '[!] Configuración de Intranet generada correctamente.');
                    resolve({ success: true });
                } catch (err) {
                    reject({ success: false, error: 'Error al escribir configuración: ' + err.message });
                }
            } else {
                reject({ success: false, error: 'Los servicios no respondieron a tiempo.' });
            }
        });

        dockerProcess.on('error', (err) => {
            dockerProcess = null;
            reject({ success: false, error: err.message });
        });
    });
});

ipcMain.handle('cancel-services', async () => {
    if (dockerProcess) {
        dockerProcess.kill('SIGINT');
        dockerProcess = null;
        return { success: true };
    }
    return { success: false };
});

// App lifecycle
app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());