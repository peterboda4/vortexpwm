# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

8-voice polyphonic PWM (Pulse Width Modulation) synthesizer with **12-slot Modulation Matrix**, 11 built-in effects, and BPM-based tempo system running in the browser using Web Audio API's AudioWorklet technology. This is a pure JavaScript implementation using ES modules that can be run directly in development or built into a single-file monolithic distribution for production.

**Version 2.0** introduces a comprehensive modulation matrix with 9 sources and 25 destinations, enabling complex sound design with LFO self-modulation, cross-modulation, and extensive routing capabilities.

## Development Commands

### Testing

- `npm test` - Run test suite using Node.js built-in test runner
- `npm run test:watch` - Run tests in watch mode

### Formatting

- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without making changes

### Building

- `npm run build` - Create single-file production build in `dist/index.html`
  - Automatically collects all `.js` modules from the codebase (no manual maintenance)
  - Inlines CSS and embeds all modules as base64 data URLs
  - Creates Blob URLs for AudioWorklet processors
  - Validates worklet processors are self-contained (no imports)
  - Results in a fully self-contained HTML file (~260KB)

### Effects

- `npm run create-effect` - Scaffold a new effect from template

### Running

**Development**: Open [index.html](index.html) directly in a browser from a local web server.

**Production**: Open `dist/index.html` after running `npm run build`.

Both require serving from:

- `https://` (secure context), OR
- `localhost` (local development)

This is required for Web Audio API's AudioWorklet and Web MIDI API access.

## Architecture

### Core Audio Pipeline

The synth follows a four-layer architecture:

1. **UI Layer** ([main.js](main.js) + [ui/](ui/))
   - [main.js](main.js) - Entry point, initializes Synth, MIDIInput, TempoManager, wires UI
   - [ui/controls.js](ui/controls.js) - Main UI orchestrator with voice count display
   - [ui/parameter-controls.js](ui/parameter-controls.js) - Maps HTML sliders to synth parameters (including BPM)
   - [ui/keyboard.js](ui/keyboard.js) - On-screen keyboard implementation with cleanup
   - [ui/midi-controls.js](ui/midi-controls.js) - MIDI device selection UI

2. **Audio Controller** ([audio/synth.js](audio/synth.js))
   - Creates AudioContext with 'interactive' latency hint
   - Loads and instantiates AudioWorklet processor
   - Exposes high-level API: `init()`, `start()`, `noteOn()`, `noteOff()`, `setParam()`, `allNotesOff()`
   - All synth parameters are exposed as AudioParam objects for a-rate/k-rate automation
   - Messages voice events (noteOn/noteOff/aftertouch) to worklet via MessagePort
   - Rate limiting on parameter updates (1ms throttle per parameter)
   - Protection against multiple initialization

3. **DSP Core** ([worklet/synth-processor.js](worklet/synth-processor.js))
   - Runs in AudioWorklet thread (separate from main thread)
   - **Modular architecture** with 7 classes (updated 2025-10-28):
     - `IIRFilter` - 24dB/18dB biquad filter with coefficient caching
     - `Envelope` - ADSR envelope generator with exponential curves
     - `LFO` - Low frequency oscillator with 6 waveforms and tempo sync
     - `Oscillator` - PWM + PolyBLEP anti-aliasing + multi-waveform generator
     - `Voice` - Voice state container (oscillators, envelopes, filters, LFOs)
     - `VoiceAllocator` - Polyphonic voice management with intelligent stealing
     - `MessageQueue` - Thread-safe message queue for voice events
   - Message queue for thread-safe voice allocation (prevents race conditions)
   - PWM oscillator with PolyBLEP anti-aliasing for bandlimited synthesis
   - Per-voice 24dB IIR resonant lowpass filter (cascaded biquads)
   - ADSR envelope generator per voice
   - Per-voice LFO1 with 6 waveforms and tempo sync (test: routed to Osc1 pitch)
   - Stereo panning with LFO and equal-power law
   - Sub-oscillator (one octave down)
   - Real-time voice count reporting to UI (every 100ms)
   - Watchdog timer for stuck note cleanup (10 seconds)
   - Full JSDoc documentation for all classes

4. **Effects Chain** ([fx/](fx/) + [worklet/fx-chain-processor.js](worklet/fx-chain-processor.js))
   - [fx/fx-controller.js](fx/fx-controller.js) - Main effects controller
   - [fx/parameter-manager.js](fx/parameter-manager.js) - Effect parameter management with presets
   - [fx/effect-registry.js](fx/effect-registry.js) - Effect registration system
   - [fx/effects/](fx/effects/) - 11 built-in effects (Delay, Reverb, Chorus, Flanger, Phaser, Tremolo, AutoWah, BitCrusher, HardClip, FreqShifter, PitchShifter)
   - [worklet/fx-chain-processor.js](worklet/fx-chain-processor.js) - AudioWorklet processor for effects chain

### Voice Management

Polyphonic voice allocation with intelligent voice stealing (default: 8 voices):

- **Free voice**: First priority - uses any idle voice
- **Voice stealing**: Steals voices in release stage, then any active voice
- **Retrigger**: If same MIDI note is already playing, retrigger that voice
- **Note tracking**: Map of MIDI note → voice index for O(1) note-off lookup
- **Thread safety**: Message queue pattern ensures atomic voice state changes
- **Configuration**: Voice limit is configurable via `MAX_VOICES` constant at the top of [worklet/synth-processor.js](worklet/synth-processor.js)
- **Monitoring**: Real-time voice count display in UI with color-coded status (green/orange/red)

### MIDI Integration

[midi/midi-input.js](midi/midi-input.js) handles Web MIDI API:

- Auto-detection and connection of MIDI devices
- Device enable/disable toggles (multiple devices supported)
- Pitch bend with configurable range (±0-24 semitones)
- Velocity curve: logarithmic (-100), linear (0), or exponential (+100)
- Channel aftertouch (pressure) for modulation matrix
- Sustain pedal support (CC 64)
- MIDI panic buttons (CC 120: All Sound Off, CC 123: All Notes Off)
- Input validation: MIDI notes (0-127) and velocity clamping (0-1)

### Signal Processing

**PWM Oscillator**: Generates pulse wave with variable duty cycle, modulated by LFO. Uses PolyBLEP (Polynomial Bandlimited Step) to reduce aliasing at discontinuities.

**IIR Filter**: Two cascaded biquad lowpass sections for 24dB/octave rolloff. Coefficient recalculation is throttled to avoid unnecessary recomputation. Each voice has its own filter state (polyphonic filtering).

**ADSR Envelope**: Exponential curves using `1 - exp(-1/(time*sampleRate))` coefficient for natural-sounding attack/decay/release.

**Auto-Pan**: Stereo positioning with LFO modulation. Uses equal-power panning law to maintain consistent perceived loudness.

### LFO1 (Low Frequency Oscillator)

Per-voice modulation source with flexible control (added 2025-10-28):

**Waveforms**: Sine, Triangle, Square, Saw Up, Saw Down, Sample & Hold (Random)

**Parameters**:

- **Rate**: 0.01-50 Hz (free-running mode)
- **Depth**: 0-100% output level
- **Phase**: 0-360° initial offset (for key retrigger mode)
- **Tempo Sync**: On/Off toggle for BPM-based timing
- **Sync Division**: 13 divisions (1/1, 1/2, 1/4, 1/8, 1/16, 1/32, with dotted and triplet variants)
- **Retrigger**: Free-running or reset phase on note-on
- **Fade-in**: 0-5s exponential fade-in envelope

**Operation**:

- **Per-voice**: Each voice has its own LFO instance (polyphonic)
- **Tempo sync**: When enabled, rate is locked to BPM with musical divisions
- **Key retrigger**: When enabled, LFO phase resets on each note-on
- **Fade-in**: Optional exponential envelope applied to LFO depth

**Current State**: LFO1 and LFO2 are fully implemented, running per-voice, and available as modulation sources in the Modulation Matrix.

### Modulation Matrix (v2.0)

Comprehensive 12-slot modulation routing system allowing any source to modulate any destination with bipolar control.

**Architecture**:

- **12 Slots**: Each slot is independent, allowing complex layered modulation
- **9 Sources**: Note Number, Velocity, Pitch Bend, Mod Wheel, Aftertouch, LFO1, LFO2, Amp Env, Filter Env
- **25 Destinations**: Full control over oscillators, filters, LFOs, pan, and master volume
- **Bipolar Amount**: -100% to +100% per slot with double-click reset to 0%

**Sources** (normalized 0-1 or -1 to +1):

1. **None** (0) - Disabled slot
2. **Note Number** (1) - MIDI note 0-127, normalized to 0-1
3. **Velocity** (2) - Note velocity 0-1
4. **Pitch Bend** (3) - ±12 semitones, normalized to -1 to +1
5. **Mod Wheel** (4) - MIDI CC#1, 0-1
6. **Aftertouch** (5) - Channel pressure, 0-1
7. **LFO1** (6) - LFO1 output (from previous frame)
8. **LFO2** (7) - LFO2 output (from previous frame)
9. **Amp Env** (8) - Amplitude envelope level, 0-1
10. **Filter Env** (9) - Filter envelope level, 0-1

**Destinations**:

1. **None** (0) - Disabled slot
2. **OSC1 Pitch** (1) - ±12 semitones at 100% amount
3. **OSC1 PWM** (2) - Pulse width offset
4. **OSC1 PWM Depth** (3) - PWM LFO depth
5. **OSC1 PWM Rate** (4) - PWM LFO rate
6. **OSC1 Volume** (5) - Oscillator 1 amplitude
7. **Sub1 Volume** (6) - Sub-oscillator 1 amplitude
8. **OSC1 FM** (7) - FM depth from OSC2
9. **OSC2 Pitch** (8) - Oscillator 2 pitch offset
10. **OSC2 Volume** (9) - Oscillator 2 amplitude
11. **Sub2 Volume** (10) - Sub-oscillator 2 amplitude
12. **Ring Volume** (11) - Ring modulator mix
13. **Noise Volume** (12) - Noise generator mix
14. **F1 Cutoff** (13) - Lowpass filter cutoff (±5000 Hz at 100%)
15. **F1 Resonance** (14) - Lowpass filter resonance
16. **F2 Cutoff** (15) - Highpass filter cutoff (±5000 Hz at 100%)
17. **F2 Resonance** (16) - Highpass filter resonance
18. **Filter Saturation** (17) - Filter drive (not yet implemented)
19. **LFO1 Rate** (18) - LFO1 frequency (±25 Hz at 100%)
20. **LFO1 Amount** (19) - LFO1 depth
21. **LFO2 Rate** (20) - LFO2 frequency (±25 Hz at 100%)
22. **LFO2 Amount** (21) - LFO2 depth
23. **Pan Position** (22) - Stereo pan position
24. **Pan Depth** (23) - Auto-pan LFO depth
25. **Pan Rate** (24) - Auto-pan LFO rate
26. **Master Volume** (25) - Final output level

**Technical Implementation**:

- **Dual-pass processing** ([worklet/synth-processor.js](worklet/synth-processor.js)):
  1. **First pass** (lines 1447-1518): Process LFO destinations (18-21) before calculating LFO outputs
  2. **LFO calculation** (lines 1520-1603): Calculate LFO1 and LFO2 with applied modulation
  3. **Second pass** (lines 1605-1856): Process remaining destinations with calculated LFO outputs

- **One-sample delay feedback loop**: LFO sources use previous frame's output (`voice.lfo1Output`, `voice.lfo2Output`) to enable self-modulation and cross-modulation without circular dependencies

- **Per-voice processing**: All modulation is calculated per-voice for true polyphonic behavior

- **Dynamic UI generation** ([ui/matrix-ui.js](ui/matrix-ui.js)): 12 slots generated dynamically from `MATRIX_SOURCES` and `MATRIX_DESTINATIONS` arrays

- **Parameter binding** ([ui/parameter-controls.js](ui/parameter-controls.js)): 36 parameters (12 slots × 3 params: source, destination, amount)

**Example Routings**:

- **Velocity → OSC1 Volume**: Velocity-sensitive amplitude (standard)
- **LFO1 → OSC1 Pitch**: Classic vibrato effect
- **LFO2 → F1 Cutoff**: Sweeping filter effect
- **LFO1 → LFO1 Rate**: FM-style self-modulation (creates complex waveforms)
- **LFO2 → LFO1 Depth**: Cross-modulation between LFOs
- **Amp Env → Pan Position**: Auto-pan following amplitude envelope
- **Note Number → LFO1 Rate**: Higher notes = faster LFO
- **Mod Wheel → F1 Cutoff**: Manual filter control via MIDI

**Files**:

- [utils/parameter-registry.js](utils/parameter-registry.js) - Source/destination definitions (lines 43-64)
- [ui/matrix-ui.js](ui/matrix-ui.js) - Dynamic UI generation
- [worklet/synth-processor.js](worklet/synth-processor.js) - Dual-pass matrix processing (lines 1436-1856)

### Effects System

11 built-in effects processed in AudioWorklet thread:

1. **Delay** - Stereo delay with feedback and sync
2. **Reverb** - Algorithmic reverb with damping
3. **Chorus** - Multi-voice detuned chorus
4. **Flanger** - Swept comb filter with feedback
5. **Phaser** - Allpass filter phaser
6. **Tremolo** - Amplitude modulation
7. **AutoWah** - Envelope-following filter
8. **BitCrusher** - Sample rate and bit depth reduction
9. **HardClip** - Waveshaping distortion
10. **FreqShifter** - Ring modulator frequency shifter
11. **PitchShifter** - Delay-based pitch shifting

**Effect Management**:

- Parameter manager with validation and change listeners
- Effect presets and normalization
- Dynamic effect registration via [fx/effect-registry.js](fx/effect-registry.js)
- Scaffolding tool: `npm run create-effect`

### Tempo System

The synthesizer includes a flexible BPM-based tempo system for tempo-synced modulation and effects.

**BPM Management**:

- **Range**: 20-300 BPM (default: 120)
- **TempoManager** ([utils/tempo-manager.js](utils/tempo-manager.js)): Centralized tempo state management
- **UI**: BPM slider in Tempo section (top of controls)
- **Integration**: BPM value stored as synth parameter, accessible in AudioWorklet
- **Future**: MIDI Clock sync support (architecture ready, not yet implemented)

**Tempo Conversions** ([utils/music.js](utils/music.js)):

- `bpmToHz(bpm, division)` - Convert BPM to frequency (Hz) for LFO/effect sync
- **Divisions**: Standard note divisions with dotted and triplet variants
  - Basic: 1/1, 1/2, 1/4, 1/8, 1/16, 1/32
  - Dotted: 1/2D, 1/4D, 1/8D, 1/16D (1.5× duration)
  - Triplet: 1/2T, 1/4T, 1/8T, 1/16T (0.666× duration)
- **Example**: `bpmToHz(120, '1/4')` returns 2 Hz (2 beats per second)
- **Usage**: Intended for future LFO tempo sync and delay time sync features

**Future Use Cases**:

- LFO tempo sync (e.g., 1/4 note vibrato locked to BPM)
- Delay time sync (e.g., 1/8 note delay timing)
- Modulation matrix tempo-based sources
- Arpeggiator clock

## Key Files

### Core Files

- [worklet/synth-processor.js](worklet/synth-processor.js) - Main DSP implementation (production version, ~51KB, 1850 lines, refactored 2025-10-27)
- [worklet/fx-chain-processor.js](worklet/fx-chain-processor.js) - Effects chain AudioWorklet processor
- [audio/synth.js](audio/synth.js) - AudioWorklet controller and API
- [midi/midi-input.js](midi/midi-input.js) - Web MIDI API wrapper
- [index.html](index.html) - Single-page application with parameter controls
- [utils/parameter-registry.js](utils/parameter-registry.js) - **Centralized parameter definitions** (single source of truth for all synth parameters, inlined into worklets during build)

### Effects System

- [fx/fx-controller.js](fx/fx-controller.js) - Main effects controller
- [fx/parameter-manager.js](fx/parameter-manager.js) - Effect parameter management
- [fx/effect-registry.js](fx/effect-registry.js) - Effect registration system
- [fx/fx-base.js](fx/fx-base.js) - Base class for effects
- [fx/effects/](fx/effects/) - Individual effect implementations (11 effects)

### Utilities and Build

- [utils/music.js](utils/music.js) - Music theory utilities (MIDI to frequency, note names, BPM conversions)
- [utils/tempo-manager.js](utils/tempo-manager.js) - Centralized BPM/tempo state management
- [utils/logger.js](utils/logger.js) - Logging utility with level control
- [utils/parameter-registry.js](utils/parameter-registry.js) - Centralized parameter definitions (see below)
- [build.js](build.js) - Production build script with worklet validation and parameter registry inlining
- [scripts/create-effect.js](scripts/create-effect.js) - Effect scaffolding script

### Testing

- [tests/](tests/) - Test suite (~175 tests, 100% pass rate)
  - [tests/dsp-math.test.js](tests/dsp-math.test.js) - DSP mathematical functions
  - [tests/logger.test.js](tests/logger.test.js) - Logger tests
  - [tests/music.test.js](tests/music.test.js) - Music utilities and BPM conversion tests (94 tests)
  - [tests/tempo-manager.test.js](tests/tempo-manager.test.js) - TempoManager unit tests (29 tests)
  - [tests/parameter-manager.test.js](tests/parameter-manager.test.js) - Parameter manager tests
  - [tests/TEST_COVERAGE.md](tests/TEST_COVERAGE.md) - Coverage report

### Archived Implementations (Not Used in Production)

**All archived versions moved to [worklet/archive/](worklet/archive/) (2025-10-27):**

- [worklet/archive/synth-processor-poly.js](worklet/archive/synth-processor-poly.js) - Earlier polyphonic version (450 lines)
- [worklet/archive/synth-processor-refactored.js](worklet/archive/synth-processor-refactored.js) - Experimental refactored version (1350 lines)
- [worklet/archive/synth-processor.js.bak](worklet/archive/synth-processor.js.bak) - Backup copy (1440 lines)

See [worklet/archive/README.md](worklet/archive/README.md) for details on archived versions.

## Important Constraints

1. **Development vs Production**: Development uses ES modules loaded directly; production uses a monolithic build
2. **Secure context required**: AudioWorklet and Web MIDI only work over HTTPS or localhost
3. **Single file worklets**: Both [worklet/synth-processor.js](worklet/synth-processor.js) and [worklet/fx-chain-processor.js](worklet/fx-chain-processor.js) must be self-contained (no imports) due to AudioWorklet scope limitations. Build script validates this and inlines parameter registry.
4. **Voice limit**: Configurable via `MAX_VOICES` constant at the top of [worklet/synth-processor.js](worklet/synth-processor.js) (default: 8 voices for performance and CPU headroom)
5. **Sample rate**: Uses browser's default sample rate (typically 44.1kHz or 48kHz). All timing calculations are sample-rate independent.
6. **Build process**: Automatic module collection - no need to manually maintain module lists when adding new files. Parameter registry is automatically inlined into worklets.
7. **Thread safety**: Voice allocation uses message queue pattern to prevent race conditions between main thread and audio thread
8. **Rate limiting**: Parameter updates throttled to 1ms per parameter (max 1000 Hz) to prevent DoS
9. **Resource cleanup**: All event listeners and intervals cleaned up on page unload to prevent memory leaks
10. **Parameter definitions**: All parameter definitions live in [utils/parameter-registry.js](utils/parameter-registry.js) - single source of truth for ranges, defaults, display formatting

## Parameter System

### Centralized Parameter Registry

**IMPORTANT**: All synth parameters are now defined in a single source of truth: [utils/parameter-registry.js](utils/parameter-registry.js)

This registry is used by:

- [audio/synth.js](audio/synth.js) - Uses `getParameterData()` to initialize AudioWorkletNode
- [worklet/synth-processor.js](worklet/synth-processor.js) - Uses `getParameterDescriptors()` for AudioWorkletProcessor (inlined during build)
- [ui/parameter-controls.js](ui/parameter-controls.js) - Uses `getParameter()` to get display formatting and metadata

**Adding a new parameter**:

1. Add parameter definition to `SYNTH_PARAMETERS` array in [utils/parameter-registry.js](utils/parameter-registry.js)
2. Add corresponding HTML input element to [index.html](index.html)
3. Bind parameter in [ui/parameter-controls.js](ui/parameter-controls.js) using `bind(elementId, parameterName)`
4. Use parameter in [worklet/synth-processor.js](worklet/synth-processor.js) via `parameters` object in `process()` method
5. No need to manually update multiple files - the registry is the single source of truth

### Parameter Ranges

Key parameters:

- Oscillator tuning: ±48 semitones coarse, ±50 cents fine
- Pulse width: 1-99% (clamped to 5-95% internally)
- PWM LFO: 0.1-10 Hz rate, 0-100% depth
- LFO1: 0.01-50 Hz rate, 0-100% depth, 0-360° phase, 0-5s fade-in
- Filter: 20Hz-20kHz cutoff, 0-95% resonance
- Envelope: 0-6s attack/decay/release (both amp and filter envelopes)
- Pitch bend: ±0-24 semitones configurable range

## Testing

### Automated Testing

The project has a comprehensive test suite with 81 tests:

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode

**Test Coverage**:

- 81 tests across 25 test suites
- 100% pass rate
- ~94% coverage for testable code

**Test Files**:

- [tests/dsp-math.test.js](tests/dsp-math.test.js) - 24 tests for DSP functions (MIDI to frequency, envelopes, panning, PolyBLEP, pitch bend, velocity curves)
- [tests/logger.test.js](tests/logger.test.js) - 20 tests for logger functionality
- [tests/music.test.js](tests/music.test.js) - 15 tests for music utilities
- [tests/parameter-manager.test.js](tests/parameter-manager.test.js) - 22 tests for effect parameter management

See [tests/TEST_COVERAGE.md](tests/TEST_COVERAGE.md) for detailed coverage report.

### Manual Testing

For features requiring browser environment:

1. Open [index.html](index.html) in browser from local web server
2. Click "Start Audio" button
3. Test with on-screen keyboard and/or MIDI controller
4. Verify audio output and parameter changes
5. Monitor voice count display (should show active voices)
6. Check browser console for errors or warnings
7. Test effects chain with various effect combinations

## Code Style

Prettier enforces formatting (see [.prettierrc.json](.prettierrc.json)):

- Single quotes
- 2-space indentation
- 80 character line width
- Semicolons required
- ES5 trailing commas
