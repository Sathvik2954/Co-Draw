const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

// Enable CORS if needed, but since we serve both client & backend together, it's mostly same-origin.
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Port configuration
const PORT = process.env.PORT || 3000;

// Serve static frontend assets
const clientPath = path.join(__dirname, "../client");
app.use(express.static(clientPath));

// Fallback to index.html for modern SPA routing if rooms are path-based
app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// Configure Socket.IO behavior
setupSocket(io);

// Start listening
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  Whiteboard Server running on port ${PORT}`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`=============================================`);
});
