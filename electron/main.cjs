const { app, BrowserWindow, session } = require("electron");
const path = require("node:path");

app.setName("Voz Nota");

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
    permission === "media",
  );
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const requestsAudio =
        details.mediaTypes && details.mediaTypes.includes("audio");
      callback(permission === "media" && Boolean(requestsAudio));
    },
  );

  const window = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    title: "Voz Nota",
    backgroundColor: "#f7f8fc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.loadFile(path.join(__dirname, "..", "www", "index.html"));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const window = new BrowserWindow({
      width: 1120,
      height: 820,
      minWidth: 360,
      minHeight: 600,
      title: "Voz Nota",
      backgroundColor: "#f7f8fc",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    window.loadFile(path.join(__dirname, "..", "www", "index.html"));
  }
});
