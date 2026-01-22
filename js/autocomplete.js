/**
 * Autocomplete - Stop search component with fuzzy matching
 *
 * Features:
 * - Fuzzy search through 2,093 stops (English + Myanmar)
 * - Keyboard navigation (↑↓ arrows, Enter, Escape)
 * - Mobile-responsive dropdown
 * - Displays: "Hledan (လှည်းတန်း) - Yankin Road, Yankin"
 * - Click selection support
 *
 * Usage:
 * const autocomplete = new Autocomplete(inputElement, stopMatcher, {
 *   onSelect: (stop) => console.log('Selected:', stop)
 * });
 */

class Autocomplete {
  constructor(inputElement, stopMatcher, options = {}) {
    this.input = inputElement;
    this.stopMatcher = stopMatcher;
    this.options = {
      minChars: 2,           // Minimum characters before search
      maxResults: 8,         // Maximum suggestions to show
      debounceMs: 200,       // Delay before search (ms)
      onSelect: null,        // Callback when stop selected
      placeholder: 'Search stop name...',
      ...options
    };

    this.dropdown = null;
    this.selectedIndex = -1;
    this.suggestions = [];
    this.debounceTimer = null;
    this.isOpen = false;

    this.initialize();
  }

  /**
   * Initialize autocomplete component
   */
  initialize() {
    console.log('[Autocomplete] Initializing...');

    // Set placeholder
    this.input.placeholder = this.options.placeholder;
    this.input.autocomplete = 'off';

    // Create dropdown element
    this.createDropdown();

    // Attach event listeners
    this.attachEvents();

    console.log('[Autocomplete] Initialized successfully');
  }

  /**
   * Create dropdown container
   */
  createDropdown() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';
    this.dropdown.style.cssText = `
      position: absolute;
      z-index: 1000;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-height: 320px;
      overflow-y: auto;
      display: none;
      width: 100%;
    `;

    // Position relative to input
    const parent = this.input.parentElement;
    if (parent.style.position !== 'relative' && parent.style.position !== 'absolute') {
      parent.style.position = 'relative';
    }
    parent.appendChild(this.dropdown);
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    // Input events
    this.input.addEventListener('input', this.onInput.bind(this));
    this.input.addEventListener('keydown', this.onKeyDown.bind(this));
    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.input.addEventListener('blur', this.onBlur.bind(this));

    // Dropdown events
    this.dropdown.addEventListener('mousedown', this.onDropdownClick.bind(this));

    // Global click to close dropdown
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
        this.close();
      }
    });
  }

  /**
   * Handle input change
   */
  onInput(e) {
    const query = e.target.value.trim();

    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Check minimum characters
    if (query.length < this.options.minChars) {
      this.close();
      return;
    }

    // Debounce search
    this.debounceTimer = setTimeout(() => {
      this.search(query);
    }, this.options.debounceMs);
  }

  /**
   * Handle keyboard navigation
   */
  onKeyDown(e) {
    if (!this.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectStop(this.suggestions[this.selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  /**
   * Handle focus (reopen if has suggestions)
   */
  onFocus() {
    if (this.suggestions.length > 0) {
      this.open();
    }
  }

  /**
   * Handle blur (close dropdown with delay)
   */
  onBlur() {
    // Delay to allow click on dropdown
    setTimeout(() => {
      this.close();
    }, 200);
  }

  /**
   * Handle dropdown click
   */
  onDropdownClick(e) {
    e.preventDefault();
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      const index = parseInt(item.dataset.index, 10);
      this.selectStop(this.suggestions[index]);
    }
  }

  /**
   * Search stops using stopMatcher
   */
  search(query) {
    console.log(`[Autocomplete] Searching for: "${query}"`);

    if (!this.stopMatcher || !this.stopMatcher.isInitialized) {
      console.error('[Autocomplete] StopMatcher not initialized');
      this.close();
      return;
    }

    // Perform search
    const results = this.stopMatcher.search(query, this.options.maxResults);

    console.log(`[Autocomplete] Found ${results.length} results`);

    if (results.length === 0) {
      this.showNoResults(query);
      return;
    }

    this.suggestions = results;
    this.selectedIndex = -1;
    this.renderSuggestions();
    this.open();
  }

  /**
   * Render suggestions in dropdown
   */
  renderSuggestions() {
    this.dropdown.innerHTML = '';

    this.suggestions.forEach((stop, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.dataset.index = index;
      item.style.cssText = `
        padding: 10px 12px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
      `;

      // Format display text
      const primaryText = this.formatStopName(stop);
      const secondaryText = this.formatStopLocation(stop);

      item.innerHTML = `
        <div style="font-weight: 500; color: #333; margin-bottom: 2px;">
          ${primaryText}
        </div>
        <div style="font-size: 0.85em; color: #666;">
          ${secondaryText}
        </div>
      `;

      // Hover effect
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f5f5f5';
        this.selectedIndex = index;
        this.updateSelection();
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = 'white';
      });

      this.dropdown.appendChild(item);
    });

    this.updateSelection();
  }

  /**
   * Format stop name (English + Myanmar)
   */
  formatStopName(stop) {
    const en = stop.name_en || 'Unknown';
    const mm = stop.name_mm || '';

    if (mm) {
      return `${en} <span style="color: #667eea;">(${mm})</span>`;
    }
    return en;
  }

  /**
   * Format stop location (Road, Township)
   */
  formatStopLocation(stop) {
    const parts = [];

    if (stop.road_en) {
      parts.push(stop.road_en);
    }

    if (stop.township_en) {
      parts.push(stop.township_en);
    }

    return parts.join(', ') || 'Location unknown';
  }

  /**
   * Show no results message
   */
  showNoResults(query) {
    this.suggestions = [];
    this.dropdown.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #999;">
        <div style="font-size: 1.2em; margin-bottom: 5px;">🔍</div>
        <div>No stops found for "${query}"</div>
        <div style="font-size: 0.85em; margin-top: 5px;">
          Try searching in English or Myanmar
        </div>
      </div>
    `;
    this.open();
  }

  /**
   * Select stop and trigger callback
   */
  selectStop(stop) {
    console.log('[Autocomplete] Selected stop:', stop.id, stop.name_en);

    // Update input with selected stop name
    this.input.value = `${stop.name_en}${stop.name_mm ? ` (${stop.name_mm})` : ''}`;

    // Trigger callback
    if (this.options.onSelect && typeof this.options.onSelect === 'function') {
      this.options.onSelect(stop);
    }

    // Close dropdown
    this.close();
  }

  /**
   * Select next suggestion (keyboard navigation)
   */
  selectNext() {
    if (this.selectedIndex < this.suggestions.length - 1) {
      this.selectedIndex++;
      this.updateSelection();
      this.scrollToSelected();
    }
  }

  /**
   * Select previous suggestion (keyboard navigation)
   */
  selectPrevious() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateSelection();
      this.scrollToSelected();
    }
  }

  /**
   * Update visual selection highlight
   */
  updateSelection() {
    const items = this.dropdown.querySelectorAll('.autocomplete-item');

    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.style.background = '#f0f7ff';
        item.style.borderLeft = '3px solid #667eea';
      } else {
        item.style.background = 'white';
        item.style.borderLeft = 'none';
      }
    });
  }

  /**
   * Scroll dropdown to show selected item
   */
  scrollToSelected() {
    if (this.selectedIndex < 0) return;

    const items = this.dropdown.querySelectorAll('.autocomplete-item');
    const selectedItem = items[this.selectedIndex];

    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  /**
   * Open dropdown
   */
  open() {
    this.dropdown.style.display = 'block';
    this.isOpen = true;
  }

  /**
   * Close dropdown
   */
  close() {
    this.dropdown.style.display = 'none';
    this.isOpen = false;
    this.selectedIndex = -1;
  }

  /**
   * Clear input and close dropdown
   */
  clear() {
    this.input.value = '';
    this.suggestions = [];
    this.close();
  }

  /**
   * Get currently selected stop (if any)
   */
  getSelectedStop() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      return this.suggestions[this.selectedIndex];
    }
    return null;
  }

  /**
   * Set input value programmatically
   */
  setValue(stop) {
    if (stop && stop.name_en) {
      this.input.value = `${stop.name_en}${stop.name_mm ? ` (${stop.name_mm})` : ''}`;
    }
  }

  /**
   * Destroy autocomplete component
   */
  destroy() {
    if (this.dropdown && this.dropdown.parentElement) {
      this.dropdown.parentElement.removeChild(this.dropdown);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.input.removeEventListener('input', this.onInput);
    this.input.removeEventListener('keydown', this.onKeyDown);
    this.input.removeEventListener('focus', this.onFocus);
    this.input.removeEventListener('blur', this.onBlur);

    console.log('[Autocomplete] Destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Autocomplete;
}
