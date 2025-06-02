class CicadaProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'clickRate', defaultValue: 200, minValue: 50, maxValue: 800, automationRate: 'a-rate' },
            { name: 'clickDuration', defaultValue: 0.003, minValue: 0.00001, maxValue: 0.01, automationRate: 'a-rate' },
            { name: 'clickJitter', defaultValue: 0.1, minValue: 0, maxValue: 0.3, automationRate: 'a-rate' },
            { name: 'noiseAmount', defaultValue: 0.7, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
            { name: 'resonantFreq', defaultValue: 800, minValue: 200, maxValue: 3000, automationRate: 'a-rate' },
            { name: 'resonantQ', defaultValue: 8, minValue: 1, maxValue: 30, automationRate: 'a-rate' },
            { name: 'harmonicFreq', defaultValue: 1600, minValue: 400, maxValue: 6000, automationRate: 'a-rate' },
            { name: 'harmonicQ', defaultValue: 5, minValue: 1, maxValue: 20, automationRate: 'a-rate' },
            { name: 'echemeRate', defaultValue: 2.0, minValue: 0.1, maxValue: 10, automationRate: 'a-rate' },
            { name: 'echemeDuration', defaultValue: 0.3, minValue: 0.05, maxValue: 2.0, automationRate: 'a-rate' },
            { name: 'echemeSpacing', defaultValue: 0.2, minValue: 0.05, maxValue: 1.0, automationRate: 'a-rate' },
            { name: 'echemeDurationDetune', defaultValue: 0.0, minValue: 0.0, maxValue: 0.02, automationRate: 'a-rate' },
            { name: 'echemeSpacingDetune', defaultValue: 0.0, minValue: 0.0, maxValue: 0.02, automationRate: 'a-rate' },
            { name: 'phraseIntensity', defaultValue: 1.0, minValue: 0.1, maxValue: 2.0, automationRate: 'a-rate' },
            { name: 'amplitude', defaultValue: 0.0, minValue: 0.0, maxValue: 1.0, automationRate: 'a-rate' },
            { name: 'groupSpacing', defaultValue: 0.02, minValue: 0.002, maxValue: 0.2, automationRate: 'a-rate' }
        ];
    }

    // Simple 1D simplex noise implementation
    simplexNoise(x) {
        const i = Math.floor(x);
        const f = x - i;
        const t = f * f * (3.0 - 2.0 * f);
        
        const a = this.hash(i);
        const b = this.hash(i + 1);
        
        return a + t * (b - a);
    }
    
    hash(n) {
        n = Math.sin(n) * 43758.5453;
        return 2.0 * (n - Math.floor(n)) - 1.0;
    }

    constructor() {
        super();
        
        // Stage 1: Click generation
        this.clickTimer = 0;
        this.clickEnvelope = 0;
        this.randomSeed = 1;
        
        // Simplex noise for modulation
        this.noiseTime = 0;
        
        // Hierarchical rhythm tracking
        this.echemeTimer = 0;
        this.echemePhase = 'active';
        this.echemeStartTime = 0;
        
        // TCP-like parameter state (from message port)
        this.pulseGroupSize = 6;
        this.subGroupSize = 3;
        this.pulseCount = 0;
        this.subGroupCount = 0;
        this.groupTimer = 0;
        
        // Rhythmic quantization for timing parameters
        this.currentGroupSpacing = 0.02; // Current active spacing
        this.targetGroupSpacing = 0.02;  // Target spacing to apply
        this.pendingGroupSpacingChange = false;
        
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
        
        // Listen for TCP-like parameter messages
        this.port.onmessage = (event) => {
            const { type, name, value } = event.data;
            if (type === 'discrete_param') {
                switch (name) {
                    case 'pulseGroupSize':
                        this.pulseGroupSize = Math.floor(value);
                        break;
                    case 'subGroupSize':
                        this.subGroupSize = Math.floor(value);
                        break;
                }
            }
        };
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
        const echemeRate = parameters.echemeRate;
        const echemeDuration = parameters.echemeDuration;
        const echemeSpacing = parameters.echemeSpacing;
        const echemeDurationDetune = parameters.echemeDurationDetune;
        const echemeSpacingDetune = parameters.echemeSpacingDetune;
        const phraseIntensity = parameters.phraseIntensity;
        const amplitude = parameters.amplitude;
        const groupSpacing = parameters.groupSpacing;
        
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
                const amp = amplitude.length > 1 ? amplitude[i] : amplitude[0];
                const echRate = echemeRate.length > 1 ? echemeRate[i] : echemeRate[0];
                const echDur = echemeDuration.length > 1 ? echemeDuration[i] : echemeDuration[0];
                const echSpace = echemeSpacing.length > 1 ? echemeSpacing[i] : echemeSpacing[0];
                const echDurDetune = echemeDurationDetune.length > 1 ? echemeDurationDetune[i] : echemeDurationDetune[0];
                const echSpaceDetune = echemeSpacingDetune.length > 1 ? echemeSpacingDetune[i] : echemeSpacingDetune[0];
                const groupSpaceParam = groupSpacing.length > 1 ? groupSpacing[i] : groupSpacing[0];
                
                // Detect groupSpacing parameter changes and queue for rhythmic quantization
                if (Math.abs(groupSpaceParam - this.targetGroupSpacing) > 0.0001) {
                    this.targetGroupSpacing = groupSpaceParam;
                    this.pendingGroupSpacingChange = true;
                    console.log(`Queued groupSpacing change: ${this.currentGroupSpacing} → ${this.targetGroupSpacing}`);
                }
                
                // Apply simplex noise modulation to echeme timing
                this.noiseTime += 1.0 / sampleRate;
                const noiseScale = 0.05; // Very slow modulation - adjust for speed
                const durationNoise = this.simplexNoise(this.noiseTime * noiseScale);
                const spacingNoise = this.simplexNoise((this.noiseTime + 100) * noiseScale); // Offset for independence
                
                // Apply modulation: base value ± (detune * noise)
                const modulatedEchemeDuration = echDur * (1.0 + echDurDetune * durationNoise);
                const modulatedEchemeSpacing = echSpace * (1.0 + echSpaceDetune * spacingNoise);
                const phraseInt = phraseIntensity.length > 1 ? phraseIntensity[i] : phraseIntensity[0];
                
                // Stage 1: Generate clicks with hierarchical rhythms
                let clickSignal = 0;
                
                // Update echeme state
                const echemeTotal = modulatedEchemeDuration + modulatedEchemeSpacing;
                const ecdemeCyclePos = echemeTotal > 0 ? (currentTime - this.echemeStartTime) % echemeTotal : 0;
                
                if (echemeTotal > 0 && ecdemeCyclePos < modulatedEchemeDuration) {
                    this.echemePhase = 'active';
                } else if (echemeTotal > 0) {
                    this.echemePhase = 'silent';
                }
                
                // Only generate clicks during active echeme phase
                let rhythmGate = (echemeTotal === 0 || this.echemePhase === 'active') ? 1.0 : 0.0;
                
                // Check for pulse grouping
                if (this.groupTimer > 0) {
                    this.groupTimer--;
                    rhythmGate = 0.0;
                } else if (this.pulseCount >= this.pulseGroupSize) {
                    // Rhythmically-quantized timing changes happen here
                    if (this.pendingGroupSpacingChange) {
                        this.currentGroupSpacing = this.targetGroupSpacing;
                        this.pendingGroupSpacingChange = false;
                        console.log(`Applied groupSpacing change at group boundary: ${this.currentGroupSpacing}`);
                    }
                    
                    this.groupTimer = this.currentGroupSpacing * sampleRate;
                    this.pulseCount = 0;
                    this.subGroupCount = 0;
                    rhythmGate = 0.0;
                }
                
                // Generate click if timing and rhythm conditions met
                if (rhythmGate > 0 && this.clickTimer <= 0) {
                    const jitterFactor = 1 + (this.random() - 0.5) * jitter;
                    this.clickTimer = (sampleRate / rate) * jitterFactor;
                    this.clickEnvelope = 1.0;
                    
                    this.pulseCount++;
                    this.subGroupCount++;
                    
                    if (this.subGroupCount > this.subGroupSize) {
                        this.clickEnvelope *= 0.8;
                        this.subGroupCount = 0;
                    }
                }
                
                // Generate click if envelope is active
                if (this.clickEnvelope > 0.001) {
                    const noiseSignal = (this.random() - 0.5) * 2;
                    const impulseSignal = Math.sin(2 * Math.PI * 1000 * this.clickEnvelope);
                    clickSignal = (noiseSignal * noise + impulseSignal * (1 - noise)) * this.clickEnvelope * rhythmGate;
                    
                    const decayRate = 1 - (1 / (duration * sampleRate));
                    this.clickEnvelope *= decayRate;
                }
                
                this.clickTimer--;
                
                // Stage 2: Apply resonant filtering
                let resonantSignal = this.processBiquad(this.primaryFilter, clickSignal);
                resonantSignal += this.processBiquad(this.harmonicFilter, clickSignal) * 0.3;
                
                outputBuffer[i] = resonantSignal * amp * phraseInt;
            }
        }
        
        return true;
    }
}

registerProcessor('cicada-processor', CicadaProcessor);