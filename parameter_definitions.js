// Unified Parameter Configuration System
export const PARAM_CONFIG = {
    // Stochastic timing parameters
    clickRate: {
        element: 'click_rate',
        valueElement: 'click_rate_value',
        default: 200,
        unit: 1,
        rampTime: 0.2,
        safety: [50, 800],
        stochastic: {
            baseElement: 'click_rate_base',
            numSINElement: 'click_rate_num_sin',
            denSINElement: 'click_rate_den_sin'
        }
    },

    echemeRate: {
        element: 'echeme_rate',
        valueElement: 'echeme_rate_value',
        default: 2.0,
        unit: 1,
        rampTime: 0.2,
        safety: [0.1, 10],
        stochastic: {
            baseElement: 'echeme_rate_base',
            numSINElement: 'echeme_rate_num_sin',
            denSINElement: 'echeme_rate_den_sin'
        }
    },

    groupSpacing: {
        element: 'group_spacing',
        valueElement: 'group_spacing_value',
        default: 20,
        unit: 0.001, // Convert ms to seconds
        rampTime: 0.3,
        safety: [0.002, 0.1], // 2ms to 100ms
        stochastic: {
            baseElement: 'group_spacing_base',
            numSINElement: 'group_spacing_num_sin',
            denSINElement: 'group_spacing_den_sin'
        }
    },

    // Stochastic frequency parameters
    resonantFreq: {
        element: 'resonant_freq',
        valueElement: 'resonant_freq_value',
        default: 800,
        unit: 1,
        rampTime: 0.5,
        safety: [200, 3000],
        stochastic: {
            baseElement: 'resonant_freq_base',
            numSINElement: 'resonant_freq_num_sin',
            denSINElement: 'resonant_freq_den_sin'
        }
    },

    harmonicFreq: {
        element: 'harmonic_freq',
        valueElement: 'harmonic_freq_value',
        default: 1600,
        unit: 1,
        rampTime: 0.5,
        safety: [400, 6000],
        stochastic: {
            baseElement: 'harmonic_freq_base',
            numSINElement: 'harmonic_freq_num_sin',
            denSINElement: 'harmonic_freq_den_sin'
        }
    },

    // Regular continuous parameters
    clickDuration: {
        element: 'click_duration',
        valueElement: 'click_duration_value',
        default: 3.0,
        unit: 0.001, // Convert ms to seconds
        rampTime: 0.05,
        safety: [0.00001, 0.01],
        stochastic: false
    },

    clickJitter: {
        element: 'click_jitter',
        valueElement: 'click_jitter_value',
        default: 0.1,
        unit: 1,
        rampTime: 0.05,
        safety: [0, 0.3],
        stochastic: false
    },

    noiseAmount: {
        element: 'noise_amount',
        valueElement: 'noise_amount_value',
        default: 0.7,
        unit: 1,
        rampTime: 0.05,
        safety: [0, 1],
        stochastic: false
    },

    resonantQ: {
        element: 'resonant_q',
        valueElement: 'resonant_q_value',
        default: 8,
        unit: 1,
        rampTime: 0.3,
        safety: [1, 30],
        stochastic: false
    },

    harmonicQ: {
        element: 'harmonic_q',
        valueElement: 'harmonic_q_value',
        default: 5,
        unit: 1,
        rampTime: 0.3,
        safety: [1, 20],
        stochastic: false
    },

    echemeDuration: {
        element: 'echeme_duration',
        valueElement: 'echeme_duration_value',
        default: 300,
        unit: 0.001, // Convert ms to seconds
        rampTime: 0.1,
        safety: [0.05, 2.0],
        stochastic: {
            baseElement: 'echeme_duration_base',
            numSINElement: 'echeme_duration_num_sin',
            denSINElement: 'echeme_duration_den_sin'
        }
    },

    echemeSpacing: {
        element: 'echeme_spacing',
        valueElement: 'echeme_spacing_value',
        default: 200,
        unit: 0.001, // Convert ms to seconds
        rampTime: 0.1,
        safety: [0.05, 1.0],
        stochastic: {
            baseElement: 'echeme_spacing_base',
            numSINElement: 'echeme_spacing_num_sin',
            denSINElement: 'echeme_spacing_den_sin'
        }
    },

    echemeDurationDetune: {
        element: 'echeme_duration_detune',
        valueElement: 'echeme_duration_detune_value',
        default: 0,
        unit: 0.01, // Convert percentage to decimal
        rampTime: 0.1,
        safety: [0, 0.02],
        stochastic: false
    },

    echemeSpacingDetune: {
        element: 'echeme_spacing_detune',
        valueElement: 'echeme_spacing_detune_value',
        default: 0,
        unit: 0.01, // Convert percentage to decimal
        rampTime: 0.1,
        safety: [0, 0.02],
        stochastic: false
    },

    phraseIntensity: {
        element: 'phrase_intensity',
        valueElement: 'phrase_intensity_value',
        default: 1.0,
        unit: 1,
        rampTime: 0.05,
        safety: [0.1, 2.0],
        stochastic: false
    },

    amplitude: {
        element: 'cicada_amplitude',
        valueElement: 'cicada_amplitude_value',
        default: 0.0,
        unit: 1,
        rampTime: 0.05,
        safety: [0, 1],
        stochastic: false
    },

    // Former discrete parameters (now continuous)
    pulseGroupSize: {
        element: 'pulse_group_size',
        valueElement: 'pulse_group_size_value',
        default: 6,
        unit: 1,
        rampTime: 0.1,
        safety: [2, 12],
        stochastic: false,
        integer: true // Special flag for integer values
    },

    subGroupSize: {
        element: 'sub_group_size',
        valueElement: 'sub_group_size_value',
        default: 3,
        unit: 1,
        rampTime: 0.1,
        safety: [2, 6],
        stochastic: false,
        integer: true
    },

    // Boolean parameter (now continuous 0/1)
    powered_on: {
        element: 'power',
        default: 1,
        unit: 1,
        rampTime: 0.01,
        safety: [0, 1],
        stochastic: false,
        boolean: true // Special flag for boolean behavior
    }
};

// Unified Parameter Manager
export class ParameterManager {
    static getElementValue(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        if (element.type === 'checkbox') {
            return element.checked ? 1 : 0;
        } else if (element.type === 'range' || element.type === 'number') {
            return parseFloat(element.value);
        }
        return element.value;
    }

    static getCurrentUIValues() {
        const values = {};
        Object.entries(PARAM_CONFIG).forEach(([paramName, config]) => {
            const rawValue = this.getElementValue(config.element);
            if (rawValue !== null) {
                values[paramName] = rawValue * config.unit;
            }
        });
        return values;
    }

    static getStochasticConfig() {
        const config = {};
        Object.entries(PARAM_CONFIG).forEach(([paramName, paramConfig]) => {
            if (paramConfig.stochastic) {
                config[paramName] = {
                    base: this.getElementValue(paramConfig.stochastic.baseElement),
                    numSIN: this.getElementValue(paramConfig.stochastic.numSINElement),
                    denSIN: this.getElementValue(paramConfig.stochastic.denSINElement)
                };
            }
        });
        return config;
    }

    static getStochasticParams() {
        return Object.keys(PARAM_CONFIG).filter(
            name => PARAM_CONFIG[name].stochastic
        );
    }

    static applySafety(value, safetyLimits) {
        if (!safetyLimits) return value;
        const [min, max] = safetyLimits;
        return Math.max(min, Math.min(max, value));
    }

    static isStochastic(paramName) {
        return PARAM_CONFIG[paramName]?.stochastic || false;
    }

    static isInteger(paramName) {
        return PARAM_CONFIG[paramName]?.integer || false;
    }

    static isBoolean(paramName) {
        return PARAM_CONFIG[paramName]?.boolean || false;
    }
}