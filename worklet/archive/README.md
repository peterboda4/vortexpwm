# Archived Worklet Versions

This folder contains historical versions of the synth processor that are no longer used in production.

## Files

### synth-processor.js.bak

- Backup copy of an earlier production version
- 1440 lines
- Archived: 2025-10-27

### synth-processor-poly.js

- Earlier polyphonic implementation
- 450 lines
- Simpler architecture, fewer features
- Archived: 2025-10-27

### synth-processor-refactored.js

- Experimental refactored version with modular classes
- 1350 lines
- Features:
  - PolyBLEP class for anti-aliasing
  - NoiseGenerator class
  - Better code organization
- Not used in production
- Archived: 2025-10-27

## Current Production Version

The current production version is **worklet/synth-processor.js** (1515 lines).

Key features:

- 8-voice polyphony
- IIR Filter class (24dB resonant lowpass)
- PolyBLEP anti-aliasing
- Thread-safe message queue
- Voice stealing with intelligent allocation
- Real-time voice count reporting

## Why These Were Archived

- **synth-processor-poly.js**: Superseded by more feature-rich production version
- **synth-processor-refactored.js**: Experimental version, not deployed
- **synth-processor.js.bak**: Backup file, no longer needed

## References

See [CLAUDE.md](../../CLAUDE.md) for current architecture documentation.
