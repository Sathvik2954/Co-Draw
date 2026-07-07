const rooms = new Map();

// Helper to generate a random pastel color for user cursors
function getRandomColor() {
  const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 85%, 60%)`;
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    let currentRoom = null;
    let currentUser = null;

    console.log(`Socket connected: ${socket.id}`);

    // Join room event
    socket.on("join-room", ({ roomId, username }) => {
      // Validate inputs
      const rId = (roomId || "default").trim().toLowerCase();
      const name = (username || `User_${socket.id.substring(0, 4)}`).trim();

      // Clean up previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
      }

      currentRoom = rId;
      socket.join(rId);

      // Initialize room in-memory state if it doesn't exist
      if (!rooms.has(rId)) {
        rooms.set(rId, {
          users: new Map(),
          history: [],      // array of draw events: { type, strokeId, x0, y0, x1, y1, color, size, tool, userId }
          strokes: []       // array of strokeIds in order of creation
        });
      }

      const roomState = rooms.get(rId);
      const userColor = getRandomColor();

      currentUser = {
        id: socket.id,
        name: name,
        color: userColor,
        cursor: null
      };

      roomState.users.set(socket.id, currentUser);

      // 1. Send existing canvas history and active users to the new user
      const usersList = Array.from(roomState.users.values());
      socket.emit("room-data", {
        userId: socket.id,
        history: roomState.history,
        users: usersList
      });

      // 2. Broadcast to other users in the room that this user joined
      socket.to(rId).emit("user-joined", currentUser);

      console.log(`${name} (${socket.id}) joined room: ${rId}`);
    });

    // Drawing event (line segments / shapes)
    socket.on("draw", (drawData) => {
      if (!currentRoom || !rooms.has(currentRoom)) return;

      const roomState = rooms.get(currentRoom);
      const action = {
        ...drawData,
        userId: socket.id
      };

      // Push to history
      roomState.history.push(action);

      // Track unique stroke ID order for undo purposes
      if (drawData.strokeId && !roomState.strokes.includes(drawData.strokeId)) {
        roomState.strokes.push(drawData.strokeId);
      }

      // Broadcast to other users in the same room
      socket.to(currentRoom).emit("draw", action);
    });

    // Collaborative cursor movement
    socket.on("cursor-move", (position) => {
      if (!currentRoom || !rooms.has(currentRoom) || !currentUser) return;

      currentUser.cursor = position;
      // Broadcast cursor move to others in the room
      socket.to(currentRoom).emit("cursor-move", {
        userId: socket.id,
        cursor: position
      });
    });

    // Undo action
    socket.on("undo", () => {
      if (!currentRoom || !rooms.has(currentRoom)) return;

      const roomState = rooms.get(currentRoom);
      
      // Find the last stroke ID that belongs to this user
      let lastUserStrokeId = null;
      for (let i = roomState.history.length - 1; i >= 0; i--) {
        if (roomState.history[i].userId === socket.id) {
          lastUserStrokeId = roomState.history[i].strokeId;
          break;
        }
      }

      if (lastUserStrokeId) {
        // Filter out all history actions belonging to this strokeId
        roomState.history = roomState.history.filter(
          (action) => action.strokeId !== lastUserStrokeId
        );
        
        // Remove from strokes tracking list
        roomState.strokes = roomState.strokes.filter(id => id !== lastUserStrokeId);

        // Tell all room users to trigger an undo/redraw
        io.to(currentRoom).emit("undo-triggered", {
          strokeId: lastUserStrokeId,
          history: roomState.history
        });
      }
    });

    // Redo action: is handled client-side since client stores their own redo stack.
    // If they redo, they just emit the stroke segments again as "draw" events.

    // Clear board event
    socket.on("clear-canvas", () => {
      if (!currentRoom || !rooms.has(currentRoom)) return;

      const roomState = rooms.get(currentRoom);
      roomState.history = [];
      roomState.strokes = [];

      // Broadcast clear to everyone in the room
      io.to(currentRoom).emit("clear-canvas");
    });

    // Chat message event
    socket.on("chat-message", (messageText) => {
      if (!currentRoom || !currentUser) return;

      const chatMsg = {
        userId: socket.id,
        username: currentUser.name,
        color: currentUser.color,
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Broadcast message to everyone in the room
      io.to(currentRoom).emit("chat-message", chatMsg);
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (currentRoom && rooms.has(currentRoom)) {
        const roomState = rooms.get(currentRoom);
        roomState.users.delete(socket.id);

        // Notify others in the room
        socket.to(currentRoom).emit("user-left", {
          userId: socket.id,
          username: currentUser ? currentUser.name : "A user"
        });

        // Clean up empty rooms
        if (roomState.users.size === 0) {
          rooms.delete(currentRoom);
          console.log(`Room ${currentRoom} cleaned up (no users left).`);
        }
      }
    });
  });
};
