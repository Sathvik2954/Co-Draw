// Initialize Lucide Icons
lucide.createIcons();

// ==========================================================================
// DOM Cache
// ==========================================================================
const joinOverlay = document.getElementById("join-overlay");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username-input");
const roomInput = document.getElementById("room-input");
const randomRoomBtn = document.getElementById("random-room-btn");
const appContainer = document.getElementById("app-container");
const roomDisplayId = document.getElementById("room-display-id");
const copyRoomLinkBtn = document.getElementById("copy-room-link-btn");
const canvas = document.getElementById("whiteboard-canvas");
const canvasViewport = document.getElementById("canvas-viewport");
const cursorsOverlay = document.getElementById("cursors-overlay");
const usersList = document.getElementById("users-list");
const userCountBadge = document.getElementById("user-count-badge");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-input-form");
const chatInput = document.getElementById("chat-input");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const btnUndo = document.getElementById("btn-undo");
const btnRedo = document.getElementById("btn-redo");
const btnClear = document.getElementById("btn-clear");
const btnDownload = document.getElementById("btn-download");
const brushIndicatorBtn = document.getElementById("brush-size-indicator-btn");
const brushSliderDropdown = document.getElementById("brush-slider-dropdown");
const brushSizeSlider = document.getElementById("brush-size-slider");
const brushSizeText = document.getElementById("brush-size-text");
const brushDot = document.getElementById("brush-dot");
const sliderValLabel = document.getElementById("slider-val-label");
const sliderPreviewDot = document.getElementById("slider-preview-dot");
const customColorPicker = document.getElementById("custom-color-picker");
const toastContainer = document.getElementById("toast-container");

// Tool buttons
const toolButtons = {
  pencil: document.getElementById("tool-pencil"),
  eraser: document.getElementById("tool-eraser"),
  line: document.getElementById("tool-line"),
  rectangle: document.getElementById("tool-rectangle"),
  circle: document.getElementById("tool-circle")
};

// ==========================================================================
// App State Variables
// ==========================================================================
let socket = null;
let myUserId = null;
let username = "";
let roomId = "";

// Drawing state
const ctx = canvas.getContext("2d");
let currentTool = "pencil"; // pencil, eraser, line, rectangle, circle
let currentColor = "#0f172a";
let currentSize = 6;
let isDrawing = false;
let startPoint = { x: 0, y: 0 };
let currentStrokeId = null;

// History & Collaborative state
let canvasHistory = []; // list of all actions in the room
let localRedoStack = []; // stores undone strokes for redo
const activeUsers = new Map(); // socketId -> user details
const activeCursors = new Map(); // socketId -> cursor element + timeoutId

// Throttle variables for performance
let lastCursorEmitTime = 0;
const cursorThrottleDelay = 30; // emit move every 30ms

// ==========================================================================
// Initial Setup & Routing (URL Room Detection)
// ==========================================================================
window.addEventListener("DOMContentLoaded", () => {
  // Pre-fill Room ID if URL contains query param: ?room=...
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get("room");
  if (roomParam) {
    roomInput.value = roomParam.trim().toLowerCase();
  } else {
    // Generate an initial random room ID
    roomInput.value = generateRandomCode(8);
  }
});

// Random room button trigger
randomRoomBtn.addEventListener("click", () => {
  roomInput.value = generateRandomCode(8);
  showToast("Generated new room ID", "info");
});

// Generate simple random room code
function generateRandomCode(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ==========================================================================
// Toast Notification Utility
// ==========================================================================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "info";
  if (type === "success") icon = "check-circle";
  if (type === "danger") icon = "alert-triangle";

  toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  lucide.createIcons();

  // Trigger animation fade in and fade out
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==========================================================================
// Room Join Submission & Socket Initialization
// ==========================================================================
joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  username = usernameInput.value.trim();
  roomId = roomInput.value.trim().toLowerCase();

  if (!username || !roomId) return;

  // Initialize Socket Connection
  // In development/production, we connect to same host that served the frontend
  socket = io();

  setupSocketListeners();

  // Join Room
  socket.emit("join-room", { roomId, username });

  // Update Room badge display
  roomDisplayId.textContent = roomId;

  // Show Main App View
  joinOverlay.classList.add("hidden");
  appContainer.classList.remove("hidden");

  // Adjust canvas size to window immediately after displaying
  initCanvas();
  showToast(`Welcome ${username}! Connecting...`, "info");
});

// Invite Link Copy
copyRoomLinkBtn.addEventListener("click", () => {
  const inviteLink = `${window.location.origin}?room=${roomId}`;
  navigator.clipboard.writeText(inviteLink).then(() => {
    showToast("Invite link copied to clipboard!", "success");
  }).catch(() => {
    showToast("Failed to copy invite link", "danger");
  });
});

// ==========================================================================
// Canvas Display and Sharp Rendering (High DPI Scaling)
// ==========================================================================
function initCanvas() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const rect = canvasViewport.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Set logical drawing buffer dimensions
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale the rendering context to match device pixel ratio
  ctx.scale(dpr, dpr);

  // Redraw complete canvas history to preserve contents on resize
  redrawCanvas();
}

// ==========================================================================
// Rendering Engine (Canvas History Redraw)
// ==========================================================================
function redrawCanvas() {
  // Clear full canvas viewport
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Redraw all path actions in history order
  canvasHistory.forEach((action) => {
    drawAction(action);
  });
}

function drawAction(action) {
  ctx.beginPath();
  ctx.lineWidth = action.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (action.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = action.color;
    ctx.fillStyle = action.color;
  }

  if (action.type === "draw") {
    ctx.moveTo(action.x0, action.y0);
    ctx.lineTo(action.x1, action.y1);
    ctx.stroke();
  } else if (action.type === "shape") {
    const { shapeTool, x, y, w, h } = action;
    if (shapeTool === "line") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
    } else if (shapeTool === "rectangle") {
      ctx.strokeRect(x, y, w, h);
    } else if (shapeTool === "circle") {
      // Draw ellipse/circle using arc
      const radius = Math.sqrt(w * w + h * h);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Restore defaults
  ctx.globalCompositeOperation = "source-over";
}

// Redraw history + a temporary shape layer while dragging
function drawPreviewShape(shapeTool, startX, startY, endX, endY) {
  redrawCanvas(); // Draw history first

  ctx.beginPath();
  ctx.lineWidth = currentSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (currentTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
  }

  const w = endX - startX;
  const h = endY - startY;

  if (shapeTool === "line") {
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  } else if (shapeTool === "rectangle") {
    ctx.strokeRect(startX, startY, w, h);
  } else if (shapeTool === "circle") {
    const radius = Math.sqrt(w * w + h * h);
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
}

// ==========================================================================
// Drawing Mouse/Touch Handlers
// ==========================================================================
function getLogicalCoords(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function startDrawing(e) {
  // Prevent scrolling/dragging gestures on mobile
  if (e.cancelable) e.preventDefault();

  const coords = getLogicalCoords(e);
  isDrawing = true;
  startPoint = coords;

  // Generate unique stroke UUID for undo tracking
  currentStrokeId = `${socket.id}_${Date.now()}`;
  localRedoStack = []; // Clear redo stack on new action
  updateUndoRedoButtons();
}

function drawMove(e) {
  if (!isDrawing) {
    // Send cursor position updates even when not drawing (throttled)
    const coords = getLogicalCoords(e);
    emitCursorMove(coords.x, coords.y);
    return;
  }

  const coords = getLogicalCoords(e);
  emitCursorMove(coords.x, coords.y);

  if (currentTool === "pencil" || currentTool === "eraser") {
    // Freehand drawing: draw segment locally immediately
    const segment = {
      type: "draw",
      strokeId: currentStrokeId,
      tool: currentTool,
      x0: startPoint.x,
      y0: startPoint.y,
      x1: coords.x,
      y1: coords.y,
      color: currentColor,
      size: currentSize
    };

    // Store in history
    canvasHistory.push({ ...segment, userId: socket.id });
    drawAction(segment);

    // Broadcast drawing segment to socket server
    socket.emit("draw", segment);

    // Move start point forward
    startPoint = coords;
  } else {
    // Shape tools: draw temporary shape preview
    drawPreviewShape(currentTool, startPoint.x, startPoint.y, coords.x, coords.y);
  }
}

function stopDrawing(e) {
  if (!isDrawing) return;
  isDrawing = false;

  // If we were drawing a shape, commit the final coordinates to history
  if (currentTool !== "pencil" && currentTool !== "eraser") {
    const coords = getLogicalCoords(e);
    const w = coords.x - startPoint.x;
    const h = coords.y - startPoint.y;

    // Only save shapes that have a non-zero size
    if (Math.abs(w) > 1 || Math.abs(h) > 1) {
      const shapeAction = {
        type: "shape",
        strokeId: currentStrokeId,
        tool: currentTool,
        shapeTool: currentTool,
        x: startPoint.x,
        y: startPoint.y,
        w: w,
        h: h,
        color: currentColor,
        size: currentSize
      };

      canvasHistory.push({ ...shapeAction, userId: socket.id });
      socket.emit("draw", shapeAction);
      redrawCanvas();
    }
  }

  currentStrokeId = null;
  updateUndoRedoButtons();
}

// Event Listeners for Canvas
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", drawMove);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

// Touch Support (Mobile/Tablets)
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", drawMove, { passive: false });
canvas.addEventListener("touchend", stopDrawing, { passive: false });

// ==========================================================================
// Collaborative Cursors Layer
// ==========================================================================
function emitCursorMove(x, y) {
  if (!socket) return;
  
  const now = Date.now();
  if (now - lastCursorEmitTime > cursorThrottleDelay) {
    socket.emit("cursor-move", { x, y });
    lastCursorEmitTime = now;
  }
}

function updateRemoteCursor(userId, cursorData) {
  // If user details not loaded yet or coordinates are missing, ignore
  if (!activeUsers.has(userId) || !cursorData) return;

  const user = activeUsers.get(userId);

  // Find or create cursor element
  let cursorEl = document.getElementById(`cursor-${userId}`);
  if (!cursorEl) {
    cursorEl = document.createElement("div");
    cursorEl.id = `cursor-${userId}`;
    cursorEl.className = "collab-cursor";
    
    // SVG Cursor pointer color matched to collaborator
    cursorEl.innerHTML = `
      <svg class="cursor-pointer-svg" viewBox="0 0 24 24" fill="none">
        <path d="M5.65376 12.3825L19.5678 4.57016C20.9416 3.79975 22.4533 5.31139 21.6829 6.68524L13.8706 20.5993C13.1118 21.9567 11.0858 21.8491 10.4795 20.4137L8.27211 15.1793C8.04946 14.6517 7.62534 14.2276 7.09772 14.0049L1.86333 11.7975C0.427885 11.1912 0.32029 9.16527 1.67768 8.40645L5.65376 12.3825Z" fill="${user.color}"/>
      </svg>
      <div class="cursor-label" style="background-color: ${user.color};">${user.name}</div>
    `;
    
    cursorsOverlay.appendChild(cursorEl);
  }

  // Position cursor using hardware-accelerated transform
  cursorEl.style.transform = `translate(${cursorData.x}px, ${cursorData.y}px)`;
  cursorEl.style.display = "flex";

  // Reset inactive timeout (remove cursor if they don't move it for 4s)
  if (activeCursors.has(userId)) {
    clearTimeout(activeCursors.get(userId).timeoutId);
  }

  const timeoutId = setTimeout(() => {
    cursorEl.style.display = "none";
  }, 4000);

  activeCursors.set(userId, { element: cursorEl, timeoutId });
}

function removeRemoteCursor(userId) {
  if (activeCursors.has(userId)) {
    const data = activeCursors.get(userId);
    clearTimeout(data.timeoutId);
    data.element.remove();
    activeCursors.delete(userId);
  }
}

// ==========================================================================
// Socket.IO Communication Event Listeners
// ==========================================================================
function setupSocketListeners() {
  // Connection Established
  socket.on("connect", () => {
    console.log("Connected to whiteboard socket server");
    showToast("Connected to server", "success");
  });

  // Load existing room state on join
  socket.on("room-data", ({ userId, history, users }) => {
    myUserId = userId;
    canvasHistory = history;
    
    // Clear active users list
    activeUsers.clear();
    users.forEach((user) => {
      activeUsers.set(user.id, user);
    });

    redrawCanvas();
    updateUsersSidebar();
    showToast(`Joined board successfully!`, "success");
  });

  // Collaborative User Joined
  socket.on("user-joined", (user) => {
    activeUsers.set(user.id, user);
    updateUsersSidebar();
    showToast(`${user.name} joined the room.`, "success");
  });

  // Drawing event received from other users
  socket.on("draw", (drawData) => {
    canvasHistory.push(drawData);
    drawAction(drawData);
  });

  // Cursor movement from other users
  socket.on("cursor-move", ({ userId, cursor }) => {
    updateRemoteCursor(userId, cursor);
  });

  // Undo triggered by someone in the room
  socket.on("undo-triggered", ({ strokeId, history }) => {
    // If the undo was triggered by ME, store it in my local redoStack
    const undoneStrokes = canvasHistory.filter(act => act.strokeId === strokeId);
    if (undoneStrokes.length > 0 && undoneStrokes[0].userId === myUserId) {
      localRedoStack.push({ strokeId, actions: undoneStrokes });
    }

    canvasHistory = history;
    redrawCanvas();
    updateUndoRedoButtons();
  });

  // Clear Canvas synchronization
  socket.on("clear-canvas", () => {
    canvasHistory = [];
    localRedoStack = [];
    redrawCanvas();
    updateUndoRedoButtons();
    showToast("Canvas cleared", "info");
  });

  // Chat messaging
  socket.on("chat-message", (chatMsg) => {
    appendChatBubble(chatMsg);
  });

  // Collaborative User Left
  socket.on("user-left", ({ userId, username }) => {
    activeUsers.delete(userId);
    removeRemoteCursor(userId);
    updateUsersSidebar();
    showToast(`${username} left the room.`, "info");
  });

  socket.on("disconnect", () => {
    showToast("Disconnected from server. Reconnecting...", "danger");
  });
}

// ==========================================================================
// Undo / Redo Action logic
// ==========================================================================
function triggerUndo() {
  if (!socket) return;
  socket.emit("undo");
}

function triggerRedo() {
  if (localRedoStack.length === 0 || !socket) return;
  
  const redoStroke = localRedoStack.pop();
  
  // Re-emit all the drawing segments of that stroke back to the server
  redoStroke.actions.forEach((action) => {
    // Update stroke ID if we want it to treat as new, but keeping it works too
    const redoAction = {
      ...action,
      userId: myUserId // ensure it maps to me
    };
    canvasHistory.push(redoAction);
    socket.emit("draw", redoAction);
  });

  redrawCanvas();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  // Undo is active if there is at least one action that belongs to me in history
  const hasMyActions = canvasHistory.some(act => act.userId === myUserId);
  btnUndo.disabled = !hasMyActions;

  // Redo is active if there are entries in our local redo stack
  btnRedo.disabled = localRedoStack.length === 0;
}

btnUndo.addEventListener("click", triggerUndo);
btnRedo.addEventListener("click", triggerRedo);

// Support Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "z" || e.key === "Z") {
      e.preventDefault();
      triggerUndo();
    } else if (e.key === "y" || e.key === "Y") {
      e.preventDefault();
      triggerRedo();
    }
  }
});

// ==========================================================================
// Toolbar Controls (Tool Selectors, Brush Size dropdown, Colors)
// ==========================================================================

// Tool buttons selection click handlers
Object.keys(toolButtons).forEach((toolKey) => {
  const btn = toolButtons[toolKey];
  btn.addEventListener("click", () => {
    // Deactivate previous active tool
    document.querySelector(".tool-btn.active")?.classList.remove("active");
    // Activate clicked tool
    btn.classList.add("active");
    btn.setAttribute("aria-checked", "true");
    
    currentTool = toolKey;

    // Show custom cursor styles depending on tool
    if (currentTool === "eraser") {
      canvasViewport.style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/></svg>') 12 12, auto";
    } else {
      canvasViewport.style.cursor = "crosshair";
    }
  });
});

// Shortcut bindings (P: Pencil, E: Eraser, L: Line, R: Rectangle, C: Circle)
window.addEventListener("keydown", (e) => {
  // Prevent triggering shortcuts while typing in inputs
  if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
    return;
  }

  const key = e.key.toLowerCase();
  if (key === "p") toolButtons.pencil.click();
  if (key === "e") toolButtons.eraser.click();
  if (key === "l") toolButtons.line.click();
  if (key === "r") toolButtons.rectangle.click();
  if (key === "c") toolButtons.circle.click();
});

// Custom Color Swatches
const swatches = document.querySelectorAll(".color-swatch");
swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    document.querySelector(".color-swatch.active")?.classList.remove("active");
    swatch.classList.add("active");
    currentColor = swatch.getAttribute("data-color");
    customColorPicker.value = currentColor;

    // Revert tool back to pencil if they select a color while on eraser
    if (currentTool === "eraser") {
      toolButtons.pencil.click();
    }
  });
});

// Custom Color Picker input
customColorPicker.addEventListener("input", (e) => {
  currentColor = e.target.value;
  // Clear swatch active indicators since we chose a custom color
  document.querySelector(".color-swatch.active")?.classList.remove("active");

  if (currentTool === "eraser") {
    toolButtons.pencil.click();
  }
});

// Brush size popup controls
brushIndicatorBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  brushSliderDropdown.classList.toggle("hidden");
});

brushSizeSlider.addEventListener("input", (e) => {
  const val = parseInt(e.target.value);
  currentSize = val;
  
  // Update indicator text and dot
  brushSizeText.textContent = `${val}px`;
  brushDot.style.width = `${Math.max(4, Math.min(20, val))}px`;
  brushDot.style.height = `${Math.max(4, Math.min(20, val))}px`;

  // Update dropdown slider label and preview dot
  sliderValLabel.textContent = `${val}px`;
  sliderPreviewDot.style.width = `${val}px`;
  sliderPreviewDot.style.height = `${val}px`;
});

// Close slider dropdown when clicking anywhere else
document.addEventListener("click", (e) => {
  if (!brushSliderDropdown.contains(e.target) && e.target !== brushIndicatorBtn) {
    brushSliderDropdown.classList.add("hidden");
  }
});

// ==========================================================================
// Board Actions (Clear, Export Download, Sidebar Toggle)
// ==========================================================================

// Clear canvas board
btnClear.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the entire whiteboard for all users?")) {
    socket.emit("clear-canvas");
  }
});

// Export as PNG
btnDownload.addEventListener("click", () => {
  // To preserve drawings, we create a temporary canvas to draw a solid white background,
  // overlay the current drawings on top, and download that so erasing works on white.
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  
  const tempCtx = tempCanvas.getContext("2d");
  
  // Fill solid white background
  tempCtx.fillStyle = "#ffffff";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
  // Draw the current canvas buffer onto the white temp canvas
  tempCtx.drawImage(canvas, 0, 0);

  // Trigger download link
  const link = document.createElement("a");
  link.download = `codraw-board-${roomId}.png`;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
  showToast("Board exported successfully!", "success");
});

// Toggle Sidebar Collapse
btnToggleSidebar.addEventListener("click", () => {
  appContainer.classList.toggle("sidebar-collapsed");
  btnToggleSidebar.classList.toggle("active");
  // Let the browser transition sidebar width first, then recalculate canvas size
  setTimeout(() => {
    resizeCanvas();
  }, 350);
});

// ==========================================================================
// Sidebar UI Sync (Users list and Live count)
// ==========================================================================
function updateUsersSidebar() {
  userCountBadge.textContent = activeUsers.size;
  usersList.innerHTML = "";

  activeUsers.forEach((user, id) => {
    const isMe = id === myUserId;
    const userEl = document.createElement("div");
    userEl.className = "user-item";
    userEl.innerHTML = `
      <div class="user-color-indicator" style="background-color: ${user.color};"></div>
      <span class="user-name-text">${user.name}</span>
      ${isMe ? '<span class="user-badge-me">Me</span>' : ""}
    `;
    usersList.appendChild(userEl);
  });
}

// ==========================================================================
// Chat Messages Box
// ==========================================================================
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const msgText = chatInput.value.trim();
  if (!msgText || !socket) return;

  socket.emit("chat-message", msgText);
  chatInput.value = "";
});

function appendChatBubble(chatMsg) {
  const isMe = chatMsg.userId === myUserId;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMe ? "me" : "other"}`;
  
  bubble.innerHTML = `
    <div class="chat-bubble-meta">
      <span class="chat-msg-sender" style="color: ${isMe ? "var(--primary)" : chatMsg.color}">${isMe ? "You" : chatMsg.username}</span>
      <span class="chat-msg-time">${chatMsg.time}</span>
    </div>
    <div class="chat-bubble-body">${escapeHTML(chatMsg.text)}</div>
  `;

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll to bottom
}

// Helper to escape HTML tags and prevent XSS injection
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
