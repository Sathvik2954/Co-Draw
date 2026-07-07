# ✏️ CoDraw — Real-Time Collaborative Whiteboard

CoDraw is a high-fidelity, responsive, real-time collaborative whiteboard built using HTML5 Canvas, Express, and Socket.IO. It features a premium, clean light-themed UI, real-time sync, cursor tracking, chat, and vector drawing tools.

---

## ✨ Features

- 🤝 **Real-Time Collaboration:** Draw simultaneously with teammates instantly.
- 🎨 **Drawing Canvas:** Smooth freehand drawing with customizable brush thickness (1px to 40px) and a curated color palette plus a native color picker.
- 🧹 **Precision Eraser:** Destructive transparent pixel erasing using standard canvas composite blending.
- 📐 **Vector Shapes:** Draw straight lines, rectangles, and circles with real-time bounding box preview overlays before committing.
- 💬 **Live Group Chat:** Integrated room-specific chat panel with styled chat bubbles and automatic scroll-to-bottom behavior.
- 👤 **Collaborator Cursors:** Real-time pointer tracking overlay showcasing names and custom colors for active room members (throttled for peak performance).
- 🔄 **Cooperative Undo & Redo:** Undo/redo actions globally synced across room members, with a local client-side redo backup stack.
- 📦 **Independent Rooms:** Dynamically join rooms by navigating to custom links (e.g. `/?room=creative-designers`) or enter room IDs via the start screen.
- 📱 **Mobile Touch & Responsive Design:** Full touch support on mobile, iPad, and tablet devices with display-DPI rendering that keeps drawings sharp on high-definition screens.
- 💾 **Export Drawing:** Download your complete whiteboard as a solid-white background PNG image.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 Canvas:** Core drawing rendering.
- **CSS3 (Vanilla):** Light-theme design system with floating glassmorphism overlays and CSS flex/grid layout.
- **JavaScript (ES6):** Canvas rendering math, cooperative undo/redo management, event listeners, and Socket.IO-client listeners.
- **Lucide Icons:** Clean vector icon pack.

### Backend
- **Node.js:** Server environment.
- **Express.js:** Serving static files from the frontend `client/` folder.
- **Socket.IO:** Handshaking, dynamic room allocations, socket events broadcasting, and state updates.

---

## 🚀 Setup & Local Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16.0.0 or higher recommended).

### Steps
1. **Clone or Download the Repository:**
   ```bash
   cd WhiteBoard
   ```

2. **Install Backend Dependencies:**
   Navigate into the `server` directory and run npm install:
   ```bash
   cd server
   npm install
   ```

3. **Start the Development Server:**
   Launch the Node server in hot-reload mode using nodemon:
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Open [http://localhost:3000](http://localhost:3000) in your web browser. 

---

## 💻 Keyboard Shortcuts
- `P`: Select Pencil Tool
- `E`: Select Eraser Tool
- `L`: Select Line Tool
- `R`: Select Rectangle Tool
- `C`: Select Circle Tool
- `Ctrl + Z` / `Cmd + Z`: Undo last action
- `Ctrl + Y` / `Cmd + Y`: Redo undone action

---

## 📄 File Structure
```
whiteboard/
├── client/
│   ├── index.html        # Main app UI structure
│   ├── style.css         # Clean light theme CSS stylesheet
│   └── script.js         # Canvas engine & websocket controller
├── server/
│   ├── server.js         # Express app entry
│   ├── socket.js         # Socket.IO connection event orchestrator
│   └── package.json      # Node server dependencies
├── README.md             # Project documentation
└── .gitignore            # Git exclusion guidelines
```
