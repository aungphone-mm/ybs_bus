/**
 * StopMatcher - Reconciles stop IDs with stop names
 *
 * Problem: Route JSON files use numeric stop IDs, but users search by names.
 * Solution: Build bidirectional mappings for fast lookup in both directions.
 *
 * Features:
 * - ID → Stop object lookup (O(1))
 * - Name → Stop ID(s) lookup with fuzzy matching
 * - Supports English and Myanmar text
 * - Normalized search (case-insensitive, punctuation-removed)
 */

class StopMatcher {
  constructor() {
    this.idToStop = new Map();           // stopId → full stop object
    this.nameToIds = new Map();          // normalized name → stopId[]
    this.stops = [];                     // Array of all stops
    this.isInitialized = false;
  }

  /**
   * Initialize the matcher with stops data
   * @param {Object} stopsData - Object with stopId as keys, stop objects as values
   */
  initialize(stopsData) {
    console.log('[StopMatcher] Initializing with stops data...');
    const startTime = performance.now();

    // Clear existing data
    this.idToStop.clear();
    this.nameToIds.clear();
    this.stops = [];

    // Build indices
    for (const [id, stop] of Object.entries(stopsData)) {
      if (!stop || !stop.name_en) continue;

      // Store stop by ID
      this.idToStop.set(id, stop);
      this.stops.push(stop);

      // Index by English name (normalized)
      const normEn = this.normalize(stop.name_en);
      this.addToNameIndex(normEn, id);

      // Index by Myanmar name
      if (stop.name_mm) {
        const normMm = this.normalize(stop.name_mm);
        this.addToNameIndex(normMm, id);
      }

      // Index by road name (helps with disambiguation)
      if (stop.road_en) {
        const roadKey = this.normalize(stop.road_en);
        this.addToNameIndex(roadKey, id);
      }
    }

    this.isInitialized = true;
    const endTime = performance.now();
    console.log(`[StopMatcher] Initialized ${this.stops.length} stops in ${(endTime - startTime).toFixed(2)}ms`);
  }

  /**
   * Add a stop ID to the name index
   * @param {string} normalizedName
   * @param {string} stopId
   */
  addToNameIndex(normalizedName, stopId) {
    if (!this.nameToIds.has(normalizedName)) {
      this.nameToIds.set(normalizedName, []);
    }
    this.nameToIds.get(normalizedName).push(stopId);
  }

  /**
   * Normalize text for matching (lowercase, trim, remove punctuation)
   * @param {string} text
   * @returns {string}
   */
  normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')              // Multiple spaces → single space
      .replace(/[(),.\-/]/g, '')         // Remove common punctuation
      .replace(/\s+/g, ' ')              // Clean up again
      .trim();
  }

  /**
   * Get stop object by ID
   * @param {string|number} stopId
   * @returns {Object|null}
   */
  getStopById(stopId) {
    return this.idToStop.get(String(stopId)) || null;
  }

  /**
   * Find stop ID(s) from name query with fuzzy matching
   * @param {string} query - User search query
   * @returns {string|null} - Stop ID or null if not found
   */
  findStopId(query) {
    if (!query) return null;

    const norm = this.normalize(query);
    if (!norm) return null;

    // 1. Exact match first
    if (this.nameToIds.has(norm)) {
      return this.nameToIds.get(norm)[0];
    }

    // 2. Starts with match
    for (const [name, ids] of this.nameToIds.entries()) {
      if (name.startsWith(norm)) {
        return ids[0];
      }
    }

    // 3. Contains match
    for (const [name, ids] of this.nameToIds.entries()) {
      if (name.includes(norm)) {
        return ids[0];
      }
    }

    // 4. Query contains indexed name (reverse match)
    for (const [name, ids] of this.nameToIds.entries()) {
      if (norm.includes(name) && name.length > 3) {
        return ids[0];
      }
    }

    return null;
  }

  /**
   * Search for stops matching query - returns multiple matches
   * @param {string} query
   * @param {number} limit - Max results to return
   * @returns {Array<Object>} - Array of stop objects
   */
  search(query, limit = 10) {
    if (!query || !this.isInitialized) return [];

    const norm = this.normalize(query);
    if (!norm) return [];

    const results = new Set();  // Use Set to avoid duplicates
    const scores = new Map();   // Track match scores

    // Score different match types
    const EXACT_MATCH = 100;
    const STARTS_WITH = 80;
    const CONTAINS = 50;
    const PARTIAL = 30;

    // Exact matches
    if (this.nameToIds.has(norm)) {
      for (const id of this.nameToIds.get(norm)) {
        results.add(id);
        scores.set(id, EXACT_MATCH);
      }
    }

    // Starts with matches
    for (const [name, ids] of this.nameToIds.entries()) {
      if (name.startsWith(norm)) {
        for (const id of ids) {
          if (!results.has(id)) {
            results.add(id);
            scores.set(id, STARTS_WITH);
          }
        }
      }
    }

    // Contains matches (if we need more results)
    if (results.size < limit) {
      for (const [name, ids] of this.nameToIds.entries()) {
        if (name.includes(norm)) {
          for (const id of ids) {
            if (!results.has(id)) {
              results.add(id);
              scores.set(id, CONTAINS);
            }
          }
        }
      }
    }

    // Reverse match (query contains name) - for longer queries
    if (results.size < limit && norm.length > 5) {
      for (const [name, ids] of this.nameToIds.entries()) {
        if (norm.includes(name) && name.length > 3) {
          for (const id of ids) {
            if (!results.has(id)) {
              results.add(id);
              scores.set(id, PARTIAL);
            }
          }
        }
      }
    }

    // Convert to stop objects and sort by score
    const stopResults = Array.from(results)
      .map(id => ({
        ...this.getStopById(id),
        matchScore: scores.get(id) || 0
      }))
      .filter(stop => stop.id) // Filter out null stops
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return stopResults;
  }

  /**
   * Find all stops with exact or similar names (for handling duplicates)
   * @param {string} name
   * @returns {Array<Object>}
   */
  findSimilarStops(name) {
    const norm = this.normalize(name);
    const similar = [];

    for (const [indexedName, ids] of this.nameToIds.entries()) {
      // Similar if normalized names match or are very close
      if (indexedName === norm ||
          indexedName.includes(norm) ||
          norm.includes(indexedName)) {
        for (const id of ids) {
          const stop = this.getStopById(id);
          if (stop) similar.push(stop);
        }
      }
    }

    return similar;
  }

  /**
   * Get all stops
   * @returns {Array<Object>}
   */
  getAllStops() {
    return this.stops;
  }

  /**
   * Get statistics about the matcher
   * @returns {Object}
   */
  getStats() {
    return {
      totalStops: this.stops.length,
      uniqueNames: this.nameToIds.size,
      isInitialized: this.isInitialized
    };
  }
}

// Export as singleton instance
const stopMatcher = new StopMatcher();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = stopMatcher;
}
