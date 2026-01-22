/**
 * RouteIndex - Inverted index for fast route lookups
 *
 * Purpose: Build stopId → routeKeys[] mapping for O(1) lookups
 *
 * This enables:
 * - Finding all routes that serve a given stop
 * - Identifying transfer hubs (stops with multiple routes)
 * - Fast pathfinding queries
 *
 * Data structure: Map<stopId, Set<routeKey>>
 * Example: stopId "367" (Hledan) → Set(["1", "53", "92-Thudhamma"])
 */

class RouteIndex {
  constructor() {
    this.stopToRoutes = new Map();       // stopId → Set<routeKey>
    this.routeData = new Map();          // routeKey → full route object
    this.transferHubs = new Set();       // stopIds with 3+ routes
    this.isInitialized = false;
  }

  /**
   * Build the inverted index from routes data
   * @param {Array} routesArray - Array of route objects with stops[]
   * @returns {Promise<void>}
   */
  async initialize(routesArray) {
    console.log('[RouteIndex] Building inverted index...');
    const startTime = performance.now();

    // Clear existing data
    this.stopToRoutes.clear();
    this.routeData.clear();
    this.transferHubs.clear();

    let processedRoutes = 0;
    let totalStopEntries = 0;

    // Process each route
    for (const route of routesArray) {
      if (!route || !route.stops || !Array.isArray(route.stops)) {
        console.warn('[RouteIndex] Skipping invalid route:', route);
        continue;
      }

      // Generate route key (used for lookups)
      const routeKey = this.getRouteKey(route);

      // Store full route data
      this.routeData.set(routeKey, route);

      // Index each stop in this route
      for (const stopId of route.stops) {
        const stopIdStr = String(stopId);  // Ensure string type

        // Initialize Set for this stop if not exists
        if (!this.stopToRoutes.has(stopIdStr)) {
          this.stopToRoutes.set(stopIdStr, new Set());
        }

        // Add this route to the stop's route set
        this.stopToRoutes.get(stopIdStr).add(routeKey);
        totalStopEntries++;
      }

      processedRoutes++;
    }

    // Identify transfer hubs (stops served by 3+ routes)
    for (const [stopId, routes] of this.stopToRoutes.entries()) {
      if (routes.size >= 3) {
        this.transferHubs.add(stopId);
      }
    }

    this.isInitialized = true;
    const endTime = performance.now();

    console.log(`[RouteIndex] Index built in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[RouteIndex] Processed ${processedRoutes} routes`);
    console.log(`[RouteIndex] Indexed ${this.stopToRoutes.size} unique stops`);
    console.log(`[RouteIndex] Total stop-route entries: ${totalStopEntries}`);
    console.log(`[RouteIndex] Transfer hubs identified: ${this.transferHubs.size}`);
  }

  /**
   * Generate a unique route key for indexing
   * @param {Object} route
   * @returns {string}
   */
  getRouteKey(route) {
    // Use route_num from exploration, or fallback to route_id
    if (route.route_num) return route.route_num;
    if (route.route_id) return route.route_id;
    if (route.file) {
      // Extract from filename: "route53.json" → "53"
      const match = route.file.match(/route([^.]+)\.json/);
      if (match) return match[1];
    }
    return route.id || 'unknown';
  }

  /**
   * Get all routes serving a specific stop
   * @param {string|number} stopId
   * @returns {Set<string>} - Set of route keys
   */
  getRoutes(stopId) {
    const stopIdStr = String(stopId);
    return this.stopToRoutes.get(stopIdStr) || new Set();
  }

  /**
   * Get all routes serving a stop as array
   * @param {string|number} stopId
   * @returns {Array<string>}
   */
  getRoutesArray(stopId) {
    return Array.from(this.getRoutes(stopId));
  }

  /**
   * Get full route object by route key
   * @param {string} routeKey
   * @returns {Object|null}
   */
  getRouteData(routeKey) {
    return this.routeData.get(routeKey) || null;
  }

  /**
   * Check if a stop is a transfer hub (3+ routes)
   * @param {string|number} stopId
   * @returns {boolean}
   */
  isTransferHub(stopId) {
    const stopIdStr = String(stopId);
    return this.transferHubs.has(stopIdStr);
  }

  /**
   * Get all transfer hubs
   * @returns {Array<string>}
   */
  getTransferHubs() {
    return Array.from(this.transferHubs);
  }

  /**
   * Find common stops between two routes (potential transfer points)
   * @param {string} routeKey1
   * @param {string} routeKey2
   * @returns {Array<string>} - Array of stop IDs
   */
  findCommonStops(routeKey1, routeKey2) {
    const route1 = this.getRouteData(routeKey1);
    const route2 = this.getRouteData(routeKey2);

    if (!route1 || !route2 || !route1.stops || !route2.stops) {
      return [];
    }

    const stops1 = new Set(route1.stops.map(String));
    const common = [];

    for (const stop of route2.stops) {
      const stopStr = String(stop);
      if (stops1.has(stopStr)) {
        common.push(stopStr);
      }
    }

    return common;
  }

  /**
   * Get statistics about the index
   * @returns {Object}
   */
  getStats() {
    return {
      totalStops: this.stopToRoutes.size,
      totalRoutes: this.routeData.size,
      transferHubs: this.transferHubs.size,
      avgRoutesPerStop: this.calculateAvgRoutesPerStop(),
      isInitialized: this.isInitialized
    };
  }

  /**
   * Calculate average number of routes per stop
   * @returns {number}
   */
  calculateAvgRoutesPerStop() {
    if (this.stopToRoutes.size === 0) return 0;

    let total = 0;
    for (const routes of this.stopToRoutes.values()) {
      total += routes.size;
    }

    return (total / this.stopToRoutes.size).toFixed(2);
  }

  /**
   * Get stops served by multiple routes (sorted by route count)
   * @param {number} limit
   * @returns {Array<Object>}
   */
  getTopTransferPoints(limit = 20) {
    const stops = [];

    for (const [stopId, routes] of this.stopToRoutes.entries()) {
      if (routes.size > 1) {
        stops.push({
          stopId,
          routeCount: routes.size,
          routes: Array.from(routes)
        });
      }
    }

    return stops
      .sort((a, b) => b.routeCount - a.routeCount)
      .slice(0, limit);
  }

  /**
   * Check if index is ready for queries
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.stopToRoutes.size > 0;
  }

  /**
   * Export index for caching (e.g., IndexedDB)
   * @returns {Object}
   */
  exportForCache() {
    return {
      stopToRoutes: Array.from(this.stopToRoutes.entries()).map(([k, v]) => [k, Array.from(v)]),
      transferHubs: Array.from(this.transferHubs),
      timestamp: Date.now()
    };
  }

  /**
   * Import index from cache
   * @param {Object} cachedData
   */
  importFromCache(cachedData) {
    console.log('[RouteIndex] Importing from cache...');

    this.stopToRoutes.clear();
    this.transferHubs.clear();

    // Restore stopToRoutes Map
    for (const [stopId, routesArray] of cachedData.stopToRoutes) {
      this.stopToRoutes.set(stopId, new Set(routesArray));
    }

    // Restore transferHubs Set
    for (const stopId of cachedData.transferHubs) {
      this.transferHubs.add(stopId);
    }

    this.isInitialized = true;
    console.log(`[RouteIndex] Imported ${this.stopToRoutes.size} stops from cache`);
  }
}

// Export as singleton instance
const routeIndex = new RouteIndex();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = routeIndex;
}
