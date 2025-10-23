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
- **On-Screen Keyboard**: 2-octave virtual keyboard
- **Aftertouch**: 4-slot modulation matrix

### Aftertouch Destinations

- PWM Depth
- Pan Depth
- Oscillator Volume
- Master Volume

## Usage

1. Open `index.html` in browser (requires HTTPS or localhost)
2. Click "Start Audio" to enable audio
3. Play notes via MIDI or on-screen keyboard
4. Adjust parameters with sliders

## Technical

- **Voices**: 8-voice polyphony with voice stealing
- **Sample Rate**: Browser default (typically 44.1kHz)
- **Latency**: Interactive latency hint
- **Anti-aliasing**: PolyBLEP for bandlimited synthesis
