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

- **Voices**: 8-voice polyphony with voice stealing
- **Sample Rate**: Browser default (typically 44.1kHz)
- **Latency**: Interactive latency hint
- **Anti-aliasing**: PolyBLEP for bandlimited synthesis
