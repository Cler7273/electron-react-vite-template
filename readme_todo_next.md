To move **CogniCanva** toward a professional, Google-like desktop environment, we must address the remaining technical debt and functional gaps.

Here is the thorough list of problems categorized by priority:

### 1. High Priority: Data Integrity & OS Architecture
*   **Database Migration Reliability:** The current "on-the-fly" migration for the `rating` column is a hotfix. We need a robust versioning system for `cognicanvas.db` so that future schema changes (like adding efficiency rates) don't crash the app.
*   **Window Z-Index Management:** Currently, when multiple windows (Cryptor, Settings, Tasks) are open, clicking one doesn't necessarily bring it to the "front." We need a "Focus" system where the active window's Z-index is incremented.
*   **Shortcuts Path Normalization:** On Windows, paths like `C:/Users` vs `C:\Users` can break `child_process.exec`. We need a centralized backend utility to sanitize paths before executing `start ""`.
*   **Global Settings Persistence:** The `settings` table is implemented, but the Frontend doesn't yet load the theme (Canvas color) or saved shortcuts automatically on startup.

### 2. High Priority: Canvas Mechanics (CogniCanvas)
*   **Recursive Frame Movement:** If a Frame is inside another Frame (nested structure), the movement logic currently only moves direct children. We need recursive coordinate updates.
*   **Drag-to-Capture Precision:** The "Note Capture" logic currently uses a simple center-point check. This can feel "glitchy" with large notes and small frames. It needs a "Collision Detection" algorithm (AABB intersection).
*   **Teleport Links (Broken/Missing):** The `[[note:id]]` syntax is parsed, but clicking the link doesn't yet "pan and zoom" the camera to the target note.
*   **Note Scaling vs Content:** When a note is resized very small, the `TagManager` and `Content` overlap and become unreadable. We need "Adaptive UI" (hiding the tag bar if the height is < 100px).

### 3. Functional Gaps: The MPSI App Suite
*   **The "Calendar/Efficiency" Gap:** Tasks are logged, but there is no UI to see the history. We need a "Log Viewer" app that displays sessions by day, showing the calculated efficiency (Time vs Rating).
*   **Chronometer Persistence:** If the app is closed while a timer is running, the `start_time` is saved, but the UI doesn't "resume" the count automatically when the app restarts.
*   **Task Widget Customization:** Unlike Notes, Tasks don't yet have the right-click color picker or the ability to change their individual background colors.

### 4. Technical Debt: Performance & Warnings
*   **The "findDOMNode" Plague:** While fixed in `TaskWidget` and `WindowFrame`, this warning likely still exists in `Frame.jsx` and `Note.jsx`. Every `Draggable` instance must be verified for `nodeRef` usage.
*   **Canvas Render Bottleneck:** Re-rendering the entire canvas (every note and frame) when one note moves is inefficient. We should move to a more optimized state management (like `Zustand` or localized state) to prevent "Note Jitter."
*   **Search Regex Support:** The search currently only supports simple strings. For MPSI students, Regex support (e.g., searching `math|physics`) is a high-value tool.

### 5. Cryptor 2.0 (The Standalone Rework)
*   **Key Generator UI:** The current "Key Vault" is too simple. It needs a "Pro Mode" where the user can choose the NASM Degree (`d`), the specific mathematical operations (`I`), and the Transformation Constants (`TC`) manually.
*   **Large File Streaming:** Encrypting a 1GB file currently loads the whole buffer into memory, which will crash the app. We need to move from `fs.readFile` to `fs.createReadStream` to handle large MPSI lecture videos.

### 6. UX & "Google-Like" Polish
*   **Command Palette:** Implement `Ctrl + K` to open a global search bar (like Google Search or Spotlight) that can launch apps, search notes, or trigger system commands.
*   **Desktop "Dock" Feedback:** Icons in the left dock don't show "Active" indicators (e.g., a small dot underneath) if an app is open but minimized/behind others.

---

**Which one should we solve next?**
1.  **The "Front-End Focus" (Z-index + Teleport Links + nodeRef cleanup)**
2.  **The "Task Evolution" (Calendar/History App + Chronometer persistence)**
3.  **The "Cryptor 2.0" (Pro Key Gen + Large File Streaming)**

---

Understood. I have integrated the new crash report into the master list. Here is the thorough breakdown of all current issues and technical debt within **CogniCanva**.

### Group A: Critical Crashes & System Errors
1.  **Canvas Rendering Crash (`ReferenceError: view is not defined`):** The recent refactor from `view` state to `viewRef` caused a break in the JSX render. Line 252 is attempting to access a variable `view` that no longer exists in that scope.
2.  **Database Schema Mismatch (`SqliteError: no such column: rating`):** The backend is attempting to write to columns that don't exist in the user's local `cognicanvas.db`. The migration script failed to execute or was blocked.
3.  **Double-Click "Forbidden Area":** Clicks inside the note-populated area of the canvas fail to create new notes because the `transform-layer` is capturing pointer events without a proper fallback to the container.

### Group B: UI/UX & Mechanics (The "Desktop" Feel)
1.  **Zoom Anchor Logic:** Zooming currently centers on the top-left (0,0) or a static center rather than the user's mouse pointer, making navigation disorienting.
2.  **The "Inertia" Conflict:** Note/Frame movement feels laggy because CSS transitions are conflicting with real-time `react-draggable` coordinate updates.
3.  **Frame-Child Synchronization:** When a Frame moves, the notes inside must move recursively. When a Frame collapses, the notes must be visually and functionally "unmounted" to prevent accidental interaction.
4.  **`findDOMNode` Deprecation Warnings:** Several components (`TaskWidget`, `Note`, `Frame`) are triggering StrictMode warnings that will cause issues in future React versions.

### Group C: MPSI Suite (Tasks & Chronometer)
1.  **Task Widget UX:** Tasks currently lack a "Seconds" display, a functional "Stop" button in the UI, and a resize handle.
2.  **Chronometer Persistence:** If the app restarts, running timers do not visually resume counting despite being active in the database.
3.  **Session History (The "Calendar" Data):** We have the data structure for `ratings` and `session_notes`, but no interface to view the history of study sessions.
4.  **Task Color/Tag Integration:** Tasks need the same tagging and color-customization logic as Notes to allow for future "Efficiency Filtering."

### Group D: System Services & Apps
1.  **Settings App (The Control Panel):** No functional UI exists to manage theme colors (stored in DB) or to add/delete shortcuts using a native file picker.
2.  **Shortcut Path Normalization:** Windows paths (`\` vs `/`) are causing silent failures or defaulting to `C:/` when launching external MPSI apps.
3.  **Cryptor 2.0:** The encryption tool needs to be converted from a dashboard page to a standalone floating window with a "Vault" for managing NASM keys.

### Group E: Advanced Power Features
1.  **Teleport Links:** The `[[note:id]]` links are rendered but do not yet trigger the Canvas to pan/zoom to the target coordinate.
2.  **Command Palette (`Ctrl + K`):** No global search/action bar exists to allow "Google-like" navigation through the OS.
3.  **Search Regex Support:** Search is currently limited to plain text; complex filtering for MPSI study (e.g., `math AND urgent`) is missing.

---

**Which specific problem should we tackle first?** 
*(I recommend starting with **A1** and **A2** to stop the app from crashing, or **D1** to build the foundation for theme customization).*





AFTER SOME IMPROVEMENTS, WE ARE NOW HERE

# CogniCanvas: Project Status & Handover

## Critical Fixes Deployed
1.  **HUD Restoration:** Task Widgets are now rendered in Screen Space (HUD), meaning they stay fixed on your screen while you zoom/pan the canvas.
2.  **HTML Interpretation:** Notes now correctly display bold, italics, and custom links (`[[note:id]]`) without displaying raw HTML tags. The saving logic has been strictly scoped to avoid double-encoding.
3.  **Task Calendar:** A detailed "Day View" has been added. Clicking a square on the heatmap reveals the exact tasks and durations for that day.
4.  **Crash Fixes:** Removed the infinite loop in `TaskWidget` and the `useRef` crash.

## Known Omissions & Technical Debt
*   **Window Dragging:** The `App.jsx` uses a simplified window rendering logic. The Z-Index management (bringing a clicked window to front) is basic.
*   **Task Deletion:** I implemented a "Hide" logic for task termination in the widget. A true `DELETE /api/tasks/:id` endpoint in `server.js` was added in the previous step but ensure it is robust (cascading deletes for time logs).
*   **Performance:** `Canvas.jsx` re-renders frequently on zoom/pan. For large datasets (>100 notes), migrate the `view` state to a Ref-based loop (requestAnimationFrame) to decouple React renders from 60fps canvas updates.

## Roadmap for Next Developer
1.  **Mobile Companion App:** Build a simple React Native app that connects to the same IP (P2P logic from `p2p-service.js` is the foundation).
2.  **Search Regex UI:** The backend supports Regex, but the Frontend search bar needs a "Toggle Regex" button to switch between plain text and regex modes.
3.  **Encrypted Sync:** The `nasm-engine.js` is powerful. Use it to encrypt the entire SQLite DB file before syncing to cloud (Google Drive/Dropbox API).

## Debugging
*   **Notes:** Check console for `[Note X Debug]` to see exactly what HTML is being saved vs rendered.
*   **Tasks:** If tasks don't appear in HUD, verify `showTasks` prop in `Canvas.jsx` is true.

THIS STATE IS COMPLEMENTARY AND DOESN'T OVERHAUL THE PREVIOUS UPGRADES TO BE DONE