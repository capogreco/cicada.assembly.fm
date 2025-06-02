class DualStageCicadaProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'clickRate', defaultValue: 200, minValue: 50, maxValue: 800, automationRate: 'a-rate' },
            { name: 'clickDuration', defaultValue: 0.003, minValue: 0.001, maxValue: 0.01, automationRate: 'a-rate' },
            { name: 'clickJitter', defaultValue: 0.1, minValue: 0, maxValue: 0.3, automationRate: 'a-rate' },
            { name: 'noiseAmount', defaultValue: 0.7, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
            { name: 'resonantFreq', defaultValue: 800, minValue: 200, maxValue: 3000, automationRate: 'a-rate' },
            { name: 'resonantQ', defaultValue: 8, minValue: 1, maxValue: 30, automationRate: 'a-rate' },
            { name: 'harmonicFreq', defaultValue: 1600, minValue: 400, maxValue: 6000, automationRate: 'a-rate' },
            { name: 'harmonicQ', defaultValue: 5, minValue: 1, maxValue: 20, automationRate: 'a-rate' },
            { name: 'pulseGroupSize', defaultValue: 6, minValue: 2, maxValue: 12, automationRate: 'a-rate' },
            { name: 'subGroupSize', defaultValue: 3, minValue: 2, maxValue: 6, automationRate: 'a-rate' },
            { name: 'groupSpacing', defaultValue: 0.02, minValue: 0.005, maxValue: 0.1, automationRate: 'a-rate' },
            { name: 'echemeRate', defaultValue: 2.0, minValue: 0.1, maxValue: 10, automationRate: 'a-rate' },
            { name: 'echemeDuration', defaultValue: 0.3, minValue: 0.05, maxValue: 2.0, automationRate: 'a-rate' },
            { name: 'echemeSpacing', defaultValue: 0.2, minValue: 0.05, maxValue: 1.0, automationRate: 'a-rate' },
            { name: 'phraseIntensity', defaultValue: 1.0, minValue: 0.1, maxValue: 2.0, automationRate: 'a-rate' },
            { name: 'volume', defaultValue: 0.3, minValue: 0, maxValue: 1, automationRate: 'a-rate' }
        ];
    }

    constructor() {
        super();
        
        // Stage 1: Click generation
        this.clickTimer = 0;
        this.clickEnvelope = 0;
        this.randomSeed = 1;
        
        // Hierarchical rhythm tracking
        this.pulseCount = 0;           // Count pulses within current group
        this.subGroupCount = 0;        // Count subgroups within current group
        this.groupTimer = 0;           // Timer for spacing between groups
        this.echemeTimer = 0;          // Timer for echeme patterns
        this.echemePhase = 'active';   // 'active' or 'silent'
        this.echemeStartTime = 0;
        
        // Stage 2: Resonant filters (biquad coefficients)
        this.primaryFilter = {
            x1: 0, x2: 0, y1: 0, y2: 0,
            b0: 0, b1: 0, b2: 0, a1: 0, a2: 0
        };
        
        this.harmonicFilter = {
            x1: 0, x2: 0, y1: 0, y2: 0,
            b0: 0, b1: 0, b2: 0, a1: 0, a2: 0
        };
        
        this.updateFilters(800, 8, 1600, 5);
    }
    
    // Simple pseudo-random number generator
    random() {
        this.randomSeed = (this.randomSeed * 1664525 + 1013904223) % 4294967296;
        return this.randomSeed / 4294967296;
    }
    
    // Update biquad filter coefficients for bandpass
    updateFilters(freq1, q1, freq2, q2) {
        this.updateBiquad(this.primaryFilter, freq1, q1);
        this.updateBiquad(this.harmonicFilter, freq2, q2);
    }
    
    updateBiquad(filter, freq, q) {
        const omega = 2 * Math.PI * freq / sampleRate;
        const sin = Math.sin(omega);
        const cos = Math.cos(omega);
        const alpha = sin / (2 * q);
        
        const b0 = alpha;
        const b1 = 0;
        const b2 = -alpha;
        const a0 = 1 + alpha;
        const a1 = -2 * cos;
        const a2 = 1 - alpha;
        
        filter.b0 = b0 / a0;
        filter.b1 = b1 / a0;
        filter.b2 = b2 / a0;
        filter.a1 = a1 / a0;
        filter.a2 = a2 / a0;
    }
    
    // Process audio through biquad filter
    processBiquad(filter, input) {
        const output = filter.b0 * input + filter.b1 * filter.x1 + filter.b2 * filter.x2
                      - filter.a1 * filter.y1 - filter.a2 * filter.y2;
        
        filter.x2 = filter.x1;
        filter.x1 = input;
        filter.y2 = filter.y1;
        filter.y1 = output;
        
        return output;
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const clickRate = parameters.clickRate;
        const clickDuration = parameters.clickDuration;
        const clickJitter = parameters.clickJitter;
        const noiseAmount = parameters.noiseAmount;
        const resonantFreq = parameters.resonantFreq;
        const resonantQ = parameters.resonantQ;
        const harmonicFreq = parameters.harmonicFreq;
        const harmonicQ = parameters.harmonicQ;
        const volume = parameters.volume;
        
        // Update filters if frequency changed
        const freq1 = resonantFreq.length > 1 ? resonantFreq[0] : resonantFreq[0];
        const q1 = resonantQ.length > 1 ? resonantQ[0] : resonantQ[0];
        const freq2 = harmonicFreq.length > 1 ? harmonicFreq[0] : harmonicFreq[0];
        const q2 = harmonicQ.length > 1 ? harmonicQ[0] : harmonicQ[0];
        this.updateFilters(freq1, q1, freq2, q2);
        
        // Track time for echeme cycles
        const currentTime = currentFrame / sampleRate;
        if (this.echemeStartTime === 0) {
            this.echemeStartTime = currentTime;
        }

        for (let channel = 0; channel < output.length; channel++) {
            const outputBuffer = output[channel];
            
            for (let i = 0; i < outputBuffer.length; i++) {
                const rate = clickRate.length > 1 ? clickRate[i] : clickRate[0];
                const duration = clickDuration.length > 1 ? clickDuration[i] : clickDuration[0];
                const jitter = clickJitter.length > 1 ? clickJitter[i] : clickJitter[0];
                const noise = noiseAmount.length > 1 ? noiseAmount[i] : noiseAmount[0];
                const vol = volume.length > 1 ? volume[i] : volume[0];
                
                // Stage 1: Generate clicks with hierarchical rhythms
                let clickSignal = 0;
                
                // Get rhythm parameters
                const groupSize = Math.floor(parameters.pulseGroupSize.length > 1 ? parameters.pulseGroupSize[i] : parameters.pulseGroupSize[0]);
                const subSize = Math.floor(parameters.subGroupSize.length > 1 ? parameters.subGroupSize[i] : parameters.subGroupSize[0]);
                const groupSpacing = parameters.groupSpacing.length > 1 ? parameters.groupSpacing[i] : parameters.groupSpacing[0];
                const echemeRate = parameters.echemeRate.length > 1 ? parameters.echemeRate[i] : parameters.echemeRate[0];
                const echemeDuration = parameters.echemeDuration.length > 1 ? parameters.echemeDuration[i] : parameters.echemeDuration[0];
                const echemeSpacing = parameters.echemeSpacing.length > 1 ? parameters.echemeSpacing[i] : parameters.echemeSpacing[0];
                const phraseIntensity = parameters.phraseIntensity.length > 1 ? parameters.phraseIntensity[i] : parameters.phraseIntensity[0];
                
                // Update echeme state
                const echemeTotal = echemeDuration + echemeSpacing;
                const ecdemeCyclePos = (currentTime - this.echemeStartTime) % echemeTotal;
                
                if (ecdemeCyclePos < echemeDuration) {
                    this.echemePhase = 'active';
                } else {
                    this.echemePhase = 'silent';
                }
                
                // Only generate clicks during active echeme phase
                let rhythmGate = this.echemePhase === 'active' ? 1.0 : 0.0;
                
                // Check for pulse grouping (Tibicina-style subgroups)
                if (this.groupTimer > 0) {
                    this.groupTimer--;
                    rhythmGate = 0.0; // Silent during group spacing
                } else if (this.pulseCount >= groupSize) {
                    // Start group spacing
                    this.groupTimer = groupSpacing * sampleRate;
                    this.pulseCount = 0;
                    this.subGroupCount = 0;
                    rhythmGate = 0.0;
                }
                
                // Generate click if timing and rhythm conditions met
                if (rhythmGate > 0 && this.clickTimer <= 0) {
                    const jitterFactor = 1 + (this.random() - 0.5) * jitter;
                    this.clickTimer = (sampleRate / rate) * jitterFactor;
                    this.clickEnvelope = 1.0;
                    
                    // Track pulse grouping
                    this.pulseCount++;
                    this.subGroupCount++;
                    
                    // Add slight amplitude variation for subgroups
                    if (this.subGroupCount > subSize) {
                        this.clickEnvelope *= 0.8; // Slightly quieter between subgroups
                        this.subGroupCount = 0;
                    }
                }
                
                // Generate click if envelope is active
                if (this.clickEnvelope > 0.001) {
                    const noiseSignal = (this.random() - 0.5) * 2;
                    const impulseSignal = Math.sin(2 * Math.PI * 1000 * this.clickEnvelope);
                    clickSignal = (noiseSignal * noise + impulseSignal * (1 - noise)) * this.clickEnvelope * rhythmGate;
                    
                    // Exponential decay for click envelope
                    const decayRate = 1 - (1 / (duration * sampleRate));
                    this.clickEnvelope *= decayRate;
                }
                
                this.clickTimer--;
                
                // Stage 2: Apply resonant filtering
                let resonantSignal = this.processBiquad(this.primaryFilter, clickSignal);
                resonantSignal += this.processBiquad(this.harmonicFilter, clickSignal) * 0.3;
                
                // Apply phrase-level intensity modulation
                const phraseModulation = phraseIntensity;
                
                outputBuffer[i] = resonantSignal * vol * phraseModulation;
            }
        }
        
        return true;
    }
}

registerProcessor('dual-stage-cicada', DualStageCicadaProcessor);