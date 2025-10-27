# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

8-voice polyphonic PWM (Pulse Width Modulation) synthesizer running in the browser using Web Audio API's AudioWorklet technology. This is a pure JavaScript implementation using ES modules that can be run directly in development or built into a single-file monolithic distribution for production.

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
  - Results in a fully self-contained HTML file (~260KB)

### Running

**Development**: Open [index.html](index.html) directly in a browser from a local web server.

**Production**: Open `dist/index.html` after running `npm run build`.

Both require serving from:

- `https://` (secure context), OR
- `localhost` (local development)

This is required for Web Audio API's AudioWorklet and Web MIDI API access.

## Architecture

### Core Audio Pipeline

The synth follows a three-layer architecture:

1. **UI Layer** ([main.js](main.js) + [ui/](ui/))
   - [main.js](main.js) - Entry point, initializes Synth and MIDIInput, wires UI
   - [ui/controls.js](ui/controls.js) - Main UI orchestrator
   - [ui/parameter-controls.js](ui/parameter-controls.js) - Maps HTML sliders to synth parameters
   - [ui/keyboard.js](ui/keyboard.js) - On-screen keyboard implementation
   - [ui/midi-controls.js](ui/midi-controls.js) - MIDI device selection UI

2. **Audio Controller** ([audio/synth.js](audio/synth.js))
   - Creates AudioContext with 'interactive' latency hint
   - Loads and instantiates AudioWorklet processor
   - Exposes high-level API: `init()`, `start()`, `noteOn()`, `noteOff()`, `setParam()`
   - All synth parameters are exposed as AudioParam objects for a-rate/k-rate automation
   - Messages voice events (noteOn/noteOff/aftertouch) to worklet via MessagePort

3. **DSP Core** ([worklet/synth-processor.js](worklet/synth-processor.js))
   - Runs in AudioWorklet thread (separate from main thread)
   - Implements polyphonic voice management with voice stealing
   - PWM oscillator with PolyBLEP anti-aliasing for bandlimited synthesis
   - Per-voice 24dB IIR resonant lowpass filter (cascaded biquads)
   - ADSR envelope generator per voice
   - Stereo panning with LFO and equal-power law
   - Sub-oscillator (one octave down)

### Voice Management

Polyphonic voice allocation with intelligent voice stealing (default: 8 voices):

- **Free voice**: First priority - uses any idle voice
- **Voice stealing**: Steals voices in release stage, then any active voice
- **Retrigger**: If same MIDI note is already playing, retrigger that voice
- **Note tracking**: Map of MIDI note → voice index for O(1) note-off lookup
- **Configuration**: Voice limit is configurable via `MAX_VOICES` constant at the top of [worklet/synth-processor.js](worklet/synth-processor.js)

### MIDI Integration

[midi/midi-input.js](midi/midi-input.js) handles Web MIDI API:

- Auto-detection and connection of MIDI devices
- Device enable/disable toggles (multiple devices supported)
- Pitch bend with configurable range (±0-24 semitones)
- Velocity curve: logarithmic (-100), linear (0), or exponential (+100)
- Channel aftertouch (pressure) for modulation matrix

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

## Key Files

- [worklet/synth-processor.js](worklet/synth-processor.js) - Main DSP implementation with polyphonic voices, filters, envelopes
- [audio/synth.js](audio/synth.js) - AudioWorklet controller and API
- [midi/midi-input.js](midi/midi-input.js) - Web MIDI API wrapper
- [index.html](index.html) - Single-page application with parameter controls
- [utils/music.js](utils/music.js) - Music theory utilities (MIDI to frequency conversion, note names)
- [build.js](build.js) - Production build script that creates a single-file distribution
- [tests/](tests/) - Test suite for utility functions

## Important Constraints

1. **Development vs Production**: Development uses ES modules loaded directly; production uses a monolithic build
2. **Secure context required**: AudioWorklet and Web MIDI only work over HTTPS or localhost
3. **Single file worklet**: [worklet/synth-processor.js](worklet/synth-processor.js) must be self-contained (no imports) due to AudioWorklet scope limitations
4. **Voice limit**: Configurable via `MAX_VOICES` constant at the top of [worklet/synth-processor.js](worklet/synth-processor.js) (default: 8 voices for performance and CPU headroom)
5. **Sample rate**: Uses browser's default sample rate (typically 44.1kHz or 48kHz). All timing calculations are sample-rate independent.
6. **Build process**: Automatic module collection - no need to manually maintain module lists when adding new files

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

No formal test suite. Manual testing workflow:

1. Open [index.html](index.html) in browser
2. Click "Start Audio" button
3. Test with on-screen keyboard and/or MIDI controller
4. Verify audio output and parameter changes
5. Check browser console for errors or warnings

## Code Style

Prettier enforces formatting (see [.prettierrc.json](.prettierrc.json)):

- Single quotes
- 2-space indentation
- 80 character line width
- Semicolons required
- ES5 trailing commas
