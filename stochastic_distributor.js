// Stochastic Distribution Module for Client-Side Parameter Resolution
export class StochasticDistributor {
    constructor(clientId = null) {
        this.clientId = clientId;
        this.clientRatios = new Map(); // Cache for generated ratios
        this.isEnabled = false;
    }

    // Parse Stochastic Integer Notation (SIN) like "1,3,5" or "2-7"
    parseSIN(sinString) {
        if (!sinString || sinString.trim() === '') return [1];
        
        const trimmed = sinString.trim();
        
        // Handle range notation like "2-7"
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                const range = [];
                for (let i = start; i <= end; i++) {
                    range.push(i);
                }
                return range;
            }
        }
        
        // Handle comma-separated list like "1,3,5,7"
        if (trimmed.includes(',')) {
            return trimmed.split(',')
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n));
        }
        
        // Single number
        const single = parseInt(trimmed);
        return isNaN(single) ? [1] : [single];
    }

    // Generate harmonic ratio for a specific client and parameter
    generateHarmonicRatio(clientId, paramName, numSIN, denSIN) {
        const numerators = this.parseSIN(numSIN);
        const denominators = this.parseSIN(denSIN);
        
        // Use deterministic pseudo-randomness based on client ID and parameter
        const seed = this.hashString(clientId + paramName);
        const rng = this.createSeededRNG(seed);
        
        // Select random numerator and denominator
        const num = numerators[Math.floor(rng() * numerators.length)];
        const den = denominators[Math.floor(rng() * denominators.length)];
        
        return num / den;
    }

    // Ensure client has a cached ratio for the given parameter
    ensureClientRatio(clientId, paramName, numSIN, denSIN) {
        const key = `${clientId}_${paramName}`;
        
        if (!this.clientRatios.has(key)) {
            const ratio = this.generateHarmonicRatio(clientId, paramName, numSIN, denSIN);
            this.clientRatios.set(key, ratio);
        }
        
        return this.clientRatios.get(key);
    }

    // Resolve a single parameter value with stochastic ratio if applicable
    resolveParameter(paramName, baseValue, stochasticConfig) {
        if (!this.isEnabled || !stochasticConfig || !stochasticConfig[paramName]) {
            return baseValue;
        }
        
        const config = stochasticConfig[paramName];
        const ratio = this.ensureClientRatio(
            this.clientId, 
            paramName, 
            config.numSIN, 
            config.denSIN
        );
        
        const finalValue = baseValue * ratio;
        console.log(`DEBUG: Stochastic calc for ${paramName}: base=${baseValue} * ratio=${ratio} = ${finalValue}`);
        
        return finalValue;
    }

    // Resolve all parameters in a parameter set
    resolveAllParameters(baseParams, stochasticConfig) {
        const resolved = {};
        
        Object.entries(baseParams).forEach(([paramName, baseValue]) => {
            resolved[paramName] = this.resolveParameter(paramName, baseValue, stochasticConfig);
        });
        
        return resolved;
    }

    // Enable/disable stochastic resolution
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    // Clear cached ratios (useful for regeneration)
    clearRatios() {
        this.clientRatios.clear();
    }

    // Regenerate ratios for specific parameters
    regenerateRatios(paramNames = null) {
        if (paramNames) {
            paramNames.forEach(paramName => {
                const key = `${this.clientId}_${paramName}`;
                this.clientRatios.delete(key);
            });
        } else {
            this.clearRatios();
        }
    }

    // Get current ratio for a parameter (for debugging/display)
    getCurrentRatio(paramName) {
        const key = `${this.clientId}_${paramName}`;
        return this.clientRatios.get(key) || 1.0;
    }

    // Hash string to number (for deterministic randomness)
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Create seeded random number generator
    createSeededRNG(seed) {
        let state = seed;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // Static method to create distributor for client
    static createForClient(clientId) {
        return new StochasticDistributor(clientId);
    }

    // Static method to create controller-side distributor
    static createForController() {
        return new StochasticDistributor('controller');
    }
}

// Utility functions for working with stochastic distributions
export class StochasticUtils {
    // Validate SIN notation
    static isValidSIN(sinString) {
        try {
            const distributor = new StochasticDistributor();
            const parsed = distributor.parseSIN(sinString);
            return parsed.length > 0 && parsed.every(n => n > 0);
        } catch (e) {
            return false;
        }
    }

    // Generate a preview of possible ratios for SIN notation
    static previewRatios(numSIN, denSIN, maxSamples = 10) {
        const distributor = new StochasticDistributor();
        const numerators = distributor.parseSIN(numSIN);
        const denominators = distributor.parseSIN(denSIN);
        
        const ratios = [];
        numerators.forEach(num => {
            denominators.forEach(den => {
                ratios.push(num / den);
            });
        });
        
        // Remove duplicates and sort
        const uniqueRatios = [...new Set(ratios)].sort((a, b) => a - b);
        
        // Return up to maxSamples
        return uniqueRatios.slice(0, maxSamples);
    }

    // Calculate statistics for a SIN configuration
    static calculateSINStats(numSIN, denSIN) {
        const ratios = this.previewRatios(numSIN, denSIN, 1000);
        
        if (ratios.length === 0) return null;
        
        const min = Math.min(...ratios);
        const max = Math.max(...ratios);
        const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
        
        return { min, max, mean, count: ratios.length };
    }
}