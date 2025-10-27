// ui/midi-controls.js - MIDI device UI and configuration

import { midiToNoteName } from '../utils/music.js';

export function initMIDIUI(midiInput) {
  const statusEl = document.getElementById('midiStatus');
  const devicesEl = document.getElementById('midiDevices');
  const activityEl = document.getElementById('midiActivity');
  const mappingListEl = document.getElementById('midiMappingList');
  const resetMappingBtn = document.getElementById('midiMappingReset');
  const learnStatusEl = document.getElementById('midiLearnStatus');

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
    if (v < -10) label = 'L.';
    else if (v > 10) label = 'E.';
    velocityCurveVal.textContent = `${label} ${v}`;
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

  // CC mapping UI helpers
  let activeLearnTarget = null;

  const setLearnStatus = (message, active = false) => {
    if (!learnStatusEl) return;
    learnStatusEl.textContent = message;
    if (active) {
      learnStatusEl.classList.add('active');
    } else {
      learnStatusEl.classList.remove('active');
    }
  };

  const stopMidiLearn = (notify = true) => {
    if (!activeLearnTarget) return;
    midiInput.cancelMidiLearn();
    activeLearnTarget = null;
    if (notify) {
      setLearnStatus('MIDI learn cancelled');
    } else {
      setLearnStatus('MIDI learn inactive');
    }
    renderMapping();
  };

  const renderMapping = () => {
    if (!mappingListEl) return;

    const mappings = midiInput.getMappingsSnapshot();
    mappingListEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    mappings.forEach((mapping) => {
      const row = document.createElement('div');
      row.className = 'midi-mapping-row';
      if (mapping.id === activeLearnTarget) {
        row.classList.add('learning');
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'midi-mapping-label';

      const labelPrimary = document.createElement('div');
      labelPrimary.className = 'midi-mapping-name';
      labelPrimary.textContent = mapping.label;

      const labelMeta = document.createElement('div');
      labelMeta.className = 'midi-mapping-meta';
      labelMeta.textContent = `${mapping.group} • Default CC ${mapping.defaultCC}`;

      labelEl.appendChild(labelPrimary);
      labelEl.appendChild(labelMeta);

      const ccWrapper = document.createElement('div');
      ccWrapper.className = 'midi-mapping-cc';
      const ccInput = document.createElement('input');
      ccInput.type = 'number';
      ccInput.min = '0';
      ccInput.max = '127';
      ccInput.placeholder = '—';
      if (mapping.cc !== null && mapping.cc !== undefined) {
        ccInput.value = mapping.cc;
      }
      if (mapping.id === activeLearnTarget) {
        ccInput.disabled = true;
      }
      ccInput.addEventListener('change', (event) => {
        const value = event.target.value.trim();
        if (value === '') {
          midiInput.setCCMapping(mapping.id, null);
          return;
        }
        const numeric = Number(value);
        if (Number.isNaN(numeric)) {
          midiInput.setCCMapping(mapping.id, null);
          return;
        }
        const clamped = Math.max(0, Math.min(127, Math.round(numeric)));
        midiInput.setCCMapping(mapping.id, clamped);
      });
      ccWrapper.appendChild(ccInput);

      const actionsEl = document.createElement('div');
      actionsEl.className = 'midi-mapping-actions';

      const learnBtn = document.createElement('button');
      learnBtn.type = 'button';
      learnBtn.className = 'pill small midi-mapping-btn';
      learnBtn.textContent =
        mapping.id === activeLearnTarget ? 'Listening…' : 'Learn';
      learnBtn.disabled = mapping.id === activeLearnTarget;
      learnBtn.addEventListener('click', () => {
        if (mapping.id === activeLearnTarget) {
          stopMidiLearn();
          return;
        }
        midiInput.cancelMidiLearn();
        const started = midiInput.startMidiLearn(mapping.id, ({ ccNumber }) => {
          activeLearnTarget = null;
          setLearnStatus(
            `Assigned CC ${ccNumber} to ${mapping.label} (was ${
              mapping.cc ?? '—'
            })`
          );
          renderMapping();
        });
        if (started) {
          activeLearnTarget = mapping.id;
          setLearnStatus(`Move a control for ${mapping.label}…`, true);
          renderMapping();
        }
      });

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'pill small midi-mapping-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => {
        if (activeLearnTarget === mapping.id) {
          stopMidiLearn(false);
        }
        midiInput.setCCMapping(mapping.id, null);
        setLearnStatus(`Cleared CC mapping for ${mapping.label}`);
      });

      actionsEl.appendChild(learnBtn);
      actionsEl.appendChild(clearBtn);

      row.appendChild(labelEl);
      row.appendChild(ccWrapper);
      row.appendChild(actionsEl);

      fragment.appendChild(row);
    });

    mappingListEl.appendChild(fragment);
  };

  if (mappingListEl) {
    midiInput.onMappingChange = renderMapping;
    renderMapping();
    if (resetMappingBtn) {
      resetMappingBtn.addEventListener('click', () => {
        stopMidiLearn(false);
        midiInput.resetCCMappings();
        setLearnStatus('CC mappings reset to defaults');
      });
    }
    if (learnStatusEl) {
      setLearnStatus('MIDI learn inactive');
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && activeLearnTarget) {
        stopMidiLearn();
      }
    });
  }

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
