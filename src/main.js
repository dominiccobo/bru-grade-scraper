const scraper = require('./Scraper');

const { app, BrowserWindow } = require('electron');
const ipc = require('electron').ipcMain;

let win;


function createWindow () {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.loadFile('src/templates/index.html');
    // Emitted when the window is closed.
    win.on('closed', () => {
        win = null;
    })
}

app.on('ready', createWindow);


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

ipc.on('download', async function(event, arg) {
   const username = arg.username;
   const password = arg.password;

    let results = await scraper.scraper(username, password);
    win.webContents.send('downloaded', results);
});
