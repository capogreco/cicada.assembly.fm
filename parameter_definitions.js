// Parameter Definitions with Stochastic Capabilities
export const PARAM_DEFINITIONS = {
    // Stochastic parameters (support harmonic ratios via SIN)
    clickRate: {
        element: 'click_rate',
        baseElement: 'click_rate_base',
        numSINElement: 'click_rate_num_sin', 
        denSINElement: 'click_rate_den_sin',
        valueElement: 'click_rate_value',
        stochastic: true,
        unit: 1,
        type: 'continuous',
        default: 200
    },
    
    resonantFreq: {
        element: 'resonant_freq',
        baseElement: 'resonant_freq_base',
        numSINElement: 'resonant_freq_num_sin',
        denSINElement: 'resonant_freq_den_sin', 
        valueElement: 'resonant_freq_value',
        stochastic: true,
        unit: 1,
        type: 'continuous',
        default: 800
    },
    
    harmonicFreq: {
        element: 'harmonic_freq',
        baseElement: 'harmonic_freq_base',
        numSINElement: 'harmonic_freq_num_sin',
        denSINElement: 'harmonic_freq_den_sin',
        valueElement: 'harmonic_freq_value', 
        stochastic: true,
        unit: 1,
        type: 'continuous',
        default: 1600
    },
    
    echemeRate: {
        element: 'echeme_rate',
        baseElement: 'echeme_rate_base',
        numSINElement: 'echeme_rate_num_sin',
        denSINElement: 'echeme_rate_den_sin',
        valueElement: 'echeme_rate_value',
        stochastic: true,
        unit: 1,
        type: 'continuous',
        default: 2.0
    },

    // Regular continuous parameters
    clickDuration: {
        element: 'click_duration',
        valueElement: 'click_duration_value',
        stochastic: false,
        unit: 0.001, // Convert ms to seconds
        type: 'continuous',
        default: 3
    },
    
    clickJitter: {
        element: 'click_jitter',
        valueElement: 'click_jitter_value',
        stochastic: false,
        unit: 1,
        type: 'continuous', 
        default: 0.1
    },
    
    noiseAmount: {
        element: 'noise_amount',
        valueElement: 'noise_amount_value',
        stochastic: false,
        unit: 1,
        type: 'continuous',
        default: 0.7
    },
    
    resonantQ: {
        element: 'resonant_q',
        valueElement: 'resonant_q_value',
        stochastic: false,
        unit: 1,
        type: 'continuous',
        default: 8
    },
    
    harmonicQ: {
        element: 'harmonic_q',
        valueElement: 'harmonic_q_value',
        stochastic: false,
        unit: 1,
        type: 'continuous',
        default: 5
    },
    
    echemeDuration: {
        element: 'echeme_duration',
        valueElement: 'echeme_duration_value',
        stochastic: false,
        unit: 0.001, // Convert ms to seconds
        type: 'continuous',
        default: 300
    },
    
    echemeSpacing: {
        element: 'echeme_spacing',
        valueElement: 'echeme_spacing_value',
        stochastic: false,
        unit: 0.001, // Convert ms to seconds
        type: 'continuous',
        default: 200
    },
    
    phraseIntensity: {
        element: 'phrase_intensity',
        valueElement: 'phrase_intensity_value',
        stochastic: false,
        unit: 1,
        type: 'continuous',
        default: 1.0
    },
    
    amplitude: {
        element: 'cicada_amplitude',
        valueElement: 'cicada_amplitude_value',
        stochastic: false,
        unit: 1,
        type: 'continuous',
        default: 0.0
    },

    // Discrete parameters
    pulseGroupSize: {
        element: 'pulse_group_size',
        valueElement: 'pulse_group_size_value',
        stochastic: false,
        unit: 1,
        type: 'discrete',
        default: 6
    },
    
    subGroupSize: {
        element: 'sub_group_size',
        valueElement: 'sub_group_size_value',
        stochastic: false,
        unit: 1,
        type: 'discrete',
        default: 3
    },
    
    groupSpacing: {
        element: 'group_spacing',
        valueElement: 'group_spacing_value',
        stochastic: false,
        unit: 0.001, // Convert ms to seconds
        type: 'discrete',
        default: 20
    },

    // Boolean parameters
    powered_on: {
        element: 'power',
        stochastic: false,
        unit: 1,
        type: 'boolean',
        default: false
    }
};

// Helper functions for parameter operations
export class ParameterManager {
    static getElementValue(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        if (element.type === 'checkbox') {
            return element.checked;
        } else if (element.type === 'range' || element.type === 'number') {
            return parseFloat(element.value);
        }
        return element.value;
    }
    
    static getCurrentUIValues() {
        const values = {};
        Object.entries(PARAM_DEFINITIONS).forEach(([paramName, def]) => {
            const rawValue = ParameterManager.getElementValue(def.element);
            if (rawValue !== null) {
                values[paramName] = rawValue * def.unit;
            }
        });
        return values;
    }
    
    static getStochasticConfig() {
        const config = {};
        Object.entries(PARAM_DEFINITIONS).forEach(([paramName, def]) => {
            if (def.stochastic) {
                config[paramName] = {
                    base: ParameterManager.getElementValue(def.baseElement),
                    numSIN: ParameterManager.getElementValue(def.numSINElement),
                    denSIN: ParameterManager.getElementValue(def.denSINElement)
                };
            }
        });
        return config;
    }
    
    static getContinuousParams() {
        return Object.keys(PARAM_DEFINITIONS).filter(
            name => PARAM_DEFINITIONS[name].type === 'continuous'
        );
    }
    
    static getDiscreteParams() {
        return Object.keys(PARAM_DEFINITIONS).filter(
            name => PARAM_DEFINITIONS[name].type === 'discrete'
        );
    }
    
    static getStochasticParams() {
        return Object.keys(PARAM_DEFINITIONS).filter(
            name => PARAM_DEFINITIONS[name].stochastic
        );
    }
}