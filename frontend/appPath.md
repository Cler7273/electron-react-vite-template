# Workspace OS: The Official Developer Manual
## Chapter 1: The UAE Ecosystem & App Philosophy

Welcome to the Universal App Engine (UAE) Developer Manual. You have successfully built a "God Mode" operating system ecosystem. This manual will guide you through the exact pipeline for designing, implementing, and deploying new micro-apps into your OS in record time.

### 1.1 What is the Universal App Engine (UAE)?
In traditional development, adding a new app (like a Notes app or a Contact manager) requires a tedious, multi-step process: designing SQL tables, writing database migrations, creating Express CRUD routes, building frontend API wrappers, and finally creating the React UI. 

The **UAE bypasses the backend entirely**. It uses a "Zero-Backend" paradigm powered by SQLite's JSON capabilities:
*   **`sys_apps` (The Registry):** A single database table that tracks every app installed in your OS, along with its name and theme color.
*   **`sys_entities` (The Universal Data Store):** A single table that stores *any* data for *any* app as parsed JSON. Whether you are saving a "Bookmark", a "Recipe", or a "Contact", it all goes here safely and is automatically indexed.

Because of this architecture, **creating a new app in your OS is now strictly a Frontend UI task.**

### 1.2 The Core Pillars of the OS
To build apps efficiently, you must understand the 4 pillars that make your OS function:

1.  **The Engine Hook (`useAppEngine.js`)**
    This custom React hook is the brain of your app. By simply calling `useAppEngine('my_app', config, 'item')`, it automatically registers your app on the backend, fetches your saved JSON data, and provides you with `addEntity`, `updateEntity`, and `removeEntity` functions that feature built-in Optimistic UI updating.
2.  **The Shell (`UniversalComponents.jsx`)**
    The `UniversalAppShell` component guarantees that every app you build looks like a native OS window. It provides the dark-mode background, the draggable Header Pill (with dynamic drag handles), the Home/Close buttons, and the responsive Sidebar/Main Content layout.
3.  **The App Hub (`UaeLauncher.jsx`)**
    The visual "Desktop" of your OS. It scans a local registry and generates beautiful, glowing icons based on your app's theme color. 
4.  **The Master Registry (`App.jsx`)**
    The single source of truth that dictates which apps exist, which icons they use, and handles the logic for opening them as draggable `HDWindowFrame` instances on top of your canvas.

### 1.3 The "Zero-Backend" App Pipeline
When you decide to build a new application, the pipeline is always exactly **3 steps**:

*   **Step 1: The UI Component:** Create a single `.jsx` file in `src/apps/` (e.g., `MyNewApp.jsx`). Inside, you will call `useAppEngine`, define your data mapping, and wrap it all in the `UniversalAppShell`.
*   **Step 2: The Registry Entry:** Open `App.jsx`, import your new component, and add exactly *one line* to the `UAE_APPS_REGISTRY` array.
*   **Step 3: Launch:** Refresh your browser. Your app is now live in the App Hub, ready to be clicked, dragged, and populated with data.

### 1.4 Directory Architecture
To maintain a clean OS, respect this file structure when creating new modules:

```text
frontend/
├── src/
│   ├── api.js                     # (Do not touch) Universal fetch wrappers
│   ├── App.jsx                    # (Touch once per app) The OS Window Manager & Registry
│   ├── components/
│   │   └── UniversalComponents.jsx# (Do not touch) The OS Shell and standardized UI blocks
│   ├── hooks/
│   │   └── useAppEngine.js        # (Do not touch) The data synchronizer
│   └── apps/                      # 📍 THIS IS YOUR PLAYGROUND
│       ├── CheckTask.jsx          # Legacy standalone app
│       ├── LinkSaverApp.jsx       # Standard UAE App
│       ├── UaeLauncher.jsx        # The App Hub
│       └── [YourNewApp].jsx       # <-- Where your new creations go
```

---

**Summary of Chapter 1:**
You now understand the philosophy of your OS. You are no longer writing full-stack code; you are simply defining UI views that plug into a universal data grid. 

*Ready to build? Let me know when you want **Chapter 2**, where we will go step-by-step through creating the boilerplate for a brand-new App file!*

# Workspace OS: The Official Developer Manual
## Chapter 2: The Boilerplate (Creating Your First App)

Now that you understand the "Zero-Backend" philosophy of the Universal App Engine (UAE), it is time to build a new application. In this chapter, we will create the foundational boilerplate—the skeleton that every new app in your OS will use.

### Step 1: Create the File
Navigate to your `frontend/src/apps/` directory and create a new file. Name it according to what your app does (e.g., `RecipeBookApp.jsx`, `ContactsApp.jsx`, or `InventoryApp.jsx`).

For this guide, we will refer to it as `MyNewApp.jsx`.

### Step 2: The Essential Imports
Every UAE app requires exactly three imports to function. Open your new file and add the following at the top:

```javascript
import React, { useState } from 'react';
// 1. The Data Engine (Handles all DB saving/loading automatically)
import { useAppEngine } from '../hooks/useAppEngine';
// 2. The UI Shell (Handles the window, drag pill, dark mode, and layout)
import { UniversalAppShell } from '../components/UniversalComponents';
```

### Step 3: Define the Component Signature
Your app must be exported as a functional React component. To communicate perfectly with the OS Window Manager (`HDWindowFrame`), it must accept two specific props: `windowAPI` and `onHome`.

```javascript
export const MyNewApp = ({ windowAPI, onHome }) => {
    // App logic will go here
};
```
*   `windowAPI`: Allows the app's "Close (X)" button and drag handle to control the window.
*   `onHome`: Allows the app's "Home" button to return the user to the App Hub without crashing.

### Step 4: Awaken the Engine
Inside your component, call the `useAppEngine` hook. This single line of code is what replaces hours of backend development. 

```javascript
    const { 
        data: items,       // Your array of saved JSON objects
        isLoading,         // Boolean to show loading spinners
        addEntity,         // Function to save new data
        updateEntity,      // Function to edit existing data
        removeEntity       // Function to delete data
    } = useAppEngine(
        'app_mynewapp',                                // 1. Unique App ID (must be unique across the OS)
        { name: 'My New App', themeColor: '#ec4899' }, // 2. App Config (Name and Hex Color for the UI)
        'record'                                       // 3. Entity Type (e.g., 'contact', 'recipe', 'note')
    );
```

### Step 5: Setup the UI Layout Slots
The `UniversalAppShell` expects you to provide it with two main pieces of UI: The **Sidebar** and the **Main Content**. It is best practice to define these as variables before returning them.

```javascript
    // Define what goes in the left panel
    const SidebarContent = (
        <div className="p-4 text-gray-500 text-sm">
            <h3>Menu</h3>
            {/* Sidebar buttons/filters go here */}
        </div>
    );

    // Define what goes in the center screen
    const MainContent = (
        <div className="max-w-3xl mx-auto text-gray-200">
            <h2>Welcome to my app!</h2>
            {/* Inputs and Lists go here */}
        </div>
    );
```

### Step 6: Return the Universal Shell
Finally, wrap everything in the `UniversalAppShell`. Pass down your configurations and slots.

```javascript
    return (
        <UniversalAppShell
            appName="My New App"     // The title in the top bar
            themeColor="#ec4899"     // The glowing color of the pill
            windowAPI={windowAPI}    // Pass down the window controller
            onHome={onHome}          // Pass down the home button controller
            sidebarContent={SidebarContent} // Inject the sidebar
        >
            {MainContent}            {/* Inject the main content */}
        </UniversalAppShell>
    );
```

---

### The Complete Copy-Paste Boilerplate
Whenever you want to make a new app, simply copy this code into a new file and change the names and colors:

```javascript
import React, { useState } from 'react';
import { useAppEngine } from '../hooks/useAppEngine';
import { UniversalAppShell, UaeInput, UaeListItem } from '../components/UniversalComponents';

export const MyNewApp = ({ windowAPI, onHome }) => {
    // 1. Initialize Backend Engine
    const { data: items, isLoading, addEntity, updateEntity, removeEntity } = useAppEngine(
        'app_mynewapp', 
        { name: 'My New App', themeColor: '#ec4899' }, 
        'record' 
    );

    // 2. UI Slots
    const SidebarContent = (
        <div className="p-4 text-gray-500 text-sm">
            Sidebar Menu
        </div>
    );

    const MainContent = (
        <div className="max-w-3xl mx-auto">
            {isLoading ? <p className="text-gray-500">Loading...</p> : <p className="text-gray-200">Main Content Area</p>}
        </div>
    );

    // 3. Render Shell
    return (
        <UniversalAppShell
            appName="My New App"
            themeColor="#ec4899"
            windowAPI={windowAPI}
            onHome={onHome}
            sidebarContent={SidebarContent}
        >
            {MainContent}
        </UniversalAppShell>
    );
};
```

---

**Summary of Chapter 2:**
You now have a fully functional, database-connected, beautifully styled application skeleton. It does nothing yet, but it is ready to be injected into the OS.

*Ready for **Chapter 3**? We will cover how to register this boilerplate in the `App.jsx` Registry so it appears as a clickable, glowing icon in your OS App Hub! Let me know when you're ready.*

# Workspace OS: The Official Developer Manual
## Chapter 3: Registering Your App (The OS Kernel)

In Chapter 2, you created the source code for your app (`MyNewApp.jsx`). However, if you look at your OS right now, it is invisible. The Operating System Kernel (`App.jsx`) does not yet know this application exists.

In this chapter, we will register your new app into the **Universal Registry**. This single step will automatically:
1.  Add your app to the **App Hub (Launcher)** with a glowing icon.
2.  Configure the **Window Manager** to handle its opening and closing.
3.  Assign it a unique process ID for the OS to track.

### Step 1: Open the Kernel
Navigate to `frontend/src/App.jsx`. This is the brain of your frontend. It manages the desktop, the dock, and the window layering system.

### Step 2: Import Your Component
At the top of the file, alongside the other app imports, import the component you created in Chapter 2.

```javascript
// frontend/src/App.jsx

import { LinkSaverApp } from "./apps/LinkSaverApp";
import { UaeLauncher } from "./apps/UaeLauncher";
// ADD YOUR IMPORT HERE:
import { MyNewApp } from "./apps/MyNewApp"; 
```

### Step 3: Update the Registry
Scroll down slightly to find the `const UAE_APPS_REGISTRY = [...]` array. This array is the "DNS" of your operating system. It tells the OS how to render the icon and which component to launch.

Add a new object to this array for your app:

```javascript
const UAE_APPS_REGISTRY = [
    { 
        id: 'linksaver', 
        name: 'LinkSaver', 
        icon: '🔗', 
        color: '#10b981', 
        component: LinkSaverApp 
    },
    // ADD THIS NEW BLOCK:
    { 
        id: 'mynewapp',        // Unique System ID (Internal)
        name: 'My New App',    // Display Name (Launcher Title)
        icon: '🚀',            // Emoji or SVG Icon
        color: '#ec4899',      // Theme Color (Matches your App Shell color)
        component: MyNewApp    // The React Component to render
    }
];
```

### Step 4: The Magic of Dynamic Rendering
You might be wondering: *"Do I need to scroll down and add an `<HDWindowFrame>` tag manually?"*

**No.**

Because of the Universal App Engine architecture we implemented, `App.jsx` contains a dynamic map loop:

```javascript
{UAE_APPS_REGISTRY.map(app => {
    // ... logic checks if app is open ...
    return (
        <HDWindowFrame ... >
             <AppComponent ... />
        </HDWindowFrame>
    )
})}
```

By simply adding your object to the array, the OS dynamically generates the window logic, z-indexing, close handlers, and drag behaviors for you.

### Step 5: Verify the Installation
1.  Save `App.jsx`.
2.  Refresh your browser.
3.  Click the **App Hub (Galaxy Icon 🌌)** in the Sidebar Dock.
4.  **Look for your icon:** You should see a Rocket Ship (🚀) icon glowing in Pink (`#ec4899`).
5.  **Click it:** A new window titled "My New App" should float onto your canvas.

---

### Troubleshooting Registration
*   **Icon not appearing?** Ensure you saved `App.jsx` and that the `UAE_APPS_REGISTRY` array syntax is valid (watch for missing commas).
*   **Window opens but is blank?** Check `MyNewApp.jsx`. Ensure you are returning the `UniversalAppShell` and not just `null`.
*   **Window opens but closes immediately?** Ensure your `toggleApp` ID matches the `id` in the registry. The Registry `id` ('mynewapp') is what the system uses to track open/closed state.

---

**Summary of Chapter 3:**
Your app is now "Installed". It lives in the App Hub, it has a window, and it has a drag handle. But currently, it displays empty content. 

*Ready for **Chapter 4**? We will deep-dive into the **Data Layer**, learning how to use `addEntity` to actually save user input into the SQLite database without writing any backend code.*

# Workspace OS: The Official Developer Manual
## Chapter 4: The Data Layer (CRUD Mastery)

Your app is now installed and visible, but it is currently a "ghost"—it has no memory. In this chapter, you will learn how to use the **Data Engine** to save, read, and delete information. 

Because we are using the Universal App Engine (UAE), you will not write any SQL. Instead, you will work with **JSON Entities**.

### 4.1 Understanding the Entity
When you initialized your hook in Chapter 2, you defined an `entityType` (e.g., `'record'`). 
Every time you save data, the OS creates a "box" in the database. Inside that box, you can put **any valid JavaScript object**. 

If you save `{ "name": "John", "age": 30 }`, the database stores it exactly like that. If later you decide to add `{ "favorite_color": "blue" }`, you don't need to "migrate" the database. You just save it.

### 4.2 Creating Data (`addEntity`)
To save data, you use the `addEntity` function. It expects an object containing the data you want to persist.

**Example: Adding a simple note**
```javascript
const handleSave = async (text) => {
    await addEntity({
        content: text,
        category: "Work",
        priority: 1
    });
};
```
**Why this is "God Mode":**
*   **Auto-ID:** The engine automatically generates a unique ID for the item.
*   **Auto-Timestamps:** The engine adds `created_at` and `updated_at` timestamps automatically.
*   **Optimistic UI:** The item appears in your UI **instantly** (before the server even responds), making your OS feel lightning-fast.

### 4.3 Reading Data (`data` & `isLoading`)
The hook provides a `data` array. This array is **reactive**—whenever you add or delete something, this array updates automatically, triggering a React re-render.

```javascript
const MainContent = (
    <div>
        {isLoading ? (
            <p>Chargement...</p> 
        ) : (
            items.map(item => (
                <div key={item.id}>
                    {item.content} {/* Accessing the properties you saved */}
                </div>
            ))
        )}
    </div>
);
```

### 4.4 Deleting Data (`removeEntity`)
Deleting is the simplest operation. You only need the `id` of the entity you want to destroy.

```javascript
<button onClick={() => removeEntity(item.id)}>
    Supprimer
</button>
```
The Engine will instantly remove the item from the `data` array (Optimistic UI) and then send the DELETE request to the backend in the background.

### 4.5 Updating Data (`updateEntity`)
Updating allows you to change specific properties of an existing entity without overwriting the whole thing.

**Example: Marking a job as "Done"**
```javascript
const toggleComplete = (item) => {
    updateEntity(item.id, { 
        is_done: !item.is_done 
    });
};
```
The Engine merges your new data (`is_done`) with the existing JSON stored in the database.

---

### Pro-Tip: The `UaeInput` Shortcut
To make data entry consistent across your OS, use the `UaeInput` component we built in `UniversalComponents.jsx`. It handles the styling and the "Enter" key logic for you.

```javascript
// Inside your MainContent:
<UaeInput 
    value={inputValue}
    onChange={setInputValue}
    onSubmit={(value) => addEntity({ title: value })}
    placeholder="Ajouter quelque chose..."
    icon="➕"
/>
```

---

**Summary of Chapter 4:**
You are now a Full-Stack developer without writing a single line of backend code. You can Create, Read, Update, and Delete data using simple JavaScript objects.

*Ready for **Chapter 5**? We will explore the **UI Components Library**, learning how to use `UaeListItem` to create professional, interactive lists that match the OS aesthetic. Let me know when you're ready!*

# Workspace OS: The Official Developer Manual
## Chapter 5: UI Standard Library (UaeListItem & Layouts)

An Operating System is only as good as its consistency. If every app had different buttons and list styles, the Workspace OS would feel like a collection of random websites. 

In this chapter, we will master the **Standard UI Library** (`UniversalComponents.jsx`). We will focus specifically on the `UaeListItem`, the core building block for displaying data professionally.

---

### 5.1 The `UaeListItem` Component
The `UaeListItem` is a pre-styled "row" component. It handles hover effects, layout, and spacing so you don't have to write Tailwind classes for every item.

#### Basic Usage:
```javascript
<UaeListItem 
    title="Nom de l'élément"
    subtitle="Description ou URL"
    onClick={() => console.log("Cliqué !")}
/>
```

#### The 5 Essential Props:
1.  **`title` (String):** The primary text (rendered in bold, light gray).
2.  **`subtitle` (String):** Optional secondary text (rendered in smaller, dark gray).
3.  **`isActive` (Boolean):** If `true`, the item glows with your theme color (perfect for selected folders).
4.  **`onClick` (Function):** The action triggered when the whole row is clicked.
5.  **`actions` (JSX):** A slot for buttons (Delete, Edit, Star) that **only appear when the user hovers** over the item.

---

### 5.2 Mastering the `actions` Slot
The `actions` slot is where you put your control buttons. Because this slot is wrapped in a `group-hover` container, your UI stays clean and "minimalist" until the user actually needs to interact with an item.

**CRITICAL RULE:** When placing buttons in the `actions` slot, you **must** use `e.stopPropagation()`. If you don't, clicking the "Delete" button will also trigger the row's `onClick` (e.g., opening a link).

```javascript
actions={
    <div className="flex gap-1">
        <button 
            onClick={(e) => {
                e.stopPropagation(); // Prevents row click
                removeEntity(item.id);
            }}
            className="p-1 hover:bg-red-900/30 text-gray-500 hover:text-red-500 rounded transition-colors"
        >
            🗑️
        </button>
    </div>
}
```

---

### 5.3 Selection & Active States
To make your app feel "native," you should highlight the item currently being viewed. Use the `isActive` prop combined with your `useState`.

```javascript
const [selectedId, setSelectedId] = useState(null);

// Inside your map loop:
{items.map(item => (
    <UaeListItem
        key={item.id}
        title={item.name}
        isActive={selectedId === item.id}
        onClick={() => setSelectedId(item.id)}
    />
))}
```

---

### 5.4 Standard Layout Pattern
A professional UAE app follows this specific layout structure inside the `MainContent` area:

1.  **Header/Input Area:** Fixed at the top.
2.  **Scrollable List:** Occupying the remaining space.
3.  **Empty State:** Shown when the list is zero.

```javascript
const MainContent = (
    <div className="flex flex-col h-full">
        {/* 1. INPUT */}
        <UaeInput ... />

        {/* 2. LIST */}
        <div className="flex-1 space-y-2 mt-4">
            {items.length > 0 ? (
                items.map(item => (
                    <UaeListItem ... />
                ))
            ) : (
                /* 3. EMPTY STATE */
                <div className="text-center py-20 text-gray-600 text-sm">
                    Aucun élément trouvé.
                </div>
            )}
        </div>
    </div>
);
```

---

### 5.5 Visual Tips for OS Aesthetic
*   **Emojis:** Use emojis as icons in your titles or sidebar. They provide color without requiring extra assets.
*   **Monospace for Data:** For IDs, prices, or dates, use the `font-mono` class to make them look "system-native."
*   **Glow Effects:** If an item is critical, wrap it in a `shadow-[0_0_15px_rgba(var(--theme-rgb),0.2)]` for a subtle ambient glow.

---

**Summary of Chapter 5:**
You now have the tools to build UIs that are indistinguishable from the core OS apps. By using `UaeListItem`, you ensure that your apps are fast, accessible, and beautiful.

*Ready for **Chapter 6**? we will tackle **Sidebars & Categorization**—learning how to filter your data and create folder systems like we did in LinkSaver. Let me know when you're ready!*

# Workspace OS: The Official Developer Manual
## Chapter 6: Sidebars & Dynamic Categorization

In this chapter, we move beyond simple lists and learn how to organize massive amounts of data. Professional apps don't just show one long list; they use **Categories** (Folders) to filter content.

Because our backend is "Zero-Backend," we don't use database tables for folders. Instead, we use **Dynamic Extraction** from the JSON data.

---

### 6.1 The Logic: Filtering by Category
To implement folders, you need a "Filter" state. This state dictates which items are visible in the `MainContent`.

```javascript
// 1. Define the active filter state
const [activeCategory, setActiveCategory] = useState("General");

// 2. Filter your data array BEFORE mapping it in the JSX
const filteredItems = items.filter(item => item.category === activeCategory);
```

### 6.2 Dynamic Category Extraction
Instead of hardcoding a list of folders, we look at the data we have saved and "discover" which categories exist. We use `useMemo` for this to ensure high performance.

```javascript
const categories = useMemo(() => {
    // A 'Set' ensures that even if 100 items are in "Work", the folder only appears once.
    const cats = new Set(["General"]); 
    
    items.forEach(item => {
        if (item.category) cats.add(item.category);
    });
    
    return Array.from(cats);
}, [items]);
```

### 6.3 Implementing the Sidebar UI
The Sidebar is where the user switches between these categories. You should use a consistent style: an icon, the folder name, and an optional "Counter" showing how many items are inside.

```javascript
const SidebarContent = (
    <div className="p-4 space-y-2">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Dossiers</h3>
        {categories.map(cat => {
            const count = items.filter(i => i.category === cat).length;
            const isActive = activeCategory === cat;

            return (
                <div 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition-all text-sm
                        ${isActive ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-800' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                    <span>📁 {cat}</span>
                    {count > 0 && <span className="text-[10px] bg-black px-1.5 py-0.5 rounded text-gray-600">{count}</span>}
                </div>
            );
        })}
    </div>
);
```

### 6.4 The "Empty Folder" Problem
As we discovered during the LinkSaver development, if a folder has **zero** items, it won't be "discovered" by the `useMemo` logic and will disappear from the sidebar. 

To fix this, we maintain a `customCategories` state for folders the user just created but hasn't put items into yet.

```javascript
const [customCategories, setCustomCategories] = useState([]);

// Update useMemo to include them:
const categories = useMemo(() => {
    const cats = new Set(["General", ...customCategories]);
    items.forEach(item => item.category && cats.add(item.category));
    return Array.from(cats);
}, [items, customCategories]);
```

### 6.5 Saving Items into the Active Folder
When the user adds a new item using `addEntity`, you must ensure the `activeCategory` is included in the payload. This "wires" the item to the current folder.

```javascript
const handleAddItem = async (text) => {
    await addEntity({
        title: text,
        category: activeCategory, // <--- This ensures it appears in the right folder!
        is_done: 0
    });
};
```

---

### Summary of Chapter 6
You have now implemented a self-organizing file system. 
1. The **Sidebar** lists all categories found in your data.
2. Clicking a category sets the **Filter**.
3. The **MainContent** only renders items matching that filter.
4. New items **inherit** the category of the folder you are currently in.

---

**Summary of Chapter 6:**
You have mastered data architecture. Your apps can now handle hundreds of items while remaining perfectly organized. 

*Ready for **Chapter 7 (The Finale)**? We will cover **App Polish, Modals, and The Launch Sequence**—the final steps to move from a prototype to a polished OS tool. Let me know when you're ready!*

# Workspace OS: The Official Developer Manual
## Chapter 7: The Finale (Polish & The Launch Sequence)

Congratulations. You have reached the final chapter. You have transitioned from a single-app developer to an Operating System Architect. In this finale, we cover the "Last Mile"—the polish that separates a functional script from a premium OS tool.

---

### 7.1 The "Anti-Crash" Modal System
As established in our development journey, **`prompt()` is prohibited** in the Workspace OS environment. It freezes the main thread and crashes the window manager. To maintain "Zero-Crash" stability, every app must use the **React-State Modal Pattern**.

**The Blueprint for a Professional Modal:**
```javascript
const [modal, setModal] = useState({ isOpen: false, title: "", value: "", action: null });

// To trigger it:
setModal({
    isOpen: true,
    title: "Changer le nom",
    value: item.name,
    action: (newValue) => updateEntity(item.id, { name: newValue })
});
```
*   **Visual Rule:** Always use `backdrop-blur-sm` on the overlay to give the user a sense of "focus" on the dialog while keeping the app visible in the background.

---

### 7.2 Visual Consistency (Theme Syncing)
To make an app feel "Native," the **Theme Color** must breathe through the entire interface. Do not just set it in the Registry; use it inside your app’s UI components.

*   **Glowing Inputs:** Match your `UaeInput` focus ring to your theme color.
*   **Active States:** Ensure your sidebar selection and progress bars use the same hex code.
*   **The Ambient Glow:** Use a low-opacity background glow for the active category:
    `style={{ backgroundColor: `${themeColor}22`, borderColor: themeColor }}` (where `22` is the hex for 13% opacity).

---

### 7.3 UX: The Loading & Empty States
Users hate "jumping" interfaces. Use the `isLoading` property provided by the Engine to show a professional placeholder.

*   **Skeleton Loading:** Instead of a blank screen, show 3 or 4 `UaeListItem` components with empty titles and a `pulse` animation.
*   **The "Zero-Data" Illustration:** When `items.length === 0`, always provide an emoji and a clear "Call to Action" (e.g., *"Cliquez sur + pour commencer"*).

---

### 7.4 The Final Deployment Checklist
Before you consider an app "Production Ready" in your OS, run through this 5-point checklist:

1.  **Registry Alignment:** Does the `id` in `App.jsx` match the `appId` in `useAppEngine`?
2.  **Home Connector:** Is the `onHome` prop passed from `App.jsx` -> `MyApp.jsx` -> `UniversalAppShell`? (This prevents the user from getting "trapped" in an app).
3.  **Drag Stability:** Does the Header Pill contain the `custom-window-drag` class on the Grip element?
4.  **Propagations:** Do all buttons in the `actions` slot of your list items have `e.stopPropagation()`?
5.  **Cleanup:** Did you remove all `console.log` and debug buttons used during construction?

---

### 7.5 Final Words: Infinite Expansion
You now possess a **Universal App Engine**. This is not just a framework; it is a factory. 

Because you built the **Universal Data Store (`sys_entities`)**, your database will never become cluttered with hundreds of tables. Your backend will stay slim and fast, while your frontend can grow to support dozens of apps:
*   *Need a Password Manager?* Just define a `secret` entity type.
*   *Need a Workout Tracker?* Just define a `session` entity type.
*   *Need a Budget Tool?* Just define a `transaction` entity type.

The OS is no longer a static piece of software—it is a living workspace that evolves at the speed of your imagination.

**System Status: ALL SYSTEMS GO.**
**The Manual is Complete.**

*Happy Coding, Architect. Your Workspace is ready.*

