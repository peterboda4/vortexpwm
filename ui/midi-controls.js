// ui/midi-controls.js - MIDI device UI and configuration

import { midiToNoteName } from '../utils/music.js';

export function initMIDIUI(midiInput) {
  const statusEl = document.getElementById('midiStatus');
  const devicesEl = document.getElementById('midiDevices');
  const activityEl = document.getElementById('midiActivity');

  // Bind MIDI parameter sliders
  const pitchBendRangeEl = document.getElementById('pitchBendRange');
  const pitchBendRangeVal = document.getElementById('pitchBendRangeVal');
  const velocityCurveEl = document.getElementById('velocityCurve');
  const velocityCurveVal = document.getElementById('velocityCurveVal');

  // Pitch bend range
  const updatePitchBendRange = (value) => {
    const v = Math.round(+value);
    pitchBendRangeVal.textContent = `±${v}`;
    midiInput.setPitchBendRange(v);
  };
  updatePitchBendRange(pitchBendRangeEl.value);
  pitchBendRangeEl.addEventListener('input', (e) =>
    updatePitchBendRange(e.target.value)
  );

  // Velocity curve
  const updateVelocityCurve = (value) => {
    const v = Math.round(+value);
    let label = 'Lin';
    if (v < -10) label = 'Log';
    else if (v > 10) label = 'Exp';
    velocityCurveVal.textContent = `${label} (${v})`;
    midiInput.setVelocityCurve(v);
  };
  updateVelocityCurve(velocityCurveEl.value);
  velocityCurveEl.addEventListener('input', (e) =>
    updateVelocityCurve(e.target.value)
  );

  // Update device list
  const updateDeviceList = () => {
    const devices = midiInput.getAvailableInputs();

    if (devices.length === 0) {
      statusEl.textContent = 'No MIDI devices found';
      statusEl.style.color = 'var(--muted)';
      devicesEl.innerHTML = '';
      return;
    }

    statusEl.textContent = `${devices.length} MIDI device${devices.length > 1 ? 's' : ''} available`;
    statusEl.style.color = 'var(--accent)';

    devicesEl.innerHTML = devices
      .map((device) => {
        const isEnabled = device.enabled;
        return `
        <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; padding: 6px; background: ${isEnabled ? '#1a2a1f' : '#1a1d23'}; border-radius: 8px; border: 1px solid ${isEnabled ? 'var(--accent)' : '#2b3038'};">
          <input
            type="checkbox"
            id="midi-${device.id}"
            ${isEnabled ? 'checked' : ''}
            style="cursor: pointer;"
          />
          <label for="midi-${device.id}" style="flex: 1; cursor: pointer; font-size: 13px;">
            ${device.name || 'Unknown Device'}
          </label>
          <span style="font-size: 11px; color: var(--muted);">${device.state}</span>
        </div>
      `;
      })
      .join('');

    // Attach event listeners
    devices.forEach((device) => {
      const checkbox = document.getElementById(`midi-${device.id}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          midiInput.setInputEnabled(device.id, e.target.checked);
          updateDeviceList(); // Refresh to show updated state
        });
      }
    });
  };

  // Setup callbacks
  midiInput.onDeviceChange = updateDeviceList;
  midiInput.onNoteActivity = (type, note, velocity) => {
    const noteName = midiToNoteName(note);
    if (type === 'on') {
      activityEl.textContent = `Last note: ${noteName} (vel: ${velocity})`;
      activityEl.style.color = 'var(--accent)';
    } else {
      activityEl.textContent = `Last note: ${noteName} (off)`;
      activityEl.style.color = 'var(--muted)';
    }
  };

  // Initial update
  updateDeviceList();
}
