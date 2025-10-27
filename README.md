# VortexPWM

8-voice polyphonic PWM (Pulse Width Modulation) synthesizer with 11 built-in effects running in the browser using Web Audio API's AudioWorklet technology.

## Features

- **8-voice polyphony** with intelligent voice stealing
- **PWM oscillator** with PolyBLEP anti-aliasing
- **24dB/oct resonant lowpass filter** per voice
- **ADSR envelopes** for amplitude and filter
- **Sub-oscillator** (one octave down)
- **Auto-pan** with LFO modulation
- **Aftertouch modulation matrix** (4 slots)
- **11 built-in effects**: Delay, Reverb, Chorus, Flanger, Phaser, Tremolo, AutoWah, BitCrusher, HardClip, FreqShifter, PitchShifter
- **Web MIDI support** with pitch bend and velocity curves
- **Real-time voice count monitoring**
- **Pure JavaScript** ES modules implementation

## Quick Start

### Development

1. Serve the project from a local web server (required for AudioWorklet):

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve
   ```

2. Open [http://localhost:8000](http://localhost:8000) in your browser

3. Click "Start Audio" and play with the on-screen keyboard or connect a MIDI controller

### Production Build

```bash
npm run build
```

This creates a single self-contained HTML file in `dist/index.html` (~260KB) that can be deployed anywhere.

## Development Commands

```bash
# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode

# Formatting
npm run format          # Format all files with Prettier
npm run format:check    # Check formatting without changes

# Building
npm run build           # Create production build

# Effects
npm run create-effect   # Scaffold a new effect from template
```

## Architecture

The synthesizer follows a four-layer architecture:

1. **UI Layer** - User interface controls, keyboard, MIDI device selection
2. **Audio Controller** - AudioWorklet initialization and parameter management
3. **DSP Core** - Polyphonic voice management, oscillators, filters, envelopes
4. **Effects Chain** - Modular effects processing in AudioWorklet thread

### Key Components

- **Voice Allocator** - Intelligent polyphonic voice management with stealing
- **PWM Oscillator** - Bandlimited pulse wave synthesis with PolyBLEP
- **IIR Filter** - Cascaded biquad sections for 24dB/oct filtering
- **Envelope Generator** - Exponential ADSR curves
- **Effects System** - Modular effect architecture with parameter management

## MIDI Support

- Auto-detection of MIDI devices
- Multiple device support with enable/disable toggles
- Pitch bend (configurable ±0-24 semitones)
- Velocity curves (logarithmic, linear, exponential)
- Channel aftertouch for modulation
- Sustain pedal (CC 64)
- MIDI panic (CC 120, CC 123)

## Testing

The project has comprehensive test coverage:

- **81 tests** across 25 test suites
- **100% pass rate**
- **~94% coverage** for testable code

Test suites cover:

- DSP mathematical functions
- Music theory utilities
- Logger functionality
- Effect parameter management

See [tests/TEST_COVERAGE.md](tests/TEST_COVERAGE.md) for detailed coverage report.

## Browser Requirements

- Modern browser with Web Audio API support
- Secure context required (HTTPS or localhost)
- Web MIDI API support (optional, for MIDI controllers)

Tested on:

- Chrome/Edge 90+
- Firefox 90+
- Safari 14.1+

## Project Structure

```
VortexPWM/
├── index.html              # Single-page application
├── main.js                 # Entry point
├── audio/
│   └── synth.js           # AudioWorklet controller
├── worklet/
│   ├── synth-processor.js     # Main DSP implementation
│   └── fx-chain-processor.js  # Effects chain processor
├── fx/
│   ├── fx-controller.js       # Effects controller
│   ├── parameter-manager.js   # Parameter management
│   ├── effect-registry.js     # Effect registration
│   └── effects/               # 11 effect implementations
├── midi/
│   └── midi-input.js      # Web MIDI API wrapper
├── ui/
│   ├── controls.js        # Main UI orchestrator
│   ├── parameter-controls.js
│   ├── keyboard.js
│   └── midi-controls.js
├── utils/
│   ├── music.js           # Music theory utilities
│   └── logger.js          # Logging utility
└── tests/                 # Test suite
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Check formatting: `npm run format:check`
6. Submit a pull request

## License

MIT License

## Acknowledgments

Built with Web Audio API's AudioWorklet technology for high-performance audio processing in the browser.
