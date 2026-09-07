import { store } from './store.js';

export class ChartViewRenderer {
  constructor(containerEl) {
    this.container = containerEl;
    this.scale = 1;
    this.panX = 60;
    this.panY = 60;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.collapsedIds = new Set();
    this.searchQuery = '';
  }

  render(searchQuery = '') {
    this.searchQuery = searchQuery.toLowerCase().trim();
    this.container.innerHTML = '';

    // Create Canvas Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-canvas-wrapper';

    // SVG Element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'chart-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // Transform Group for Pan & Zoom
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'chart-viewport-group');
    g.setAttribute('transform', `matrix(${this.scale}, 0, 0, ${this.scale}, ${this.panX}, ${this.panY})`);
    this.viewportGroup = g;

    // Build hierarchical layout
    const layoutTree = this.computeLayout(store.root);

    // Render Links
    const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linksGroup.setAttribute('class', 'chart-links-layer');
    this.renderLinks(layoutTree, linksGroup);
    g.appendChild(linksGroup);

    // Render Nodes
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'chart-nodes-layer');
    this.renderNodes(layoutTree, nodesGroup);
    g.appendChild(nodesGroup);

    svg.appendChild(g);
    wrapper.appendChild(svg);

    // Floating Controls (Zoom in, Zoom out, Reset)
    const controls = document.createElement('div');
    controls.className = 'chart-floating-controls';
    controls.innerHTML = `
      <button class="tactile-btn tactile-btn-sm chart-btn-zoom-in" title="Zoom In">➕</button>
      <button class="tactile-btn tactile-btn-sm chart-btn-zoom-out" title="Zoom Out">➖</button>
      <button class="tactile-btn tactile-btn-sm chart-btn-reset" title="Reset View">🎯 Fit</button>
    `;

    wrapper.appendChild(controls);
    this.container.appendChild(wrapper);

    this.bindEvents(wrapper, svg, controls);
  }

  computeLayout(rootNode) {
    const horizontalGap = 240;
    const leafVerticalGap = 42;

    let currentLeafY = 60;

    const measureAndPosition = (node, depth = 0) => {
      const isCollapsed = this.collapsedIds.has(node.id);
      const isFolder = node.type === 'folder';

      let children = [];
      if (isFolder && node.children && !isCollapsed) {
        children = node.children.map(child => measureAndPosition(child, depth + 1));
      }

      let y;
      if (children.length === 0) {
        y = currentLeafY;
        currentLeafY += leafVerticalGap;
      } else {
        const firstY = children[0].y;
        const lastY = children[children.length - 1].y;
        y = (firstY + lastY) / 2;
      }

      const x = depth * horizontalGap + 50;

      // Check if matches search
      let isMatch = false;
      if (this.searchQuery) {
        const matchName = node.name && node.name.toLowerCase().includes(this.searchQuery);
        const matchUrl = node.url && node.url.toLowerCase().includes(this.searchQuery);
        isMatch = matchName || matchUrl;
      }

      return {
        ...node,
        depth,
        x,
        y,
        isCollapsed,
        isMatch,
        children
      };
    };

    return measureAndPosition(rootNode);
  }

  renderLinks(node, group) {
    if (!node.children || node.children.length === 0) return;

    node.children.forEach(child => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x1 = node.x;
      const y1 = node.y;
      const x2 = child.x;
      const y2 = child.y;

      const dx = (x2 - x1) * 0.55;
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      path.setAttribute('d', d);
      path.setAttribute('class', `chart-curve-link ${child.isMatch ? 'match-link' : ''}`);

      group.appendChild(path);
      this.renderLinks(child, group);
    });
  }

  renderNodes(node, group) {
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeG.setAttribute('class', `chart-node ${node.type} ${node.isMatch ? 'search-match' : ''}`);
    nodeG.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    const isFolder = node.type === 'folder';
    const hasChildren = isFolder && node.children;
    const isRoot = node.depth === 0;

    // Pin Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', isRoot ? '9' : (isFolder ? '7' : '5'));
    circle.setAttribute('class', `chart-node-circle ${isRoot ? 'root-circle' : (isFolder ? 'folder-circle' : 'leaf-circle')}`);
    nodeG.appendChild(circle);

    // ForeignObject for Rich HTML Tag Label
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', '12');
    fo.setAttribute('y', '-16');
    fo.setAttribute('width', '280');
    fo.setAttribute('height', '38');

    const div = document.createElement('div');
    div.className = `chart-node-label ${node.isMatch ? 'highlight' : ''}`;

    if (isFolder) {
      const count = node.children ? node.children.length : (node.childCount || 0);
      div.innerHTML = `
        <span class="chart-label-icon">${isRoot ? '⭐' : '📁'}</span>
        <span class="chart-label-text">${node.name}</span>
        ${hasChildren && node.isCollapsed ? `<span class="chart-badge-collapsed">+${count}</span>` : ''}
      `;

      div.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.collapsedIds.has(node.id)) {
          this.collapsedIds.delete(node.id);
        } else {
          this.collapsedIds.add(node.id);
        }
        this.render(this.searchQuery);
      });
    } else {
      // Website Node
      let domain = '';
      try {
        domain = new URL(node.url).hostname.replace(/^www\./, '');
      } catch {
        domain = node.url || '';
      }

      div.innerHTML = `
        <span class="chart-label-text site-name" title="${node.name}">${node.name}</span>
        <span class="chart-site-domain">${domain}</span>
        <a href="${node.url}" target="_blank" rel="noopener noreferrer" class="chart-visit-icon" title="Visit website">↗</a>
      `;

      div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('chart-visit-icon')) {
          navigator.clipboard.writeText(node.url);
          window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Copied: ${node.url}`, icon: '📋' } }));
        }
      });
    }

    fo.appendChild(div);
    nodeG.appendChild(fo);
    group.appendChild(nodeG);

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => this.renderNodes(child, group));
    }
  }

  bindEvents(wrapper, svg, controls) {
    // 1. Mouse Drag Panning
    svg.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chart-node-label') || e.target.closest('button') || e.target.closest('a')) return;
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      svg.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        svg.style.cursor = 'grab';
      }
    });

    // 2. Mouse Wheel Zoom
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.35), 2.2);

      // Zoom towards mouse pointer
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
    }, { passive: false });

    // 3. Zoom Controls
    const btnZoomIn = controls.querySelector('.chart-btn-zoom-in');
    const btnZoomOut = controls.querySelector('.chart-btn-zoom-out');
    const btnReset = controls.querySelector('.chart-btn-reset');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.scale = Math.min(this.scale * 1.2, 2.2);
        this.updateTransform();
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.scale = Math.max(this.scale * 0.8, 0.35);
        this.updateTransform();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.scale = 1;
        this.panX = 60;
        this.panY = 60;
        this.updateTransform();
      });
    }
  }

  updateTransform() {
    if (this.viewportGroup) {
      this.viewportGroup.setAttribute(
        'transform',
        `matrix(${this.scale}, 0, 0, ${this.scale}, ${this.panX}, ${this.panY})`
      );
    }
  }
}
