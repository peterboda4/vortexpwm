# FX Chain System

True stereo effects chain with drag-and-drop UI for the PWM Synthesizer.

## Architecture

```
Synth Output → FX Chain (AudioWorklet) → Destination
                    ↓
         [Effect 1] → [Effect 2] → [Effect 3] → ...
```

## Available Effects

### 1. **Hard Clip** (`hardclip`)

Simple but effective hard clipping distortion.

**Parameters:**

- `drive` (1-20x) - Pre-gain before clipping
- `threshold` (0.1-1) - Clipping threshold
- `mix` (0-1) - Dry/wet mix

### 2. **Phaser** (`phaser`)

4-stage all-pass filter modulated by LFO for classic phasing effect.

**Parameters:**

- `rate` (0.1-10 Hz) - LFO speed
- `depth` (0-1) - Modulation depth
- `feedback` (0-0.95) - Resonance/emphasis
- `mix` (0-1) - Dry/wet mix

**Implementation:** True stereo with independent L/R all-pass filter chains.

### 3. **Bit Crusher** (`bitcrusher`)

Lo-fi digital distortion with bit depth and sample rate reduction.

**Parameters:**

- `bitDepth` (1-16) - Bit depth quantization
- `sampleRateReduction` (1-50x) - Sample rate divisor
- `mix` (0-1) - Dry/wet mix

**Implementation:** Independent sample-and-hold per channel for true stereo.

### 4. **Chorus** (`chorus`)

Rich stereo chorus with 2 voices per channel and linear interpolation.

**Parameters:**

- `rate` (0.1-5 Hz) - LFO speed
- `depth` (0-1) - Detune amount
- `delay` (5-50ms) - Base delay time
- `mix` (0-1) - Dry/wet mix

**Implementation:** Phase-offset LFOs between L/R for wide stereo image.

### 5. **Stereo Delay** (`delay`)

Independent delay lines for L/R with cross-feedback for ping-pong effects.

**Parameters:**

- `delayTimeL` (0.001-2s) - Left channel delay
- `delayTimeR` (0.001-2s) - Right channel delay
- `feedback` (0-0.95) - Standard feedback
- `crossFeedback` (0-0.5) - Cross-channel feedback
- `mix` (0-1) - Dry/wet mix

### 6. **Reverb** (`reverb`)

Freeverb algorithm with 8 comb + 4 allpass filters per channel.

**Parameters:**

- `roomSize` (0-1) - Room size (affects feedback)
- `damping` (0-1) - High frequency damping
- `width` (0-1) - Stereo width
- `mix` (0-1) - Dry/wet mix

**Implementation:** True stereo with slightly detuned filter delays for L/R.

## Usage

### Basic API

```javascript
import { FXController } from './fx/fx-controller.js';

const fxController = new FXController();
await fxController.init(audioContext, synthNode);

// Add effect
const instanceId = fxController.addEffect('delay');

// Set parameter
fxController.setParameter(instanceId, 'mix', 0.5);

// Enable/disable
fxController.setEnabled(instanceId, false);

// Remove effect
fxController.removeEffect(instanceId);

// Reorder chain
fxController.reorderChain(['delay_1', 'reverb_1', 'phaser_1']);
```

### UI Integration

```javascript
import { FXControls } from './ui/fx-controls.js';

const fxControls = new FXControls(fxController);
// Automatically populates UI with drag-and-drop interface
```

## Testing

Open [test-fx.html](../test-fx.html) in a browser to run unit tests:

- ✓ Effect initialization
- ✓ Bypass mode (dry signal)
- ✓ Processing (wet signal)
- ✓ Parameter changes
- ✓ Reset functionality
- ✓ Metadata validation
- ✓ True stereo independence
- ✓ Audio playback test (440Hz + effects)

## Adding New Effects

1. Create new effect class extending `FXBase`:

```javascript
// fx/effects/my-effect.js
import { FXBase } from '../fx-base.js';

export class MyEffect extends FXBase {
  constructor(sampleRate, id) {
    super(sampleRate, id);
    this.param1 = 0.5;
  }

  process(inputL, inputR) {
    if (!this.enabled) return [inputL, inputR];
    // Process audio here
    return [outputL, outputR];
  }

  onParameterChange(name, value) {
    if (name === 'param1') this.param1 = value;
  }

  static getMetadata() {
    return {
      id: 'myeffect',
      name: 'My Effect',
      parameters: [
        { name: 'param1', label: 'Param 1', min: 0, max: 1, default: 0.5 },
      ],
    };
  }
}
```

2. Add to `fx-controller.js` in `loadMetadata()`:

```javascript
const { MyEffect } = await import('./effects/my-effect.js');
this.effectsMetadata.set('myeffect', MyEffect.getMetadata());
```

3. Inline the class in `worklet/fx-chain-processor.js`:

```javascript
// Copy the class implementation (without imports)
class MyEffect extends FXBase { ... }

// Register in constructor
this.effectsRegistry.set('myeffect', MyEffect);
```

## Performance Notes

- All effects are processed **frame-by-frame** for minimal latency
- True stereo = independent L/R processing (no channel summing)
- AudioWorklet runs on separate thread from UI
- No buffer delays introduced by FX chain
- Enable/disable is glitch-free (immediate bypass)

## File Structure

```
fx/
├── fx-base.js              # Abstract base class
├── fx-controller.js        # Main thread API
├── effects/
│   ├── hardclip.js
│   ├── phaser.js
│   ├── bitcrusher.js
│   ├── chorus.js
│   ├── delay.js
│   └── reverb.js
└── README.md               # This file

worklet/
└── fx-chain-processor.js   # AudioWorklet (inlined effects)

ui/
└── fx-controls.js          # Drag-and-drop UI
```
