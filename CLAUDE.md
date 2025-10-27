# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

8-voice polyphonic PWM (Pulse Width Modulation) synthesizer with 11 built-in effects running in the browser using Web Audio API's AudioWorklet technology. This is a pure JavaScript implementation using ES modules that can be run directly in development or built into a single-file monolithic distribution for production.

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
   - [main.js](main.js) - Entry point, initializes Synth and MIDIInput, wires UI
   - [ui/controls.js](ui/controls.js) - Main UI orchestrator with voice count display
   - [ui/parameter-controls.js](ui/parameter-controls.js) - Maps HTML sliders to synth parameters
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
   - **Modular architecture** with 6 classes (refactored 2025-10-27):
     - `IIRFilter` - 24dB/18dB biquad filter with coefficient caching
     - `Envelope` - ADSR envelope generator with exponential curves
     - `Oscillator` - PWM + PolyBLEP anti-aliasing + multi-waveform generator
     - `Voice` - Voice state container (oscillators, envelopes, filters)
     - `VoiceAllocator` - Polyphonic voice management with intelligent stealing
     - `MessageQueue` - Thread-safe message queue for voice events
   - Message queue for thread-safe voice allocation (prevents race conditions)
   - PWM oscillator with PolyBLEP anti-aliasing for bandlimited synthesis
   - Per-voice 24dB IIR resonant lowpass filter (cascaded biquads)
   - ADSR envelope generator per voice
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

### Aftertouch Modulation

4-slot modulation matrix where channel aftertouch can modulate:

1. PWM Depth
2. Pan Depth
3. Oscillator Volume
4. Master Volume

Each slot has: destination (0-4) and amount (-1 to +1).

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

## Key Files

### Core Files

- [worklet/synth-processor.js](worklet/synth-processor.js) - Main DSP implementation (production version, ~51KB, 1850 lines, refactored 2025-10-27)
- [worklet/fx-chain-processor.js](worklet/fx-chain-processor.js) - Effects chain AudioWorklet processor
- [audio/synth.js](audio/synth.js) - AudioWorklet controller and API
- [midi/midi-input.js](midi/midi-input.js) - Web MIDI API wrapper
- [index.html](index.html) - Single-page application with parameter controls

### Effects System

- [fx/fx-controller.js](fx/fx-controller.js) - Main effects controller
- [fx/parameter-manager.js](fx/parameter-manager.js) - Effect parameter management
- [fx/effect-registry.js](fx/effect-registry.js) - Effect registration system
- [fx/fx-base.js](fx/fx-base.js) - Base class for effects
- [fx/effects/](fx/effects/) - Individual effect implementations (11 effects)

### Utilities and Build

- [utils/music.js](utils/music.js) - Music theory utilities (MIDI to frequency, note names)
- [utils/logger.js](utils/logger.js) - Logging utility with level control
- [build.js](build.js) - Production build script with worklet validation
- [scripts/create-effect.js](scripts/create-effect.js) - Effect scaffolding script

### Testing

- [tests/](tests/) - Test suite (81 tests, 100% pass rate)
  - [tests/dsp-math.test.js](tests/dsp-math.test.js) - DSP mathematical functions
  - [tests/logger.test.js](tests/logger.test.js) - Logger tests
  - [tests/music.test.js](tests/music.test.js) - Music utilities tests
  - [tests/parameter-manager.test.js](tests/parameter-manager.test.js) - Parameter manager tests
  - [tests/TEST_COVERAGE.md](tests/TEST_COVERAGE.md) - Coverage report

### Documentation

- [Problems_Critical.md](Problems_Critical.md) - 16 critical issues (all fixed, 100% complete)
- [Important_TODO.md](Important_TODO.md) - Project analysis and improvement roadmap

### Archived Implementations (Not Used in Production)

**All archived versions moved to [worklet/archive/](worklet/archive/) (2025-10-27):**

- [worklet/archive/synth-processor-poly.js](worklet/archive/synth-processor-poly.js) - Earlier polyphonic version (450 lines)
- [worklet/archive/synth-processor-refactored.js](worklet/archive/synth-processor-refactored.js) - Experimental refactored version (1350 lines)
- [worklet/archive/synth-processor.js.bak](worklet/archive/synth-processor.js.bak) - Backup copy (1440 lines)

See [worklet/archive/README.md](worklet/archive/README.md) for details on archived versions.

## Important Constraints

1. **Development vs Production**: Development uses ES modules loaded directly; production uses a monolithic build
2. **Secure context required**: AudioWorklet and Web MIDI only work over HTTPS or localhost
3. **Single file worklets**: Both [worklet/synth-processor.js](worklet/synth-processor.js) and [worklet/fx-chain-processor.js](worklet/fx-chain-processor.js) must be self-contained (no imports) due to AudioWorklet scope limitations. Build script validates this.
4. **Voice limit**: Configurable via `MAX_VOICES` constant at the top of [worklet/synth-processor.js](worklet/synth-processor.js) (default: 8 voices for performance and CPU headroom)
5. **Sample rate**: Uses browser's default sample rate (typically 44.1kHz or 48kHz). All timing calculations are sample-rate independent.
6. **Build process**: Automatic module collection - no need to manually maintain module lists when adding new files
7. **Thread safety**: Voice allocation uses message queue pattern to prevent race conditions between main thread and audio thread
8. **Rate limiting**: Parameter updates throttled to 1ms per parameter (max 1000 Hz) to prevent DoS
9. **Resource cleanup**: All event listeners and intervals cleaned up on page unload to prevent memory leaks

## Parameter Ranges

All parameters are defined in [audio/synth.js](audio/synth.js) `parameterData` and must match the `parameterDescriptors` in [worklet/synth-processor.js](worklet/synth-processor.js).

Key parameters:

- Oscillator tuning: ±48 semitones coarse, ±50 cents fine
- Pulse width: 1-99% (clamped to 5-95% internally)
- PWM LFO: 0.1-10 Hz rate, 0-100% depth
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

## Project Status

### Critical Fixes Completed (100%)

All 16 critical issues documented in [Problems_Critical.md](Problems_Critical.md) have been fixed:

**P0 - Critical (4/4 fixed)**:

1. ✅ Fixed undefined `currentTime` variable crashes (now uses `this.currentFrame`)
2. ✅ Fixed memory leak from interval accumulation (proper cleanup on unload)
3. ✅ Fixed race condition in voice allocation (message queue pattern)
4. ✅ Fixed silent parameter failures (error logging added)

**P1 - High Priority (5/5 fixed)**:

5. ✅ MIDI note range validation (0-127 check)
6. ✅ Velocity clamping (0-1 range)
7. ✅ Keyboard event listener cleanup (destroy function)
8. ✅ MIDI panic buttons (CC 120, CC 123)
9. ✅ Audio context state validation

**P2 - Medium Priority (7/7 fixed)**:

10. ✅ Sustain pedal note cleanup
11. ✅ Voice count meter in UI (real-time, color-coded)
12. ✅ Multiple init() call protection
13. ✅ Watchdog timer sample rate fix (10 seconds)
14. ✅ DSP core tests (81 tests, 100% pass rate)
15. ✅ Build validation for worklet imports
16. ✅ Rate limiting on parameter changes (1ms throttle)

**Result**: Production-ready, stable, thread-safe, fully tested, and DoS-protected.

### Known Limitations

- AudioWorklet processors cannot be unit tested in Node.js (require browser environment)
- Voice stealing may cause brief audio glitches under extreme polyphony
- Effects chain processing adds ~2-5ms latency depending on enabled effects
- Build process requires manual execution (`npm run build`)

### Future Enhancements (Optional)

See [Important_TODO.md](Important_TODO.md) for detailed improvement roadmap focusing on:

- Documentation consolidation
- Extended MIDI CC mapping
- Additional effect types
- Enhanced UI modularity
