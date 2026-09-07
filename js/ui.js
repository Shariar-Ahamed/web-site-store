import { store } from './store.js';
import { ChartViewRenderer } from './chart-view.js';

export class UIRenderer {
  constructor() {
    this.sidebarTreeEl = document.getElementById('sidebar-tree');
    this.contentBodyEl = document.getElementById('content-body');
    this.breadcrumbsEl = document.getElementById('breadcrumbs-trail');
    this.viewStatsEl = document.getElementById('view-stats');
    this.allCountEl = document.getElementById('count-all');
    this.favCountEl = document.getElementById('count-favorites');
    this.recentCountEl = document.getElementById('count-recent');

    // Expanded sets - keep collapsed by default
    this.sidebarExpandedFolders = new Set();
    this.visualTreeCollapsedBranches = new Set();
  }

  getCleanDomain(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^https?:\/\//, '').split('/')[0];
    }
  }

  getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return '';
    }
  }

  render(searchResults = null, searchQuery = '') {
    this.renderQuickNav();
    this.renderSidebarTree();
    this.renderViewModeButtons();
    this.renderMainArea(searchResults, searchQuery);
  }

  renderViewModeButtons() {
    const btnTree = document.getElementById('btn-view-tree');
    const btnGrid = document.getElementById('btn-view-grid');
    const btnChart = document.getElementById('btn-view-chart');
    const toolbar = document.querySelector('.toolbar-bar');

    if (btnTree && btnGrid) {
      btnTree.classList.toggle('active', store.viewMode === 'tree');
      btnGrid.classList.toggle('active', store.viewMode === 'grid');
      if (btnChart) {
        btnChart.classList.toggle('active', store.viewMode === 'chart');
      }
    }
    if (toolbar) {
      toolbar.classList.toggle('grid-mode-active', store.viewMode !== 'tree');
    }
  }

  renderQuickNav() {
    const all = store.getAllUrls();
    const favs = store.getFavoriteWebsites();
    const recent = store.getRecentWebsites();

    if (this.allCountEl) this.allCountEl.textContent = all.length;
    if (this.favCountEl) this.favCountEl.textContent = favs.length;
    if (this.recentCountEl) this.recentCountEl.textContent = Math.min(recent.length, 12);

    document.querySelectorAll('.quick-nav .nav-item').forEach(el => {
      const filter = el.getAttribute('data-filter');
      if (store.activeFilter === filter) {
        if (filter === 'folder') {
          el.classList.toggle('active', String(store.activeFolderId) === String(store.root.id || '423'));
        } else {
          el.classList.add('active');
        }
      } else {
        el.classList.remove('active');
      }
    });
  }

  /* ---------------------------------------------------------
     SIDEBAR FOLDER EXPLORER (8 MAIN CATEGORY CARDS)
     --------------------------------------------------------- */
  renderSidebarTree() {
    if (!this.sidebarTreeEl) return;
    this.sidebarTreeEl.innerHTML = '';

    if (!store.root || !store.root.children) return;

    // Determine current active folder path
    const activeTrail = store.activeFilter === 'folder' && store.activeFolderId
      ? (store.getFolderPath(store.activeFolderId) || [])
      : [];
    const activeTrailIds = new Set(activeTrail.map(n => String(n.id)));
    const currentActiveId = String(store.activeFolderId || '');

    const topFolders = store.root.children.filter(c => c.type === 'folder');

    topFolders.forEach(folder => {
      const isDirectlyActive = store.activeFilter === 'folder' && currentActiveId === String(folder.id);
      const isInActivePath = store.activeFilter === 'folder' && activeTrailIds.has(String(folder.id));

      const groupEl = document.createElement('div');
      groupEl.className = 'sidebar-cat-group';

      const itemRow = document.createElement('div');
      itemRow.className = 'nav-item';
      if (isDirectlyActive || isInActivePath) {
        itemRow.classList.add('active');
      }

      const counts = store.countItemsInFolder(folder);

      // Extract leading emoji for icon
      const emojiMatch = folder.name.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u);
      const icon = emojiMatch ? emojiMatch[1] : '📁';
      const cleanName = emojiMatch ? folder.name.slice(emojiMatch[0].length).trim() : folder.name;

      itemRow.innerHTML = `
        <div class="nav-item-left">
          <span class="nav-icon">${icon}</span>
          <span>${cleanName}</span>
        </div>
        <span class="count-pill">${counts.urls}</span>
      `;

      itemRow.addEventListener('click', () => {
        store.activeFilter = 'folder';
        store.activeFolderId = folder.id;
        this.render();
      });

      groupEl.appendChild(itemRow);

      // If this category is part of the active path, expand and show its subfolders!
      if (isInActivePath && folder.children) {
        const subfolders = folder.children.filter(c => c.type === 'folder');
        if (subfolders.length > 0) {
          const subList = document.createElement('div');
          subList.className = 'sidebar-subfolders-list';
          this.renderSidebarSubfolders(subfolders, activeTrailIds, currentActiveId, subList, 1);
          groupEl.appendChild(subList);
        }
      }

      this.sidebarTreeEl.appendChild(groupEl);
    });
  }

  renderSidebarSubfolders(subfolders, activeTrailIds, currentActiveId, containerEl, depth = 1) {
    subfolders.forEach(sub => {
      const isSubDirectlyActive = currentActiveId === String(sub.id);
      const isSubInPath = activeTrailIds.has(String(sub.id));

      const subItem = document.createElement('div');
      subItem.className = 'sidebar-sub-item';
      if (isSubDirectlyActive) {
        subItem.classList.add('active');
      } else if (isSubInPath) {
        subItem.classList.add('in-path');
      }

      const counts = store.countItemsInFolder(sub);
      const emojiMatch = sub.name.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u);
      const icon = emojiMatch ? emojiMatch[1] : '📁';
      const cleanName = emojiMatch ? sub.name.slice(emojiMatch[0].length).trim() : sub.name;

      subItem.innerHTML = `
        <div class="sidebar-sub-left">
          <span class="sidebar-sub-icon">${icon}</span>
          <span class="sidebar-sub-name" title="${cleanName}">${cleanName}</span>
        </div>
        <span class="count-pill">${counts.urls}</span>
      `;

      subItem.addEventListener('click', (e) => {
        e.stopPropagation();
        store.activeFilter = 'folder';
        store.activeFolderId = sub.id;
        this.render();
      });

      containerEl.appendChild(subItem);

      // Recursively expand nested subfolders if this subfolder is part of the active path
      if (isSubInPath && sub.children) {
        const nestedSubs = sub.children.filter(c => c.type === 'folder');
        if (nestedSubs.length > 0) {
          const nestedList = document.createElement('div');
          nestedList.className = 'sidebar-subfolders-nested';
          this.renderSidebarSubfolders(nestedSubs, activeTrailIds, currentActiveId, nestedList, depth + 1);
          containerEl.appendChild(nestedList);
        }
      }
    });
  }

  /* ---------------------------------------------------------
     BREADCRUMBS
     --------------------------------------------------------- */
  renderBreadcrumbs(trail, customTitle = null) {
    if (!this.breadcrumbsEl) return;
    this.breadcrumbsEl.innerHTML = '';

    if (customTitle) {
      const titleSpan = document.createElement('span');
      titleSpan.className = 'crumb-item current';
      titleSpan.textContent = customTitle;
      this.breadcrumbsEl.appendChild(titleSpan);
      return;
    }

    if (!trail || trail.length === 0) return;

    trail.forEach((crumb, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.style.color = '#94a3b8';
        sep.style.fontSize = '0.8rem';
        sep.textContent = '›';
        this.breadcrumbsEl.appendChild(sep);
      }

      const crumbEl = document.createElement('span');
      crumbEl.className = `crumb-item ${index === trail.length - 1 ? 'current' : ''}`;
      crumbEl.textContent = crumb.name;

      if (index !== trail.length - 1) {
        crumbEl.addEventListener('click', () => {
          store.activeFilter = 'folder';
          store.activeFolderId = crumb.id;
          this.render();
        });
      }
      this.breadcrumbsEl.appendChild(crumbEl);
    });
  }

  /* ---------------------------------------------------------
     MAIN CONTENT DISPATCHER
     --------------------------------------------------------- */
  renderMainArea(searchResults = null, searchQuery = '') {
    if (!this.contentBodyEl) return;

    // Search Mode
    if (searchResults !== null) {
      this.renderBreadcrumbs(null, `🔍 Search: "${searchQuery}" (${searchResults.length})`);
      if (this.viewStatsEl) {
        this.viewStatsEl.textContent = `${searchResults.length} matches found`;
      }
      if (store.viewMode === 'chart') {
        this.renderChartView(searchQuery);
      } else if (store.viewMode === 'tree') {
        this.renderVisualTree(store.root, searchQuery);
      } else {
        this.renderSitesGrid(searchResults, false);
      }
      return;
    }

    // Favorites Filter
    if (store.activeFilter === 'favorites') {
      const favs = store.getFavoriteWebsites();
      this.renderBreadcrumbs(null, '⭐ Starred Favorites');
      if (this.viewStatsEl) {
        this.viewStatsEl.textContent = `${favs.length} saved favorites`;
      }
      this.renderSitesGrid(favs, false, 'No Starred Websites Yet', 'Click the star on any website card to add it here.');
      return;
    }

    // Recent Filter
    if (store.activeFilter === 'recent') {
      const recent = store.getRecentWebsites();
      this.renderBreadcrumbs(null, '🕒 Recently Added Websites');
      if (this.viewStatsEl) {
        this.viewStatsEl.textContent = `${recent.length} recent additions`;
      }
      this.renderSitesGrid(recent, false, 'No Recent Websites', 'Websites you add will appear here.');
      return;
    }

    // All Websites Flat Filter
    if (store.activeFilter === 'all_flat') {
      const all = store.getAllUrls();
      this.renderBreadcrumbs(null, '🌐 All Stored Websites');
      if (this.viewStatsEl) {
        this.viewStatsEl.textContent = `${all.length} total websites`;
      }
      if (store.viewMode === 'chart') {
        this.renderChartView();
      } else if (store.viewMode === 'tree') {
        this.renderVisualTree(store.root);
      } else {
        this.renderSitesGrid(all, false);
      }
      return;
    }

    // Active Folder View
    const folder = store.getFolderById(store.activeFolderId) || store.root;
    const trail = store.getFolderPath(folder.id) || [{ id: folder.id, name: folder.name }];
    this.renderBreadcrumbs(trail);

    const counts = store.countItemsInFolder(folder);
    if (this.viewStatsEl) {
      this.viewStatsEl.textContent = `${counts.folders} subfolders · ${counts.urls} websites`;
    }

    if (store.viewMode === 'chart') {
      this.renderChartView(searchQuery);
    } else if (store.viewMode === 'tree') {
      this.renderVisualTree(folder);
    } else {
      this.renderDeskGridView(folder);
    }
  }

  renderChartView(searchQuery = '') {
    if (!this.chartRenderer) {
      this.chartRenderer = new ChartViewRenderer(this.contentBodyEl);
    } else {
      this.chartRenderer.container = this.contentBodyEl;
    }
    this.chartRenderer.render(searchQuery);
  }

  /* ---------------------------------------------------------
     🌳 FULL VISUAL HIERARCHICAL TREE VIEW
     Connecting branches (├──), folders, and website leaf nodes
     --------------------------------------------------------- */
  renderVisualTree(rootFolder, searchQuery = '') {
    this.contentBodyEl.innerHTML = '';

    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree-diagram';

    // Build the visual tree node recursively
    const treeNodeEl = this.buildVisualBranch(rootFolder, searchQuery, true);
    treeContainer.appendChild(treeNodeEl);

    this.contentBodyEl.appendChild(treeContainer);
  }

  buildVisualBranch(folder, searchQuery = '', isRoot = false) {
    const branch = document.createElement('div');
    branch.className = 'tree-branch';

    const subfolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];
    const directSites = folder.children ? folder.children.filter(c => c.type === 'url') : [];
    const counts = store.countItemsInFolder(folder);

    // If searching, check if branch or children match
    const q = searchQuery.toLowerCase().trim();
    let hasMatchingDescendant = false;
    if (q) {
      const allSubUrls = store.getAllUrls(folder);
      hasMatchingDescendant = allSubUrls.some(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.url && s.url.toLowerCase().includes(q))
      );
    }

    // Collapsed state
    const isCollapsed = !hasMatchingDescendant && this.visualTreeCollapsedBranches.has(folder.id);
    if (isCollapsed) {
      branch.classList.add('collapsed');
    }

    // Branch Header
    const header = document.createElement('div');
    header.className = 'tree-branch-header';
    header.innerHTML = `
      <span class="tree-branch-toggle-btn">▼</span>
      <span class="tree-branch-title">${folder.name}</span>
      <span class="tree-branch-count">${counts.urls} sites</span>
    `;

    header.addEventListener('click', () => {
      if (this.visualTreeCollapsedBranches.has(folder.id)) {
        this.visualTreeCollapsedBranches.delete(folder.id);
        branch.classList.remove('collapsed');
      } else {
        this.visualTreeCollapsedBranches.add(folder.id);
        branch.classList.add('collapsed');
      }
    });

    branch.appendChild(header);

    // Branch Children (Connecting Lines)
    if (subfolders.length > 0 || directSites.length > 0) {
      const childrenBox = document.createElement('div');
      childrenBox.className = 'tree-branch-children';

      // 1. Direct website leaf nodes under this folder
      directSites.forEach(site => {
        const siteRow = document.createElement('div');
        siteRow.className = 'tree-node-row';

        const match = q && (
          (site.name && site.name.toLowerCase().includes(q)) || 
          (site.url && site.url.toLowerCase().includes(q))
        );

        siteRow.appendChild(this.createTreeLeafSite(site, folder, match));
        childrenBox.appendChild(siteRow);
      });

      // 2. Subfolder branches
      subfolders.forEach(sub => {
        const subRow = document.createElement('div');
        subRow.className = 'tree-node-row';
        subRow.appendChild(this.buildVisualBranch(sub, searchQuery, false));
        childrenBox.appendChild(subRow);
      });

      branch.appendChild(childrenBox);
    }

    return branch;
  }

  createTreeLeafSite(site, parentFolder, isSearchMatch = false) {
    const leaf = document.createElement('div');
    leaf.className = `tree-leaf-site ${isSearchMatch ? 'search-match' : ''}`;

    const domain = this.getCleanDomain(site.url);
    const faviconSrc = this.getFaviconUrl(site.url);
    const isFav = store.isFavorite(site.url);

    leaf.innerHTML = `
      <div class="tree-leaf-info">
        <img class="tree-leaf-favicon" src="${faviconSrc}" alt="${domain}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%232563eb%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23e0e7ff%22/%3E%3Ctext x=%2212%22 y=%2216%22 font-size=%2212%22 font-family=%22sans-serif%22 font-weight=%22bold%22 text-anchor=%22middle%22 fill=%22%234f46e5%22%3E${domain[0]?.toUpperCase() || 'W'}%3C/text%3E%3C/svg%3E';">
        <span class="tree-leaf-name" title="${site.name}">${site.name}</span>
        <span class="tree-leaf-domain">${domain}</span>
      </div>
      <div class="tree-leaf-actions">
        <button class="tactile-btn tactile-btn-sm tree-copy-btn" title="Copy URL"><span>📋</span> Copy</button>
        <button class="fav-btn ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Remove favorite' : 'Add favorite'}">${isFav ? '★' : '☆'}</button>
        <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="tactile-btn tactile-btn-sm tactile-btn-primary" title="Open website">
          Visit ↗
        </a>
      </div>
    `;

    // Copy action
    const copyBtn = leaf.querySelector('.tree-copy-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(site.url).then(() => {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Copied: ${site.url}`, icon: '📋' } }));
      });
    });

    // Favorite action
    const favBtn = leaf.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const updated = store.toggleFavorite(site.url);
      favBtn.classList.toggle('is-fav', updated);
      favBtn.innerHTML = updated ? '★' : '☆';
      this.renderQuickNav();
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: updated ? `Favorited ${site.name}` : `Removed ${site.name}`, icon: updated ? '⭐' : '🗑️' }
      }));
    });

    return leaf;
  }

  expandAllTreeBranches() {
    this.visualTreeCollapsedBranches.clear();
    this.render();
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Expanded all tree branches', icon: '🌳' } }));
  }

  collapseAllTreeBranches() {
    function collectFolders(node, set) {
      if (node.children) {
        node.children.forEach(c => {
          if (c.type === 'folder') {
            set.add(c.id);
            collectFolders(c, set);
          }
        });
      }
    }
    collectFolders(store.root, this.visualTreeCollapsedBranches);
    this.render();
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Collapsed all tree branches', icon: '📁' } }));
  }

  /* ---------------------------------------------------------
     🗂️ DESK GRID VIEW
     --------------------------------------------------------- */
  renderDeskGridView(folder) {
    const container = document.createElement('div');

    const subfolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];
    const directSites = folder.children ? folder.children.filter(c => c.type === 'url') : [];

    if (subfolders.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'subfolders-grid';

      subfolders.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'subfolder-card';
        const counts = store.countItemsInFolder(sub);

        // Detect if folder already has an emoji icon to avoid duplicate icons
        const emojiMatch = sub.name.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u);
        const folderIcon = emojiMatch ? emojiMatch[1] : '📁';
        const cleanName = emojiMatch ? sub.name.slice(emojiMatch[0].length).trim() : sub.name;

        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.35rem;">${folderIcon}</span>
            <span style="font-size: 0.92rem; font-weight: 800; color: #1e293b;">${cleanName}</span>
          </div>
          <span class="count-pill">${counts.urls}</span>
        `;

        card.addEventListener('click', () => {
          store.activeFolderId = sub.id;
          this.sidebarExpandedFolders.add(String(sub.id));
          this.render();
        });

        grid.appendChild(card);
      });

      container.appendChild(grid);
    }

    if (directSites.length > 0) {
      const sitesGrid = document.createElement('div');
      sitesGrid.className = 'websites-grid';

      directSites.forEach(site => {
        sitesGrid.appendChild(this.createGridCard({
          ...site,
          folderId: folder.id,
          folderName: folder.name
        }));
      });

      container.appendChild(sitesGrid);
    } else if (subfolders.length === 0) {
      container.appendChild(this.createEmptyState('Folder is empty', 'Add a website to this folder to start exploring.'));
    }

    this.contentBodyEl.innerHTML = '';
    this.contentBodyEl.appendChild(container);
  }

  renderSitesGrid(sites, showDelete = false, emptyTitle = 'No websites found', emptySub = 'Try searching with another keyword.') {
    this.contentBodyEl.innerHTML = '';

    if (!sites || sites.length === 0) {
      this.contentBodyEl.appendChild(this.createEmptyState(emptyTitle, emptySub));
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'websites-grid';

    sites.forEach(site => {
      grid.appendChild(this.createGridCard(site, showDelete));
    });

    this.contentBodyEl.appendChild(grid);
  }

  createGridCard(site, canDelete = true) {
    const card = document.createElement('div');
    card.className = 'site-card';

    const domain = this.getCleanDomain(site.url);
    const faviconSrc = this.getFaviconUrl(site.url);
    const isFav = store.isFavorite(site.url);
    const folderInfo = site.folderPath ? site.folderPath.join(' › ') : (site.folderName || '');

    card.innerHTML = `
      <div class="site-header">
        <div class="site-favicon-wrap">
          <img class="site-favicon" src="${faviconSrc}" alt="${domain}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%232563eb%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23e0e7ff%22/%3E%3Ctext x=%2212%22 y=%2216%22 font-size=%2212%22 font-family=%22sans-serif%22 font-weight=%22bold%22 text-anchor=%22middle%22 fill=%22%234f46e5%22%3E${domain[0]?.toUpperCase() || 'W'}%3C/text%3E%3C/svg%3E';">
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button class="fav-btn ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Remove favorite' : 'Add favorite'}">
            ${isFav ? '★' : '☆'}
          </button>
        </div>
      </div>

      <div class="site-body">
        <div class="site-title" title="${site.name}">${site.name}</div>
        <div class="site-domain-badge">🌐 ${domain}</div>
        ${site.description ? `<div class="site-desc">${site.description}</div>` : ''}
        ${folderInfo ? `<div class="site-folder-tag">📁 ${folderInfo}</div>` : ''}
      </div>

      <div class="site-footer">
        <button class="tactile-btn tactile-btn-sm card-copy-btn">📋 Copy</button>
        <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="tactile-btn tactile-btn-sm tactile-btn-primary">
          Visit ↗
        </a>
      </div>
    `;

    // Fav action
    const favBtn = card.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const updated = store.toggleFavorite(site.url);
      favBtn.classList.toggle('is-fav', updated);
      favBtn.innerHTML = updated ? '★' : '☆';
      this.renderQuickNav();
      window.dispatchEvent(new CustomEvent('toast', {
        detail: { message: updated ? `Added ${site.name} to favorites` : `Removed ${site.name}`, icon: updated ? '⭐' : '🗑️' }
      }));
    });

    // Copy action
    const copyBtn = card.querySelector('.card-copy-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(site.url).then(() => {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Copied link: ${site.url}`, icon: '📋' } }));
      });
    });

    return card;
  }

  createEmptyState(title, subtitle) {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <div class="empty-icon-plate">✨</div>
      <div style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 6px;">${title}</div>
      <div style="font-size: 0.88rem; color: #64748b; max-width: 380px;">${subtitle}</div>
    `;
    return el;
  }
}
