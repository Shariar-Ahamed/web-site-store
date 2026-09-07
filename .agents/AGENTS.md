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

*(Add your specific instructions, preferred categories, naming conventions, or workflow rules below. Agents will read and strictly follow them for future updates.)*

<!-- USER INSTRUCTIONS START HERE -->

<!-- USER INSTRUCTIONS END HERE -->
