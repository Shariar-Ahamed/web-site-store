/**
 * Skeuomorphic Custom Select Component with Continuous Tree Connector Lines (Picture 2 Style)
 * Replaces ugly browser native dropdowns with tactile, searchable, hierarchical tree dropdowns.
 */

export function initCustomSelect(selectEl, config = {}) {
  if (!selectEl) return null;

  let wrapper = selectEl.closest('.custom-select-wrapper');
  if (wrapper) {
    refreshCustomSelect(selectEl);
    return wrapper;
  }

  // Create wrapper
  wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';

  // Wrap select
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);
  selectEl.classList.add('custom-select-native');

  // Trigger button
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `
    <div class="custom-select-trigger-content">
      <span class="custom-select-trigger-icon">📁</span>
      <span class="custom-select-trigger-text">Select</span>
    </div>
    <span class="custom-select-arrow">▼</span>
  `;
  wrapper.appendChild(trigger);

  // Dropdown Menu
  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');

  let searchInput = null;
  if (config.enableSearch !== false) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'custom-select-search-wrap';
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'custom-select-search';
    searchInput.placeholder = config.searchPlaceholder || '🔍 Filter folder or category...';
    searchWrap.appendChild(searchInput);
    menu.appendChild(searchWrap);
  }

  const list = document.createElement('div');
  list.className = 'custom-select-list';
  menu.appendChild(list);
  wrapper.appendChild(menu);

  // Store references on wrapper
  wrapper._selectEl = selectEl;
  wrapper._trigger = trigger;
  wrapper._menu = menu;
  wrapper._list = list;
  wrapper._searchInput = searchInput;
  wrapper._config = config;

  // Toggle dropdown on trigger click
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = wrapper.classList.contains('open');

    // Close any other open custom selects
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
      if (w !== wrapper) {
        w.classList.remove('open');
        w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });

    if (isOpen) {
      closeDropdown(wrapper);
    } else {
      openDropdown(wrapper);
    }
  });

  // Search input filtering
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();

      if (selectEl._treeData) {
        const rootNode = list.querySelector(':scope > .cs-node');
        if (rootNode) {
          const hasAny = filterTree(rootNode, query);
          let emptyMsg = list.querySelector('.custom-select-empty');
          if (!hasAny) {
            if (!emptyMsg) {
              emptyMsg = document.createElement('div');
              emptyMsg.className = 'custom-select-empty';
              emptyMsg.textContent = 'No matching folders found';
              list.appendChild(emptyMsg);
            }
            emptyMsg.style.display = 'block';
          } else if (emptyMsg) {
            emptyMsg.style.display = 'none';
          }
        }
      } else {
        const items = list.querySelectorAll('.custom-select-item');
        let visibleCount = 0;
        items.forEach(item => {
          const text = (item.dataset.searchText || '').toLowerCase();
          if (!query || text.includes(query)) {
            item.style.display = 'flex';
            visibleCount++;
          } else {
            item.style.display = 'none';
          }
        });
        let emptyMsg = list.querySelector('.custom-select-empty');
        if (visibleCount === 0) {
          if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'custom-select-empty';
            emptyMsg.textContent = 'No matching options found';
            list.appendChild(emptyMsg);
          }
          emptyMsg.style.display = 'block';
        } else if (emptyMsg) {
          emptyMsg.style.display = 'none';
        }
      }
    });

    searchInput.addEventListener('click', (e) => e.stopPropagation());
  }

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown(wrapper);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrapper.classList.contains('open')) {
      closeDropdown(wrapper);
    }
  });

  // Initial populate
  refreshCustomSelect(selectEl);

  return wrapper;
}

function openDropdown(wrapper) {
  wrapper.classList.add('open');
  wrapper._trigger.setAttribute('aria-expanded', 'true');
  if (wrapper._searchInput) {
    wrapper._searchInput.value = '';
    // Reset search visibility
    if (wrapper._selectEl._treeData) {
      const rootNode = wrapper._list.querySelector(':scope > .cs-node');
      if (rootNode) filterTree(rootNode, '');
    } else {
      wrapper._list.querySelectorAll('.custom-select-item').forEach(i => i.style.display = 'flex');
    }
    const emptyMsg = wrapper._list.querySelector('.custom-select-empty');
    if (emptyMsg) emptyMsg.style.display = 'none';
    setTimeout(() => wrapper._searchInput.focus(), 60);
  }

  // Scroll selected item into view
  const selected = wrapper._list.querySelector('.custom-select-item.selected');
  if (selected) {
    setTimeout(() => {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  }
}

function closeDropdown(wrapper) {
  wrapper.classList.remove('open');
  wrapper._trigger.setAttribute('aria-expanded', 'false');
}

/**
 * Filter hierarchical tree elements
 */
function filterTree(nodeEl, query) {
  const item = nodeEl.querySelector(':scope > .custom-select-item');
  const childrenWrapper = nodeEl.querySelector(':scope > .cs-children');

  const text = (item ? item.dataset.searchText || '' : '').toLowerCase();
  const selfMatch = !query || text.includes(query);

  let hasMatchingChild = false;
  if (childrenWrapper) {
    const childRows = childrenWrapper.querySelectorAll(':scope > .cs-node-row');
    childRows.forEach(row => {
      const childNode = row.querySelector(':scope > .cs-node');
      if (childNode) {
        const childMatches = filterTree(childNode, query);
        if (childMatches) {
          row.style.display = 'flex';
          hasMatchingChild = true;
        } else {
          row.style.display = 'none';
        }
      }
    });
  }

  const isVisible = selfMatch || hasMatchingChild;
  nodeEl.style.display = isVisible ? 'flex' : 'none';
  if (childrenWrapper) {
    childrenWrapper.style.display = hasMatchingChild ? 'flex' : (!query ? 'flex' : 'none');
  }
  return isVisible;
}

/**
 * Reconstructs custom dropdown items
 */
export function refreshCustomSelect(selectEl) {
  if (!selectEl) return;
  const wrapper = selectEl.closest('.custom-select-wrapper');
  if (!wrapper || !wrapper._list) return;

  const list = wrapper._list;
  const trigger = wrapper._trigger;
  list.innerHTML = '';

  const selectedVal = String(selectEl.value || (selectEl.selectedOptions[0] ? selectEl.selectedOptions[0].value : ''));

  function handleSelect(id, icon, cleanName) {
    selectEl.value = id;
    list.querySelectorAll('.custom-select-item').forEach(i => i.classList.remove('selected'));
    const matchedItem = list.querySelector(`.custom-select-item[data-value="${id}"]`);
    if (matchedItem) matchedItem.classList.add('selected');
    updateTriggerContent(trigger, icon, cleanName);
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    closeDropdown(wrapper);
  }

  // 1. If hierarchical tree data is present (from store.root)
  if (selectEl._treeData) {
    function buildNode(folder, depth = 0) {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'cs-node';

      const rawText = folder.name;
      const emojiMatch = rawText.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u);
      const icon = emojiMatch ? emojiMatch[1] : (depth === 0 ? '⭐' : '📁');
      const cleanName = emojiMatch ? rawText.slice(emojiMatch[0].length).trim() : rawText;

      const itemEl = document.createElement('div');
      itemEl.className = 'custom-select-item';
      itemEl.dataset.value = folder.id;
      itemEl.dataset.searchText = `${rawText} ${cleanName}`;

      const isSelected = String(folder.id) === selectedVal;
      if (isSelected) {
        itemEl.classList.add('selected');
        updateTriggerContent(trigger, icon, cleanName);
      }

      itemEl.innerHTML = `
        <div class="custom-select-item-left">
          <span class="custom-select-item-icon">${icon}</span>
          <span class="custom-select-item-text" title="${cleanName}">${cleanName}</span>
        </div>
        <span class="custom-select-item-check">✓</span>
      `;

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelect(folder.id, icon, cleanName);
      });

      nodeEl.appendChild(itemEl);

      // Subfolders with connected continuous lines
      const subfolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];
      if (subfolders.length > 0) {
        const childrenWrapper = document.createElement('div');
        childrenWrapper.className = 'cs-children';

        subfolders.forEach(sub => {
          const rowEl = document.createElement('div');
          rowEl.className = 'cs-node-row';
          rowEl.appendChild(buildNode(sub, depth + 1));
          childrenWrapper.appendChild(rowEl);
        });

        nodeEl.appendChild(childrenWrapper);
      }

      return nodeEl;
    }

    const rootNode = buildNode(selectEl._treeData, 0);
    list.appendChild(rootNode);

    // If trigger wasn't updated yet (e.g., initial render with a selected option), update it from selected option
    const activeSelected = list.querySelector('.custom-select-item.selected');
    if (!activeSelected && selectEl.selectedOptions[0]) {
      const optText = selectEl.selectedOptions[0].dataset.rawName || selectEl.selectedOptions[0].textContent.trim();
      const emMatch = optText.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u);
      updateTriggerContent(trigger, emMatch ? emMatch[1] : '📁', emMatch ? optText.slice(emMatch[0].length).trim() : optText);
    }
  } else {
    // 2. Flat list (for folder-icon or plain selects)
    const options = Array.from(selectEl.options);
    if (options.length === 0) {
      updateTriggerContent(trigger, '📁', 'No options');
      return;
    }

    options.forEach(opt => {
      const rawText = opt.textContent.trim();
      const emojiMatch = rawText.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u);
      const icon = emojiMatch ? emojiMatch[1] : '📁';
      const cleanName = emojiMatch ? rawText.slice(emojiMatch[0].length).trim() : rawText;

      const itemEl = document.createElement('div');
      itemEl.className = 'custom-select-item';
      itemEl.dataset.value = opt.value;
      itemEl.dataset.searchText = `${rawText} ${cleanName}`;

      const isSelected = opt.value === selectedVal;
      if (isSelected) {
        itemEl.classList.add('selected');
        updateTriggerContent(trigger, icon, cleanName);
      }

      itemEl.innerHTML = `
        <div class="custom-select-item-left">
          <span class="custom-select-item-icon">${icon}</span>
          <span class="custom-select-item-text" title="${cleanName}">${cleanName}</span>
        </div>
        <span class="custom-select-item-check">✓</span>
      `;

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelect(opt.value, icon, cleanName);
      });

      list.appendChild(itemEl);
    });
  }
}

function updateTriggerContent(trigger, icon, text) {
  const iconEl = trigger.querySelector('.custom-select-trigger-icon');
  const textEl = trigger.querySelector('.custom-select-trigger-text');
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
}
