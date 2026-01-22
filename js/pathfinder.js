/**
 * PathFinder - Multi-transfer pathfinding engine for YBS routes
 *
 * Algorithm: Modified BFS with route awareness
 * - Finds ALL possible paths (not just shortest)
 * - Supports multiple transfers
 * - Ranks paths by transfers, stops, and distance
 * - Returns top N best options
 *
 * Uses:
 * - routeIndex for fast route lookups
 * - stopMatcher for stop data
 */

class PathFinder {
  constructor(routeIndex, stopMatcher) {
    this.routeIndex = routeIndex;
    this.stopMatcher = stopMatcher;
  }

  /**
   * Find all paths from origin to destination
   * @param {string} fromStopId - Origin stop ID
   * @param {string} toStopId - Destination stop ID
   * @param {Object} options - Search options
   * @returns {Array<Object>} - Array of path objects, ranked
   */
  findAllPaths(fromStopId, toStopId, options = {}) {
    const {
      maxTransfers = 2,        // Limit to 2 transfers (3 buses max)
      maxPaths = 10,           // Return top 10 paths
      maxDistance = 50,        // km - ignore paths > 50km
      timeout = 5000           // ms - max search time
    } = options;

    console.log(`[PathFinder] Finding paths from ${fromStopId} to ${toStopId}`);
    const startTime = performance.now();

    // Validate inputs
    if (!fromStopId || !toStopId) {
      console.error('[PathFinder] Invalid stop IDs');
      return [];
    }

    // Same origin and destination
    if (fromStopId === toStopId) {
      console.warn('[PathFinder] Origin and destination are the same');
      return [];
    }

    // Check if stops exist
    const fromStop = this.stopMatcher.getStopById(fromStopId);
    const toStop = this.stopMatcher.getStopById(toStopId);

    if (!fromStop || !toStop) {
      console.error('[PathFinder] Stop(s) not found in database');
      return [];
    }

    // BFS state
    const paths = [];
    const queue = [];
    const visited = new Map(); // "stopId-routeKey" → min transfers seen

    // Initialize: add all routes serving origin to queue
    const startRoutes = this.routeIndex.getRoutes(fromStopId);

    if (startRoutes.size === 0) {
      console.warn(`[PathFinder] No routes serve origin stop ${fromStopId}`);
      return [];
    }

    for (const routeKey of startRoutes) {
      queue.push({
        currentStop: fromStopId,
        currentRoute: routeKey,
        legs: [],  // No legs yet, starting at origin
        visitedStops: new Set([fromStopId]),
        transferCount: 0
      });
    }

    console.log(`[PathFinder] Starting search with ${startRoutes.size} routes from origin`);

    // BFS exploration
    let iterations = 0;
    const maxIterations = 10000; // Safety limit

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;

      // Check timeout
      if (performance.now() - startTime > timeout) {
        console.warn('[PathFinder] Search timeout reached');
        break;
      }

      const state = queue.shift();

      // Get all stops reachable on current route from current position
      const reachableStops = this.getReachableStops(
        state.currentStop,
        state.currentRoute
      );

      for (const stop of reachableStops) {
        // Check if we reached destination
        if (stop.id === toStopId) {
          // Build complete path
          const path = this.buildCompletePath(state, stop, fromStop, toStop);

          if (path) {
            paths.push(path);

            // Early termination if we have enough direct paths
            if (path.transferCount === 0 && paths.filter(p => p.transferCount === 0).length >= 3) {
              console.log('[PathFinder] Found sufficient direct paths, continuing search for alternatives...');
            }
          }
          continue;
        }

        // Prune: skip if visited this (stop, route) combo with fewer transfers
        const visitKey = `${stop.id}-${state.currentRoute}`;
        if (visited.has(visitKey) && visited.get(visitKey) <= state.transferCount) {
          continue;
        }
        visited.set(visitKey, state.transferCount);

        // Option 1: Continue on same route (no transfer)
        if (!state.visitedStops.has(stop.id)) {
          queue.push({
            currentStop: stop.id,
            currentRoute: state.currentRoute,
            legs: state.legs,  // Same legs, no new leg yet
            visitedStops: new Set([...state.visitedStops, stop.id]),
            transferCount: state.transferCount
          });
        }

        // Option 2: Transfer to another route (if under transfer limit)
        if (state.transferCount < maxTransfers) {
          const transferRoutes = this.routeIndex.getRoutes(stop.id);

          for (const newRoute of transferRoutes) {
            if (newRoute === state.currentRoute) continue; // Skip same route

            // Create leg for the segment we just completed
            const newLeg = {
              route: state.currentRoute,
              boardStop: state.legs.length === 0 ? fromStopId : state.legs[state.legs.length - 1].alightStop,
              alightStop: stop.id
            };

            queue.push({
              currentStop: stop.id,
              currentRoute: newRoute,
              legs: [...state.legs, newLeg],  // Add completed leg
              visitedStops: new Set([...state.visitedStops, stop.id]),
              transferCount: state.transferCount + 1
            });
          }
        }
      }
    }

    console.log(`[PathFinder] Search completed in ${iterations} iterations, ${(performance.now() - startTime).toFixed(2)}ms`);
    console.log(`[PathFinder] Found ${paths.length} raw paths`);

    // Rank and return best paths
    const rankedPaths = this.rankPaths(paths, maxPaths);

    console.log(`[PathFinder] Returning top ${rankedPaths.length} paths`);
    return rankedPaths;
  }

  /**
   * Get all stops reachable from current stop on current route
   * @param {string} fromStopId
   * @param {string} routeKey
   * @returns {Array<Object>} - Array of stop objects
   */
  getReachableStops(fromStopId, routeKey) {
    const route = this.routeIndex.getRouteData(routeKey);
    if (!route || !route.stops) return [];

    // Find position of current stop in route
    const fromIndex = route.stops.findIndex(id => String(id) === String(fromStopId));
    if (fromIndex === -1) return [];

    // Return all stops after current position (forward direction)
    const reachable = [];
    for (let i = fromIndex + 1; i < route.stops.length; i++) {
      const stop = this.stopMatcher.getStopById(route.stops[i]);
      if (stop) {
        reachable.push(stop);
      }
    }

    return reachable;
  }

  /**
   * Build complete path object from final state
   * @param {Object} state - Final BFS state
   * @param {Object} destinationStop - Destination stop object
   * @param {Object} originStop - Origin stop object
   * @param {Object} toStop - Destination stop object (for validation)
   * @returns {Object|null} - Complete path object
   */
  buildCompletePath(state, destinationStop, originStop, toStop) {
    // Create final leg
    const finalLeg = {
      route: state.currentRoute,
      boardStop: state.legs.length === 0 ? originStop.id : state.legs[state.legs.length - 1].alightStop,
      alightStop: destinationStop.id
    };

    const allLegs = [...state.legs, finalLeg];

    // Build detailed leg objects
    const detailedLegs = allLegs.map(leg => this.buildDetailedLeg(leg));

    // Calculate totals
    const totalStops = detailedLegs.reduce((sum, leg) => sum + (leg.stopCount || 0), 0);
    const totalDistance = detailedLegs.reduce((sum, leg) => sum + (leg.distance || 0), 0);

    return {
      legs: detailedLegs,
      transferCount: allLegs.length - 1,  // n legs = n-1 transfers
      totalStops,
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      score: 0  // Will be calculated during ranking
    };
  }

  /**
   * Build detailed leg object with all stop information
   * @param {Object} leg - Basic leg with route, boardStop, alightStop
   * @returns {Object} - Detailed leg object
   */
  buildDetailedLeg(leg) {
    const route = this.routeIndex.getRouteData(leg.route);
    const boardStop = this.stopMatcher.getStopById(leg.boardStop);
    const alightStop = this.stopMatcher.getStopById(leg.alightStop);

    if (!route || !boardStop || !alightStop) {
      console.error('[PathFinder] Missing data for leg:', leg);
      return null;
    }

    // Find stop indices in route
    const boardIdx = route.stops.findIndex(id => String(id) === String(leg.boardStop));
    const alightIdx = route.stops.findIndex(id => String(id) === String(leg.alightStop));

    // Extract stops between board and alight
    const stopCount = alightIdx - boardIdx;
    const intermediateStops = route.stops
      .slice(boardIdx, alightIdx + 1)
      .map(id => this.stopMatcher.getStopById(id))
      .filter(s => s);

    // Calculate distance (estimate from stop count and coordinates)
    const distance = this.calculateDistance(boardStop, alightStop, stopCount);

    return {
      route: leg.route,
      routeName: route.name || `Route ${leg.route}`,
      routeColor: route.color ? `#${route.color}` : '#667eea',
      boardStop: {
        id: boardStop.id,
        name_en: boardStop.name_en,
        name_mm: boardStop.name_mm,
        lat: boardStop.lat,
        lng: boardStop.lng,
        township: boardStop.township_en,
        road: boardStop.road_en
      },
      alightStop: {
        id: alightStop.id,
        name_en: alightStop.name_en,
        name_mm: alightStop.name_mm,
        lat: alightStop.lat,
        lng: alightStop.lng,
        township: alightStop.township_en,
        road: alightStop.road_en
      },
      stopCount,
      stops: intermediateStops,
      distance: parseFloat(distance.toFixed(2))
    };
  }

  /**
   * Calculate distance between two stops (Haversine formula)
   * @param {Object} stop1
   * @param {Object} stop2
   * @param {number} stopCount - Number of stops (for estimation)
   * @returns {number} - Distance in km
   */
  calculateDistance(stop1, stop2, stopCount = 1) {
    const R = 6371; // Earth's radius in km
    const dLat = (stop2.lat - stop1.lat) * Math.PI / 180;
    const dLon = (stop2.lng - stop1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(stop1.lat * Math.PI / 180) * Math.cos(stop2.lat * Math.PI / 180) *
             Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const straightLine = R * c;

    // Estimate actual route distance (assume 20% longer due to roads)
    const estimated = straightLine * 1.2;

    return estimated;
  }

  /**
   * Rank paths by multiple criteria
   * @param {Array<Object>} paths
   * @param {number} limit
   * @returns {Array<Object>}
   */
  rankPaths(paths, limit) {
    if (paths.length === 0) return [];

    // Calculate scoring criteria ranges
    const maxTransfers = Math.max(...paths.map(p => p.transferCount), 1);
    const maxStops = Math.max(...paths.map(p => p.totalStops), 1);
    const maxDist = Math.max(...paths.map(p => p.totalDistance), 1);

    // Score each path
    const scored = paths.map(path => {
      // Individual scores (0 = worst, 1 = best)
      const transferScore = 1 - (path.transferCount / maxTransfers);
      const stopScore = 1 - (path.totalStops / maxStops);
      const distScore = 1 - (path.totalDistance / maxDist);

      // Weighted total score
      // Weights: transfers (50%), stops (30%), distance (20%)
      const score = (transferScore * 0.5) + (stopScore * 0.3) + (distScore * 0.2);

      return {
        ...path,
        score: parseFloat(score.toFixed(3))
      };
    });

    // Sort by score (descending) and return top N
    return scored
      .sort((a, b) => {
        // Primary: score
        if (b.score !== a.score) return b.score - a.score;
        // Secondary: fewer transfers
        if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount;
        // Tertiary: fewer stops
        return a.totalStops - b.totalStops;
      })
      .slice(0, limit);
  }

  /**
   * Format path for display (human-readable summary)
   * @param {Object} path
   * @returns {string}
   */
  formatPath(path) {
    if (!path || !path.legs) return 'Invalid path';

    const routeNames = path.legs.map(leg => `Route ${leg.route}`).join(' → ');
    const summary = path.transferCount === 0
      ? `Direct: ${routeNames}`
      : `${routeNames} (${path.transferCount} transfer${path.transferCount > 1 ? 's' : ''})`;

    return `${summary} | ${path.totalStops} stops | ${path.totalDistance}km`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PathFinder;
}
