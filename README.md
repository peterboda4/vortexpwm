# PWM Synthesizer

8-voice polyphonic PWM (Pulse Width Modulation) synthesizer running in the browser using Web Audio API's AudioWorklet technology. A pure JavaScript implementation with ES modules, featuring a comprehensive effects chain and MIDI support.

**Status**: Production ready - 100% of critical bugs fixed, 81 automated tests with 100% pass rate.

## Quick Start

```bash
# Install dependencies
npm install

# Start local server
npx http-server . -p 8080

# Open http://localhost:8080 in your browser
# Click "Start Audio" and start playing!
```

For production deployment, build a single-file distribution:

```bash
npm run build
# Upload dist/index.html to your HTTPS server
```

## Features

### Oscillator

- **Coarse/Fine Tuning**: ±48 semitones coarse, ±50 cents fine tuning
- **Pulse Width**: Manual PW control (1-99%)
- **PWM**: LFO modulation of pulse width with depth and rate controls (0.1-10 Hz)
- **Sub Oscillator**: One octave down square wave
- **Anti-aliasing**: PolyBLEP (Polynomial Bandlimited Step) for bandlimited synthesis

### Filter

- **24dB IIR Filter**: Two cascaded biquad lowpass sections for 24dB/octave rolloff
- **Cutoff**: 20Hz - 20kHz frequency range
- **Resonance**: 0-95% Q control
- **Polyphonic**: Independent filter per voice with envelope modulation
- **Filter Envelope**: Dedicated ADSR envelope for filter cutoff modulation

### Envelope (ADSR)

- **Attack/Decay/Release**: 0-6 second timing with exponential curves
- **Sustain**: 0-100% level
- **Velocity**: Velocity sensitivity control
- **Dual Envelopes**: Separate amp and filter envelopes per voice

### Audio Effects (11 Effects)

- **Hard Clip**: Analog-style distortion
- **Phaser**: Multi-stage phaser with feedback
- **Bit Crusher**: Sample rate and bit depth reduction
- **Chorus**: Rich stereo chorus effect
- **Delay**: Stereo delay with feedback
- **Reverb**: Algorithmic reverb with adjustable room size
- **Flanger**: Jet-like flanging effect
- **Tremolo**: Amplitude modulation
- **Auto Wah**: Dynamic filter sweep
- **Freq Shifter**: Frequency domain shifting
- **Pitch Shifter**: Real-time pitch shifting

### Control

- **MIDI Input**: External MIDI controller support with device selection
- **On-Screen Keyboard**: 5-octave virtual keyboard with mouse/touch support
- **Aftertouch**: 4-slot modulation matrix for channel aftertouch
- **Pitch Bend**: Configurable range (±0-24 semitones)
- **Velocity Curve**: Logarithmic (-100), linear (0), or exponential (+100)
- **MIDI Panic**: Support for CC 120 (All Sound Off) and CC 123 (All Notes Off)

### Aftertouch Modulation Matrix

4-slot modulation matrix where channel aftertouch can modulate:

- PWM Depth
- Pan Depth
- Oscillator Volume
- Master Volume

Each slot has: destination selector and amount (-1 to +1)

## Usage

### Development Mode

1. Open `index.html` in browser (requires HTTPS or localhost)
2. Click "Start Audio" to enable audio
3. Play notes via MIDI or on-screen keyboard
4. Adjust parameters with sliders

### Production Build

Create a single-file monolithic HTML distribution:

```bash
npm run build
```

This generates `dist/index.html` - a standalone file (~273KB) with:

- Inline CSS
- All JavaScript modules as data URLs (base64)
- AudioWorklet processors as Blob URLs
- 11 audio effects included
- Full MIDI, keyboard, and FX chain support

The generated file can be opened directly in any browser (requires localhost or HTTPS).

#### How the Build Process Works

The build script ([build.js](build.js)) uses a sophisticated **3-pass patching system** to bundle all ES modules:

1. **Pass 1**: Reads all source modules from the codebase
2. **Pass 2**: First round of import patching - converts relative imports to data URLs
3. **Pass 3**: Iterative re-patching (up to 4 iterations) to handle deeply nested imports

This ensures all module dependencies are correctly resolved, even when modules import other modules that haven't been patched yet.

**Key features:**

- Automatic module discovery (no manual maintenance)
- Preserves ES module semantics via data URLs
- Special handling for AudioWorklet processors (Blob URLs)
- Comprehensive validation (missing modules, CSS inlining, etc.)
- FX effects pre-loaded and exposed globally

#### Build Troubleshooting

**Problem: Build fails with "Missing modules in moduleMap"**

- Cause: A module couldn't be resolved during patching
- Solution: Check import paths for typos or circular dependencies
- Debug: Run `BUILD_DEBUG=1 npm run build` to see detailed patching info

**Problem: Build succeeds but synth doesn't work**

- Cause: Not running in secure context (HTTPS/localhost required)
- Solution: Serve via `https://` or `http://localhost`
- Check: Browser console will show "Not in secure context" error

**Problem: Build file size is unexpectedly large**

- Cause: New modules or effects added without optimization
- Expected: ~260-280KB for full synth with 11 effects
- Check: Large console.log statements or debug code left in

**Problem: "Pass3 reached max iterations without convergence"**

- Cause: Circular import dependency between modules
- Solution: Review module structure and break circular dependencies
- Debug: Enable BUILD_DEBUG=1 to trace import chain

#### Debug Mode

Enable detailed build logging:

```bash
BUILD_DEBUG=1 npm run build
```

This shows:

- Every import patch operation
- Module resolution details
- Pass 3 iteration progress
- Module update tracking

### FTP Deployment

**IMPORTANT:** This synthesizer requires a **secure context** (HTTPS or localhost) to function. AudioWorklet API is not available over plain HTTP or file:// protocol.

To deploy on an external FTP server:

1. Build the distribution:

   ```bash
   npm run build
   ```

2. Upload `dist/index.html` to your web server via FTP

3. **Ensure your server serves the file over HTTPS** (required for AudioWorklet)
   - HTTP will NOT work
   - file:// will NOT work
   - Only HTTPS or localhost are supported

4. If you see "Initialization Failed" error:
   - Check browser console for secure context warning
   - Verify the URL starts with `https://` or `http://localhost`
   - Consider using GitHub Pages, Netlify, or Vercel (all provide free HTTPS)

### File Size

The built `dist/index.html` is approximately **273 KB** and contains:

- Complete synthesizer engine
- 11 audio effects (Hard Clip, Phaser, Bit Crusher, Chorus, Delay, Reverb, Flanger, Tremolo, Auto Wah, Freq Shifter, Pitch Shifter)
- All UI components
- No external dependencies

## Architecture

The synthesizer follows a clean three-layer architecture:

### 1. UI Layer ([main.js](main.js) + [ui/](ui/))

- [main.js](main.js) - Entry point, initializes Synth and MIDIInput, wires UI
- [ui/controls.js](ui/controls.js) - Main UI orchestrator with voice count display
- [ui/parameter-controls.js](ui/parameter-controls.js) - Maps HTML sliders to synth parameters
- [ui/keyboard.js](ui/keyboard.js) - On-screen keyboard with proper cleanup
- [ui/midi-controls.js](ui/midi-controls.js) - MIDI device selection UI

### 2. Audio Controller ([audio/synth.js](audio/synth.js))

- Creates AudioContext with 'interactive' latency hint
- Loads and instantiates AudioWorklet processor
- Exposes high-level API: `init()`, `start()`, `noteOn()`, `noteOff()`, `setParam()`
- All synth parameters are exposed as AudioParam objects for automation
- Messages voice events to worklet via MessagePort with message queue pattern
- Rate limiting on parameter updates (1ms throttle = max 1000 Hz per parameter)

### 3. DSP Core ([worklet/synth-processor.js](worklet/synth-processor.js))

- Runs in AudioWorklet thread (separate from main thread)
- Thread-safe message queue for atomic voice state changes
- Polyphonic voice management with intelligent voice stealing
- PWM oscillator with PolyBLEP anti-aliasing
- Per-voice 24dB IIR resonant lowpass filter (cascaded biquads)
- ADSR envelope generator per voice (separate amp and filter envelopes)
- Stereo panning with LFO and equal-power law
- Sub-oscillator (one octave down)
- Voice count reporting to UI every 100ms

### Voice Management

Polyphonic voice allocation with intelligent voice stealing (default: 8 voices):

- **Free voice**: First priority - uses any idle voice
- **Voice stealing**: Steals voices in release stage, then any active voice
- **Retrigger**: If same MIDI note is already playing, retrigger that voice
- **Note tracking**: Map of MIDI note → voice index for O(1) note-off lookup
- **Thread safety**: Message queue pattern prevents race conditions
- **Watchdog timer**: 10-second timeout to free stuck voices

### Effects Chain ([fx/](fx/))

- [fx/fx-controller.js](fx/fx-controller.js) - Manages effects routing and bypass
- [fx/parameter-manager.js](fx/parameter-manager.js) - Parameter validation and presets
- [fx/effect-registry.js](fx/effect-registry.js) - Dynamic effect loading
- [fx/effects/](fx/effects/) - 11 individual effects with consistent API

## Technical Details

- **Voices**: Configurable polyphony (default: 8 voices) with intelligent voice stealing
- **Sample Rate**: Browser default (typically 44.1kHz or 48kHz) with automatic validation
- **Latency**: Interactive latency hint for low-latency performance (~10-20ms round-trip)
- **Anti-aliasing**: PolyBLEP (Polynomial Bandlimited Step) for bandlimited synthesis
- **Browser Support**: Chrome 66+, Edge 79+, Firefox 76+, Safari 14.1+ (automatic compatibility check)
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **State Management**: Automatic AudioContext resume after tab switching/sleep cycles
- **Memory Safety**: Proper cleanup of event listeners and intervals on page unload
- **Thread Safety**: Message queue pattern for atomic voice state changes (max 256 messages)
- **DoS Protection**: 1ms rate limiting per parameter (max 1000 Hz update rate)
- **MIDI Validation**: Full validation of MIDI note range (0-127) and velocity (0-1)

## Quality & Testing

### Test Coverage

- **81 automated tests** with **100% pass rate**
- **~94% code coverage** for testable code
- Test categories:
  - DSP Mathematical Functions (24 tests)
  - Logger (20 tests)
  - Music Utilities (15 tests)
  - Parameter Manager (22 tests)

### Stability

All critical bugs fixed (16/16 issues resolved):

- ✅ Thread-safe voice allocation with message queue
- ✅ Memory leak prevention (intervals and event listeners)
- ✅ Proper cleanup on page unload
- ✅ MIDI validation and panic button support (CC 120, CC 123)
- ✅ Parameter error handling and logging
- ✅ Protection against multiple init() calls
- ✅ Real-time voice count display with color feedback
- ✅ Build validation for AudioWorklet processors

See [Problems_Critical.md](Problems_Critical.md) for detailed fix documentation.

## Configuration

- **Voice Limit**: Change `MAX_VOICES` constant in [worklet/synth-processor.js](worklet/synth-processor.js) (line 9)
- **Build Validation**: Automatic validation ensures production builds are complete and functional
- **Rate Limiting**: Adjust `paramUpdateThrottle` in [audio/synth.js](audio/synth.js) (default: 1ms)
- **Message Queue Size**: Adjust `maxQueueSize` in [worklet/synth-processor.js](worklet/synth-processor.js) (default: 256)

## Dev setup

- Requirements: Node.js (LTS recommended). The project uses ES modules (`type: "module"`) and a small build script.
- Install dependencies:

```bash
npm install
```

- Running locally:
  - The app is a static web app — open `index.html` in a secure context (HTTPS or `http://localhost`).
  - Start a simple local server (example using Python or http-server):

```bash
# using Node http-server (install if needed):
npx http-server . -p 8080

# or using Python 3:
python3 -m http.server 8080
```

- Open http://localhost:8080 in a Chromium-based browser for best AudioWorklet support. Click "Start Audio" in the UI to resume the AudioContext.

## Tests

- The repo has a minimal test runner using Node's built-in test runner. To run tests:

```bash
npm test

# Run in watch mode:
npm run test:watch
```

- To run a single test file (example):

```bash
node --test tests/music.test.js
```

## Development Commands

```bash
# Testing
npm test              # Run test suite
npm run test:watch    # Run tests in watch mode

# Formatting
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without making changes

# Building
npm run build         # Create single-file production build

# Create new effect
npm run create-effect # Scaffold a new audio effect
```

## Contributing

- Workflow:
  1.  Fork the repository and create a feature branch: `git checkout -b feature/your-change`.
  2.  Run the test suite and formatting locally before opening a PR:

```bash
npm install
npm run format
npm test
```

- Coding style: follow the existing project style. Run `npm run format` to apply Prettier formatting.
- Keep changes focused and avoid committing the built `dist/index.html` file — builds are large and generated.
- When opening a PR, include a short description, a link to any reproducer, and note if the change affects audio latency or timing (these are sensitive areas).

## Project Documentation

- [CLAUDE.md](CLAUDE.md) - Detailed architecture and development guide
- [Problems_Critical.md](Problems_Critical.md) - Fixed bugs and issues (16/16 resolved)
- [tests/TEST_COVERAGE.md](tests/TEST_COVERAGE.md) - Test coverage report
- [Important_TODO.md](Important_TODO.md) - Analysis and improvement plan

## Key Technologies

- **Web Audio API**: AudioWorklet for low-latency DSP processing
- **Web MIDI API**: External MIDI controller support
- **ES Modules**: Modern JavaScript module system
- **PolyBLEP**: Polynomial Bandlimited Step for anti-aliasing
- **Node.js Test Runner**: Built-in testing framework
- **Prettier**: Code formatting

## License

This project is open source. See repository for license details.
