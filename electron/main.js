const { app, BrowserWindow, ipcMain, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1550,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // For development: load localhost (change to built out path in production)
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:3001");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "../frontend/out/index.html");
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      // Fallback
      mainWindow.loadURL("http://localhost:3001");
    }
  }

  // Intercept Navigation to external sites
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost:") && !url.startsWith("file://")) {
      event.preventDefault();
      require("electron").shell.openExternal(url);
    }
  });

  // Intercept Window Open links to external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("http://localhost:") && !url.startsWith("file://")) {
      require("electron").shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Secure token storage IPC setup
const tokenFilePath = path.join(app.getPath("userData"), "secure_token.bin");

ipcMain.handle("save-auth-token", async (event, token) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this platform.");
    }
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(tokenFilePath, encrypted);
    return { success: true };
  } catch (error) {
    console.error("Token encryption failed:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-auth-token", async () => {
  try {
    if (!fs.existsSync(tokenFilePath)) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this platform.");
    }
    const encrypted = fs.readFileSync(tokenFilePath);
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.error("Token decryption failed:", error);
    return null;
  }
});

ipcMain.handle("delete-auth-token", async () => {
  try {
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath);
    }
    return { success: true };
  } catch (error) {
    console.error("Token deletion failed:", error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
