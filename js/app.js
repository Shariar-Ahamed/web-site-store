import { store } from './store.js';
import { UIRenderer } from './ui.js';
import { initCustomSelect, refreshCustomSelect } from './custom-select.js';

document.addEventListener('DOMContentLoaded', () => {
  const ui = new UIRenderer();
  ui.render();

  // ---------------------------------------------------------
  // VIEW MODE SWITCHER (TREE vs GRID)
  // ---------------------------------------------------------
  const btnViewTree = document.getElementById('btn-view-tree');
  const btnViewGrid = document.getElementById('btn-view-grid');
  const btnViewChart = document.getElementById('btn-view-chart');

  if (btnViewTree) {
    btnViewTree.addEventListener('click', () => {
      store.setViewMode('tree');
      ui.render();
    });
  }

  if (btnViewGrid) {
    btnViewGrid.addEventListener('click', () => {
      store.setViewMode('grid');
      ui.render();
    });
  }

  if (btnViewChart) {
    btnViewChart.addEventListener('click', () => {
      store.setViewMode('chart');
      ui.render();
    });
  }

  // ---------------------------------------------------------
  // TREE ACTION CONTROLS (EXPAND ALL / COLLAPSE ALL)
  // ---------------------------------------------------------
  const btnExpandAll = document.getElementById('btn-expand-all');
  const btnCollapseAll = document.getElementById('btn-collapse-all');

  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      ui.expandAllTreeBranches();
    });
  }

  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      ui.collapseAllTreeBranches();
    });
  }

  // ---------------------------------------------------------
  // SEARCH FUNCTIONALITY (AUTO-EXPAND MATCHES IN TREE VIEW)
  // ---------------------------------------------------------
  const searchInput = document.getElementById('search-input');
  let searchTimeout = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const val = e.target.value.trim();

      searchTimeout = setTimeout(() => {
        if (val.length > 0) {
          const results = store.search(val);
          ui.render(results, val);
        } else {
          ui.render();
        }
      }, 150);
    });

    // Keyboard shortcut (Ctrl+K or / to focus search)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== searchInput)) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
        ui.render();
      }
    });
  }

  // ---------------------------------------------------------
  // QUICK NAVIGATION FILTER BUTTONS
  // ---------------------------------------------------------
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = item.getAttribute('data-filter');
      store.activeFilter = filter;
      if (filter === 'folder') {
        store.activeFolderId = store.root.id || '423';
      }
      if (searchInput) searchInput.value = '';
      ui.render();
    });
  });

  // ---------------------------------------------------------
  // MODAL CONTROLS & DOM REFS
  // ---------------------------------------------------------
  const addSiteModal = document.getElementById('modal-add-site');
  const addFolderModal = document.getElementById('modal-add-folder');

  const btnOpenAddSite = document.getElementById('btn-open-add-site');
  const btnOpenAddFolder = document.getElementById('btn-open-add-folder');

  function openModal(modal) {
    if (modal) modal.classList.add('open');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('open');
  }

  // Close when clicking overlay or close buttons
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
    const closeBtn = overlay.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(overlay));
    }
    overlay.querySelectorAll('.modal-close-btn-action').forEach(btn => {
      btn.addEventListener('click', () => closeModal(overlay));
    });
  });

  // Helper to populate folder select options
  function populateFolderSelect(selectEl, selectedId = null) {
    if (!selectEl) return;
    selectEl.innerHTML = '';

    function appendFolders(folder, depth = 0) {
      const opt = document.createElement('option');
      opt.value = folder.id;
      opt.textContent = `${'    '.repeat(depth)}${folder.name}`;
      opt.dataset.depth = depth;
      opt.dataset.rawName = folder.name;
      if (String(folder.id) === String(selectedId)) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);

      if (folder.children) {
        folder.children
          .filter(c => c.type === 'folder')
          .forEach(sub => appendFolders(sub, depth + 1));
      }
    }

    appendFolders(store.root);
    selectEl._treeData = store.root;

    // Initialize or refresh custom select
    if (!selectEl.closest('.custom-select-wrapper')) {
      initCustomSelect(selectEl, {
        enableSearch: true,
        searchPlaceholder: '🔍 Filter folder or category...'
      });
    } else {
      refreshCustomSelect(selectEl);
    }
  }

  // Initialize icon dropdown
  const folderIconSelect = document.getElementById('folder-icon');
  if (folderIconSelect) {
    initCustomSelect(folderIconSelect, { enableSearch: false });
  }

  // 1. Add Website Modal
  if (btnOpenAddSite) {
    btnOpenAddSite.addEventListener('click', () => {
      const folderSelect = document.getElementById('site-target-folder');
      populateFolderSelect(folderSelect, store.activeFolderId);
      document.getElementById('form-add-site').reset();
      // Ensure target folder stays on active folder after form reset
      folderSelect.value = store.activeFolderId || store.root.id;
      refreshCustomSelect(folderSelect);
      openModal(addSiteModal);
      document.getElementById('site-name').focus();
    });
  }

  const formAddSite = document.getElementById('form-add-site');
  if (formAddSite) {
    formAddSite.addEventListener('submit', (e) => {
      e.preventDefault();
      const folderId = document.getElementById('site-target-folder').value;
      const name = document.getElementById('site-name').value;
      const url = document.getElementById('site-url').value;
      const description = document.getElementById('site-description').value;

      try {
        const added = store.addWebsite(folderId, { name, url, description });
        closeModal(addSiteModal);
        store.activeFolderId = folderId;
        store.activeFilter = 'folder';
        ui.render();
        showToast(`Added "${added.name}" successfully!`, '🚀');
      } catch (err) {
        showToast(err.message || 'Error adding website', '⚠️');
      }
    });
  }

  // 2. Add Folder Modal
  if (btnOpenAddFolder) {
    btnOpenAddFolder.addEventListener('click', () => {
      const parentSelect = document.getElementById('folder-parent');
      populateFolderSelect(parentSelect, store.activeFolderId);
      document.getElementById('form-add-folder').reset();
      parentSelect.value = store.activeFolderId || store.root.id;
      refreshCustomSelect(parentSelect);
      if (folderIconSelect) refreshCustomSelect(folderIconSelect);
      openModal(addFolderModal);
      document.getElementById('folder-name').focus();
    });
  }

  const formAddFolder = document.getElementById('form-add-folder');
  if (formAddFolder) {
    formAddFolder.addEventListener('submit', (e) => {
      e.preventDefault();
      const parentId = document.getElementById('folder-parent').value;
      const name = document.getElementById('folder-name').value;
      const icon = document.getElementById('folder-icon').value;

      try {
        const newFolder = store.addFolder(parentId, name, icon);
        closeModal(addFolderModal);
        store.activeFolderId = newFolder.id;
        ui.sidebarExpandedFolders.add(parentId);
        ui.sidebarExpandedFolders.add(newFolder.id);
        ui.render();
        showToast(`Created folder "${newFolder.name}"`, '📁');
      } catch (err) {
        showToast(err.message || 'Error creating folder', '⚠️');
      }
    });
  }

  // ---------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ---------------------------------------------------------
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, icon = '✨') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span style="font-size: 1.15rem;">${icon}</span>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  window.addEventListener('toast', (e) => {
    if (e.detail) {
      showToast(e.detail.message, e.detail.icon);
    }
  });
});
