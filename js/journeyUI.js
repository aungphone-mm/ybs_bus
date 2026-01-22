/**
 * JourneyUI - Shared UI components for displaying path results
 *
 * Features:
 * - Render path cards with route information
 * - Show transfers and connections
 * - Expandable stop lists
 * - Distance and time estimates
 * - Actions: Show on Map, Save, Share
 * - Bilingual support (English + Myanmar)
 * - Mobile-responsive design
 *
 * Usage:
 * const journeyUI = new JourneyUI(containerElement, {
 *   onShowOnMap: (path) => { ... },
 *   onSave: (path) => { ... }
 * });
 * journeyUI.renderPaths(paths);
 */

class JourneyUI {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onShowOnMap: null,     // Callback when "Show on Map" clicked
      onSave: null,          // Callback when "Save" clicked
      onShare: null,         // Callback when "Share" clicked
      showActions: true,     // Show action buttons
      expandFirst: true,     // Auto-expand first path
      ...options
    };

    this.currentPaths = [];
  }

  /**
   * Render all paths in the container
   * @param {Array<Object>} paths - Array of path objects from PathFinder
   */
  renderPaths(paths) {
    console.log(`[JourneyUI] Rendering ${paths.length} paths`);

    if (!paths || paths.length === 0) {
      this.showNoResults();
      return;
    }

    this.currentPaths = paths;
    this.container.innerHTML = '';

    // Add header
    const header = this.createHeader(paths);
    this.container.appendChild(header);

    // Render each path
    paths.forEach((path, index) => {
      const card = this.createPathCard(path, index);
      this.container.appendChild(card);
    });
  }

  /**
   * Create header with results summary
   */
  createHeader(paths) {
    const header = document.createElement('div');
    header.className = 'journey-header';
    header.style.cssText = `
      padding: 15px;
      background: #f8f9fa;
      border-bottom: 2px solid #e9ecef;
      margin-bottom: 10px;
    `;

    const directCount = paths.filter(p => p.transferCount === 0).length;
    const transferCount = paths.length - directCount;

    header.innerHTML = `
      <div style="font-size: 1.1em; font-weight: 600; color: #333; margin-bottom: 5px;">
        ${paths.length} route${paths.length > 1 ? 's' : ''} found
      </div>
      <div style="font-size: 0.9em; color: #666;">
        ${directCount > 0 ? `${directCount} direct` : ''}
        ${directCount > 0 && transferCount > 0 ? ' • ' : ''}
        ${transferCount > 0 ? `${transferCount} with transfer${transferCount > 1 ? 's' : ''}` : ''}
      </div>
    `;

    return header;
  }

  /**
   * Create path card
   */
  createPathCard(path, index) {
    const card = document.createElement('div');
    card.className = 'journey-path-card';
    card.dataset.pathIndex = index;
    card.style.cssText = `
      background: white;
      border: 2px solid ${index === 0 ? '#667eea' : '#e9ecef'};
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: all 0.2s;
    `;

    // Add hover effect
    card.addEventListener('mouseenter', () => {
      if (index !== 0) card.style.borderColor = '#667eea';
    });
    card.addEventListener('mouseleave', () => {
      if (index !== 0) card.style.borderColor = '#e9ecef';
    });

    // Best option badge
    if (index === 0) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        background: #667eea;
        color: white;
        padding: 4px 12px;
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      badge.textContent = '⭐ Best Option';
      card.appendChild(badge);
    }

    // Card content
    const content = document.createElement('div');
    content.style.padding = '15px';

    // Path summary
    const summary = this.createPathSummary(path, index);
    content.appendChild(summary);

    // Path details (expandable)
    const details = this.createPathDetails(path, index);
    content.appendChild(details);

    // Actions
    if (this.options.showActions) {
      const actions = this.createActions(path, index);
      content.appendChild(actions);
    }

    card.appendChild(content);
    return card;
  }

  /**
   * Create path summary (always visible)
   */
  createPathSummary(path, index) {
    const summary = document.createElement('div');
    summary.className = 'path-summary';
    summary.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    `;

    // Left side: Route info
    const routeInfo = document.createElement('div');
    routeInfo.style.flex = '1';

    // Route badges
    const routeBadges = this.createRouteBadges(path);
    routeInfo.appendChild(routeBadges);

    // Transfer info
    if (path.transferCount > 0) {
      const transferInfo = document.createElement('div');
      transferInfo.style.cssText = `
        font-size: 0.85em;
        color: #666;
        margin-top: 5px;
      `;
      transferInfo.textContent = `${path.transferCount} transfer${path.transferCount > 1 ? 's' : ''}`;
      routeInfo.appendChild(transferInfo);
    }

    summary.appendChild(routeInfo);

    // Right side: Stats
    const stats = document.createElement('div');
    stats.style.cssText = `
      text-align: right;
      margin-left: 15px;
    `;
    stats.innerHTML = `
      <div style="font-weight: 600; color: #333; font-size: 1.1em;">
        ${path.totalStops} stops
      </div>
      <div style="font-size: 0.85em; color: #666; margin-top: 2px;">
        ${path.totalDistance} km
      </div>
    `;
    summary.appendChild(stats);

    // Toggle details on click
    summary.addEventListener('click', () => {
      this.toggleDetails(index);
    });

    return summary;
  }

  /**
   * Create route badges
   */
  createRouteBadges(path) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    `;

    path.legs.forEach((leg, legIndex) => {
      // Route badge
      const badge = document.createElement('div');
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        background: ${leg.routeColor || '#667eea'};
        color: white;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.9em;
      `;
      badge.textContent = `🚌 ${leg.route}`;
      container.appendChild(badge);

      // Transfer arrow
      if (legIndex < path.legs.length - 1) {
        const arrow = document.createElement('span');
        arrow.style.cssText = `
          color: #999;
          font-size: 1.2em;
        `;
        arrow.textContent = '→';
        container.appendChild(arrow);
      }
    });

    return container;
  }

  /**
   * Create path details (initially hidden)
   */
  createPathDetails(path, index) {
    const details = document.createElement('div');
    details.className = 'path-details';
    details.dataset.pathIndex = index;
    details.style.cssText = `
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
      display: ${index === 0 && this.options.expandFirst ? 'block' : 'none'};
    `;

    // Render each leg
    path.legs.forEach((leg, legIndex) => {
      const legElement = this.createLegElement(leg, legIndex, path.legs.length);
      details.appendChild(legElement);

      // Add transfer indicator between legs
      if (legIndex < path.legs.length - 1) {
        const transfer = this.createTransferIndicator(leg.alightStop);
        details.appendChild(transfer);
      }
    });

    return details;
  }

  /**
   * Create leg element
   */
  createLegElement(leg, legIndex, totalLegs) {
    const legElement = document.createElement('div');
    legElement.className = 'path-leg';
    legElement.style.cssText = `
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 3px solid ${leg.routeColor || '#667eea'};
    `;

    // Route header
    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    header.innerHTML = `
      <div>
        <span style="color: ${leg.routeColor || '#667eea'};">🚌 Route ${leg.route}</span>
        <span style="font-weight: normal; color: #666; margin-left: 8px; font-size: 0.9em;">
          ${leg.stopCount} stop${leg.stopCount > 1 ? 's' : ''} • ${leg.distance} km
        </span>
      </div>
    `;
    legElement.appendChild(header);

    // Board stop
    const boardStop = this.createStopInfo(leg.boardStop, 'Board', '🟢');
    legElement.appendChild(boardStop);

    // Expandable stop list
    if (leg.stops && leg.stops.length > 2) {
      const stopList = this.createStopList(leg.stops, legIndex);
      legElement.appendChild(stopList);
    }

    // Alight stop
    const alightStop = this.createStopInfo(leg.alightStop, 'Alight', '🔴');
    legElement.appendChild(alightStop);

    return legElement;
  }

  /**
   * Create stop info display
   */
  createStopInfo(stop, label, icon) {
    const stopDiv = document.createElement('div');
    stopDiv.style.cssText = `
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 8px;
    `;

    stopDiv.innerHTML = `
      <div style="font-size: 0.75em; color: #666; text-transform: uppercase; margin-bottom: 3px;">
        ${icon} ${label}
      </div>
      <div style="font-weight: 500; color: #333;">
        ${stop.name_en}
      </div>
      ${stop.name_mm ? `<div style="font-size: 0.9em; color: #667eea; margin-top: 2px;">${stop.name_mm}</div>` : ''}
      <div style="font-size: 0.85em; color: #666; margin-top: 3px;">
        ${stop.road ? stop.road + ', ' : ''}${stop.township || ''}
      </div>
    `;

    return stopDiv;
  }

  /**
   * Create expandable stop list
   */
  createStopList(stops, legIndex) {
    const container = document.createElement('div');
    container.style.marginBottom = '8px';

    // Toggle button
    const toggle = document.createElement('button');
    toggle.className = 'stop-list-toggle';
    toggle.style.cssText = `
      width: 100%;
      padding: 6px;
      background: #f0f7ff;
      border: 1px solid #d0e5ff;
      border-radius: 4px;
      color: #667eea;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.2s;
    `;
    toggle.textContent = `▼ Show ${stops.length - 2} intermediate stop${stops.length - 2 > 1 ? 's' : ''}`;

    // Stop list (hidden by default)
    const list = document.createElement('div');
    list.className = 'stop-list';
    list.style.cssText = `
      display: none;
      margin-top: 8px;
      padding: 8px;
      background: #fafbfc;
      border-radius: 4px;
      font-size: 0.85em;
    `;

    // Render intermediate stops (skip first and last)
    stops.slice(1, -1).forEach((stop, idx) => {
      const stopItem = document.createElement('div');
      stopItem.style.cssText = `
        padding: 4px 0;
        color: #666;
        border-bottom: 1px dashed #e9ecef;
      `;
      stopItem.textContent = `${idx + 2}. ${stop.name_en}`;
      list.appendChild(stopItem);
    });

    // Toggle functionality
    let isExpanded = false;
    toggle.addEventListener('click', () => {
      isExpanded = !isExpanded;
      list.style.display = isExpanded ? 'block' : 'none';
      toggle.textContent = isExpanded
        ? `▲ Hide intermediate stops`
        : `▼ Show ${stops.length - 2} intermediate stop${stops.length - 2 > 1 ? 's' : ''}`;
    });

    container.appendChild(toggle);
    container.appendChild(list);
    return container;
  }

  /**
   * Create transfer indicator
   */
  createTransferIndicator(transferStop) {
    const transfer = document.createElement('div');
    transfer.style.cssText = `
      padding: 12px;
      background: #fff9e6;
      border: 2px dashed #ffd93d;
      border-radius: 6px;
      margin: 15px 0;
      text-align: center;
    `;

    transfer.innerHTML = `
      <div style="font-weight: 600; color: #e67e00; margin-bottom: 5px;">
        🔄 Transfer here
      </div>
      <div style="font-size: 0.9em; color: #666;">
        ${transferStop.name_en}
      </div>
      ${transferStop.name_mm ? `<div style="font-size: 0.85em; color: #667eea;">${transferStop.name_mm}</div>` : ''}
    `;

    return transfer;
  }

  /**
   * Create action buttons
   */
  createActions(path, index) {
    const actions = document.createElement('div');
    actions.className = 'path-actions';
    actions.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
    `;

    // Show on Map button
    const showMapBtn = this.createActionButton('Show on Map', '🗺️', () => {
      if (this.options.onShowOnMap) {
        this.options.onShowOnMap(path, index);
      }
    }, true);
    actions.appendChild(showMapBtn);

    // Save button
    const saveBtn = this.createActionButton('Save', '💾', () => {
      if (this.options.onSave) {
        this.options.onSave(path, index);
      }
    });
    actions.appendChild(saveBtn);

    // Share button
    const shareBtn = this.createActionButton('Share', '📤', () => {
      if (this.options.onShare) {
        this.options.onShare(path, index);
      }
    });
    actions.appendChild(shareBtn);

    return actions;
  }

  /**
   * Create action button
   */
  createActionButton(text, icon, onClick, primary = false) {
    const button = document.createElement('button');
    button.style.cssText = `
      flex: 1;
      padding: 10px;
      background: ${primary ? '#667eea' : 'white'};
      color: ${primary ? 'white' : '#667eea'};
      border: 2px solid #667eea;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9em;
    `;
    button.textContent = `${icon} ${text}`;

    button.addEventListener('mouseenter', () => {
      if (primary) {
        button.style.background = '#5568d3';
      } else {
        button.style.background = '#f0f7ff';
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = primary ? '#667eea' : 'white';
    });

    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Toggle path details visibility
   */
  toggleDetails(index) {
    const details = this.container.querySelector(`.path-details[data-path-index="${index}"]`);
    if (details) {
      const isVisible = details.style.display === 'block';
      details.style.display = isVisible ? 'none' : 'block';
    }
  }

  /**
   * Show no results message
   */
  showNoResults() {
    this.container.innerHTML = `
      <div style="
        padding: 40px;
        text-align: center;
        color: #999;
        background: #f8f9fa;
        border-radius: 8px;
      ">
        <div style="font-size: 3em; margin-bottom: 10px;">🚌</div>
        <div style="font-size: 1.2em; font-weight: 600; margin-bottom: 10px;">
          No routes found
        </div>
        <div style="font-size: 0.9em;">
          Try selecting different stops or check if the stops are in the same area.
        </div>
      </div>
    `;
  }

  /**
   * Clear all rendered content
   */
  clear() {
    this.container.innerHTML = '';
    this.currentPaths = [];
  }

  /**
   * Get currently rendered paths
   */
  getPaths() {
    return this.currentPaths;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JourneyUI;
}
