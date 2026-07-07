# CoDraw - Real-Time Collaborative Whiteboard

CoDraw is a high-fidelity, responsive, real-time collaborative whiteboard built using HTML5 Canvas, Express, and Socket.IO. It features a clean, light-themed UI, real-time sync, cursor tracking, chat, and vector drawing tools.

This project was built for the HackWeek 2026 competition.

Deployed Link: [https://co-draw-kyf5.onrender.com/](https://co-draw-kyf5.onrender.com/)

---

## Overview

Build a real time collaborative whiteboard using Socket.IO with multiple users drawing simultaneously.

---

## Features

* **Real-Time Collaboration:** Draw simultaneously with teammates instantly.
* **Drawing Canvas:** Smooth freehand drawing with customizable brush thickness (1px to 40px), a curated color palette, and a custom color picker.
* **Precision Eraser:** Transparent pixel erasing using destination-out canvas composite operations.
* **Vector Shapes:** Draw straight lines, rectangles, and circles with dynamic preview overlays before drawing them.
* **Live Group Chat:** Integrated room-specific chat panel with auto-scrolling messaging and name tags.
* **Collaborator Cursors:** Real-time pointer tracking overlay showcasing names and colors for active room members (throttled to preserve bandwidth).
* **Cooperative Undo and Redo:** Undo/redo actions globally synchronized across room members.
* **Independent Rooms:** Dynamically join rooms by navigating to custom URLs (e.g. `/?room=creative-designers`) or enter room IDs via the start screen.
* **Mobile Touch and Responsive Design:** Full touch support on mobile and tablet devices with display-DPI rendering that keeps drawings sharp on high-definition screens.
* **Export Drawing:** Download your whiteboard canvas as a solid-white background PNG image.

---

## Tech Stack

### Frontend
* **HTML5 Canvas:** Core drawing rendering.
* **CSS3 (Vanilla):** Light-theme design system with floating glassmorphism overlays and flex/grid layout.
* **JavaScript (ES6):** Drawing logic, cooperative undo/redo management, and Socket.IO-client listeners.
* **Lucide Icons:** Modern vector icon pack.

### Backend
* **Node.js:** Server environment.
* **Express.js:** Serving static files from the frontend folder.
* **Socket.IO:** Websocket connection handshakes, room allocations, and event broadcasting.

---

## Setup and Local Installation

### Prerequisites
Make sure you have Node.js installed (v16.0.0 or higher recommended).

### Steps
1. **Clone or Download the Repository:**
   ```bash
   cd Co-Draw
   ```

2. **Install Backend Dependencies:**
   Navigate into the server directory and run:
   ```bash
   cd server
   npm install
   ```

3. **Start the Development Server:**
   Launch the Node server in hot-reload mode using nodemon:
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   Open http://localhost:3000 in your web browser.

---

## Keyboard Shortcuts
* `P`: Select Pencil Tool
* `E`: Select Eraser Tool
* `L`: Select Line Tool
* `R`: Select Rectangle Tool
* `C`: Select Circle Tool
* `Ctrl + Z` / `Cmd + Z`: Undo last action
* `Ctrl + Y` / `Cmd + Y`: Redo undone action

---

## File Structure
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
