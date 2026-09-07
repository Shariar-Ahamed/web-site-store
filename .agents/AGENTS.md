# 🤖 AI Agent Guidelines & URL Addition Instructions

This document provides instructions, rules, and guidelines for AI coding assistants (Antigravity/Gemini) when maintaining this repository, adding new website bookmarks, or updating categories.

---

## 📌 Repository Architecture Overview

- **Design Style**: Handcrafted **Tactile Skeuomorphism** (Day / Light Mode only).
  - Main style files: `css/skeuomorphic.css`, `css/components.css`.
- **Core Views**:
  - **🗂️ Desk Grid** (`grid`): Physical skeuomorphic cards with subfolder tabs.
  - **🌳 Tree View** (`tree`): Hierarchical tree with continuous branching connector lines.
  - **🔗 Chart View** (`chart`): Interactive SVG mind map with cubic bezier curves.
- **Data Source**: `js/bookmarks-data.js`
  - Preloaded with the user's Chrome bookmark structure under `⭐ All Websites` (87 folders, 20 curated URLs).
- **State Management**: `js/store.js`
- **UI Logic**: `js/ui.js`
- **Custom Select Component**: `js/custom-select.js` (hierarchical tree dropdown with live search & continuous connector lines).

---

## 🌐 How to Add New Websites / Bookmarks

When adding new websites, follow these standards:

### 1. Data Structure in `js/bookmarks-data.js`
Each website bookmark is an object with the following fields:
```json
{
  "id": "<unique_numeric_id_string>",
  "name": "<Optimized Clean Title>",
  "type": "url",
  "url": "https://example.com/",
  "meta_info": {
    "power_bookmark_meta": ""
  },
  "date_added": "<timestamp_or_now>",
  "date_last_used": "0"
}
```

### 2. Title & Naming Optimization Rules
- **Be Concise & Professional**: Avoid redundant domain names in titles (e.g. use `VS Code Web` instead of `VS Code for the Web - Edit code anywhere`).
- **Meaningful Labeling**: Use clean, recognizable titles so they display crisply on cards and tree leaves without overflowing.
- **Accurate Placement**: Place new websites inside the most relevant folder/subfolder (e.g., AI tools inside `🤖 AI`, developer utilities inside `💻 Dev`, etc.).

---

## 📝 User's Custom Instructions & Preferences

<!-- USER INSTRUCTIONS START HERE -->

### 🔄 Automated Path-Based Bookmark Addition Workflow

Whenever the user provides a bookmark path and URL in the following tree format:

```text
⭐ All Websites
└── <Folder 1>
    └── <Folder 2>
        └── <Subfolder N>
            └── <Website Name>

<https://example.com/>
```

The AI Agent MUST strictly execute the following steps:

1. **Check for Existing Bookmark**:
   - Search `js/bookmarks-data.js` to see if the URL or website is already added.
   - If it already exists in the requested path, notify the user that it is already present.

2. **Traverse and Auto-Create Missing Folders**:
   - Follow the hierarchy starting from `⭐ All Websites`.
   - If any subfolder in the path does not exist, automatically create the folder object with:
     - A new unique numeric `id` (greater than the highest existing ID).
     - Clean name preserving leading emojis (e.g., `🤖 AI Design Prompts`).
     - Standard folder fields: `children: []`, `type: "folder"`, fresh `guid`, and timestamps.

3. **Insert Bookmark Object**:
   - Add the new bookmark object into the target subfolder's `children` array:
     ```json
     {
       "date_added": "<timestamp_string>",
       "date_last_used": "0",
       "guid": "<unique_uuid_v4>",
       "id": "<new_unique_numeric_id>",
       "meta_info": { "power_bookmark_meta": "" },
       "name": "<Website Name>",
       "type": "url",
       "url": "<https://example.com/>"
     }
     ```

4. **Cache Invalidation (Bump `STORAGE_KEY`)**:
   - In `js/store.js`, bump `STORAGE_KEY` (e.g. `v3` ➔ `v4`) so existing visitors and browser sessions immediately load the new bookmark data without localStorage caching conflicts.

5. **Validate Syntax & Verify Tree**:
   - Run `node --check js/bookmarks-data.js; node --check js/store.js`.
   - Verify discovery of the new item at the exact path using a quick Node script.

6. **Git Commit & Push**:
   - Stage and commit: `git commit -m "feat: add <Website Name> bookmark under <Path>"`
   - Push to `origin main` to update GitHub Pages live deployment immediately.

<!-- USER INSTRUCTIONS END HERE -->
