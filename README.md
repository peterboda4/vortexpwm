# PWM Synthesizer

8-voice polyphonic PWM synthesizer running in browser using AudioWorklet.

## Features

### Oscillator

- **Coarse/Fine Tuning**: Semitone and cent adjustments
- **Pulse Width**: Manual PW control (1-99%)
- **PWM**: LFO modulation of pulse width (depth + rate)
- **Sub Oscillator**: One octave down square wave

### Filter

- **24dB IIR Filter**: Resonant lowpass filter
- **Cutoff**: 20Hz - 20kHz frequency range
- **Resonance**: 0-95% Q control
- **Polyphonic**: Independent filter per voice

### Envelope (ADSR)

- **Attack/Decay/Release**: 0-3 second timing
- **Sustain**: 0-100% level
- **Velocity**: Velocity sensitivity control

### Effects

- **Auto Pan**: LFO panning with depth and rate
- **Stereo**: Equal-power panning law

### Control

- **MIDI Input**: External MIDI controller support
- **On-Screen Keyboard**: 5-octave virtual keyboard
- **Aftertouch**: 4-slot modulation matrix

### Aftertouch Destinations

- PWM Depth
- Pan Depth
- Oscillator Volume
- Master Volume

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

This generates `dist/index.html` - a standalone file with:

- Inline CSS
- All JavaScript modules as data URLs (base64)
- AudioWorklet processors as Blob URLs
- 10 audio effects included
- Full MIDI, keyboard, and FX chain support

The generated file can be opened directly in any browser (requires localhost or HTTPS).

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

## Technical

- **Voices**: Configurable polyphony (default: 8 voices) with intelligent voice stealing
- **Sample Rate**: Browser default (typically 44.1kHz or 48kHz) with automatic validation
- **Latency**: Interactive latency hint for low-latency performance
- **Anti-aliasing**: PolyBLEP for bandlimited synthesis
- **Browser Support**: Chrome 66+, Edge 79+, Firefox 76+, Safari 14.1+ (automatic compatibility check)
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **State Management**: Automatic AudioContext resume after tab switching/sleep cycles

## Configuration

- **Voice Limit**: Change `MAX_VOICES` constant in [worklet/synth-processor.js](worklet/synth-processor.js) (line 9)
- **Build Validation**: Automatic validation ensures production builds are complete and functional

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
