import { initialBookmarkData } from './bookmarks-data.js';

const STORAGE_KEY = 'web_store_bookmarks_data_v3';
const FAVORITES_KEY = 'web_store_favorites_v2';

class BookmarkStore {
  constructor() {
    this.root = this.loadData();
    this.favorites = this.loadFavorites();
    this.activeFolderId = this.root.id || '423';
    this.activeFilter = 'folder'; // 'folder' | 'favorites' | 'recent' | 'all_flat'
    this.viewMode = localStorage.getItem('web_store_view_mode') || 'tree'; // 'tree' | 'grid'
  }

  setViewMode(mode) {
    this.viewMode = mode;
    try {
      localStorage.setItem('web_store_view_mode', mode);
    } catch (e) {
      console.warn(e);
    }
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const nameMap = {
          'Raindrop.io': 'Select Path',
          'https://404.colorion.co/': 'Colorion 404 Animations',
          'Holosticke': 'HoloSticker Icons',
          'ChatGpt': 'ChatGPT',
          'OSINT4ALL - Start.me': 'OSINT4ALL Dashboard',
          'AnimMasterLib': 'AnimMaster Library',
          'ZenMux': 'ZenMux AI',
          'Getdesign': 'GetDesign',
          'GetLayers': 'GetLayers AI',
          'BibGuru': 'BibGuru Citation Generator'
        };

        function rename(node) {
          if (nameMap[node.name]) node.name = nameMap[node.name];
          if (node.children) node.children.forEach(rename);
        }
        rename(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('Could not parse localStorage bookmarks, falling back to initial data', err);
    }
    return JSON.parse(JSON.stringify(initialBookmarkData));
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }
  }

  loadFavorites() {
    try {
      const favs = localStorage.getItem(FAVORITES_KEY);
      if (favs) {
        return new Set(JSON.parse(favs));
      }
    } catch (e) {
      console.warn(e);
    }
    return new Set();
  }

  saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...this.favorites]));
    } catch (e) {
      console.error(e);
    }
  }

  toggleFavorite(url) {
    if (this.favorites.has(url)) {
      this.favorites.delete(url);
    } else {
      this.favorites.add(url);
    }
    this.saveFavorites();
    return this.favorites.has(url);
  }

  isFavorite(url) {
    return this.favorites.has(url);
  }

  getFolderById(id, node = this.root) {
    if (!node) return null;
    if (String(node.id) === String(id)) return node;
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'folder') {
          const found = this.getFolderById(id, child);
          if (found) return found;
        }
      }
    }
    return null;
  }

  getFolderPath(folderId, node = this.root, trail = []) {
    if (!node) return null;
    const currentTrail = [...trail, { id: node.id, name: node.name, type: node.type }];
    if (String(node.id) === String(folderId)) {
      return currentTrail;
    }
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'folder') {
          const found = this.getFolderPath(folderId, child, currentTrail);
          if (found) return found;
        }
      }
    }
    return null;
  }

  getAllUrls(node = this.root, folderPath = []) {
    const list = [];
    const currentPath = [...folderPath, node.name];
    if (node.children) {
      for (const item of node.children) {
        if (item.type === 'url') {
          list.push({
            ...item,
            folderPath: currentPath,
            folderId: node.id,
            folderName: node.name,
            isFavorite: this.isFavorite(item.url)
          });
        } else if (item.type === 'folder') {
          list.push(...this.getAllUrls(item, currentPath));
        }
      }
    }
    return list;
  }

  countItemsInFolder(node) {
    let folders = 0;
    let urls = 0;
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'folder') {
          folders++;
          const sub = this.countItemsInFolder(child);
          folders += sub.folders;
          urls += sub.urls;
        } else if (child.type === 'url') {
          urls++;
        }
      }
    }
    return { folders, urls, total: folders + urls };
  }

  addWebsite(folderId, { name, url, description = '', tags = [] }) {
    const folder = this.getFolderById(folderId);
    if (!folder) throw new Error('Target folder not found');
    if (!folder.children) folder.children = [];

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newSite = {
      id: 'site_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      guid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: name.trim() || formattedUrl,
      url: formattedUrl,
      type: 'url',
      description: description.trim(),
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean),
      date_added: String(Date.now() * 1000)
    };

    folder.children.unshift(newSite);
    this.saveData();
    return newSite;
  }

  addFolder(parentId, folderName, icon = '📁') {
    const parent = this.getFolderById(parentId);
    if (!parent) throw new Error('Parent folder not found');
    if (!parent.children) parent.children = [];

    const fullName = icon ? `${icon} ${folderName.trim()}` : folderName.trim();
    const newFolder = {
      id: 'fld_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      guid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: fullName,
      type: 'folder',
      children: [],
      date_added: String(Date.now() * 1000)
    };

    parent.children.push(newFolder);
    this.saveData();
    return newFolder;
  }

  deleteItem(folderId, itemId) {
    const folder = this.getFolderById(folderId);
    if (!folder || !folder.children) return false;
    const initialLen = folder.children.length;
    folder.children = folder.children.filter(child => String(child.id) !== String(itemId));
    if (folder.children.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  search(query) {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    const all = this.getAllUrls();
    return all.filter(site => {
      const matchName = site.name && site.name.toLowerCase().includes(q);
      const matchUrl = site.url && site.url.toLowerCase().includes(q);
      const matchFolder = site.folderPath && site.folderPath.some(p => p.toLowerCase().includes(q));
      const matchTags = site.tags && site.tags.some(t => t.toLowerCase().includes(q));
      return matchName || matchUrl || matchFolder || matchTags;
    });
  }

  getRecentWebsites(limit = 12) {
    const all = this.getAllUrls();
    return all.sort((a, b) => {
      const da = Number(a.date_added) || 0;
      const db = Number(b.date_added) || 0;
      return db - da;
    }).slice(0, limit);
  }

  getFavoriteWebsites() {
    const all = this.getAllUrls();
    return all.filter(s => this.isFavorite(s.url));
  }

  resetToDefaults() {
    this.root = JSON.parse(JSON.stringify(initialBookmarkData));
    this.favorites.clear();
    this.saveData();
    this.saveFavorites();
  }

  exportJson() {
    return JSON.stringify(this.root, null, 2);
  }

  importJson(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data.name || !Array.isArray(data.children)) {
      throw new Error('Invalid bookmark tree format');
    }
    this.root = data;
    this.activeFolderId = data.id || '423';
    this.saveData();
  }
}

export const store = new BookmarkStore();
