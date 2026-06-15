const { contextBridge, ipcRenderer } = require("electron");

// Expose a safe, limited api bridge to the renderer process
contextBridge.exposeInMainWorld("secureAuth", {
  saveToken: (token) => ipcRenderer.invoke("save-auth-token", token),
  getToken: () => ipcRenderer.invoke("get-auth-token"),
  deleteToken: () => ipcRenderer.invoke("delete-auth-token"),
});

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
});
