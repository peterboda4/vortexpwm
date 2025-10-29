// ui/matrix-ui.js - Modulation Matrix UI Generator

import {
  MATRIX_SOURCES,
  MATRIX_DESTINATIONS,
} from '../utils/parameter-registry.js';

/**
 * Generate HTML for a single matrix slot
 * @param {number} slotNum - Slot number (1-12)
 * @returns {string} HTML string for the slot
 */
function generateMatrixSlot(slotNum) {
  const sourcesHTML = MATRIX_SOURCES.map(
    (name, index) => `<option value="${index}">${name}</option>`
  ).join('');

  const destinationsHTML = MATRIX_DESTINATIONS.map(
    (name, index) => `<option value="${index}">${name}</option>`
  ).join('');

  return `
    <div class="matrix-slot">
      <span class="matrix-slot-number">${slotNum}</span>
      <select class="matrix-source" id="matrixSource${slotNum}" data-param="matrixSource${slotNum}">
        ${sourcesHTML}
      </select>
      <span class="matrix-arrow">→</span>
      <select class="matrix-dest" id="matrixDest${slotNum}" data-param="matrixDest${slotNum}">
        ${destinationsHTML}
      </select>
      <input
        type="range"
        class="matrix-amount"
        id="matrixAmount${slotNum}"
        data-param="matrixAmount${slotNum}"
        min="-100"
        max="100"
        step="1"
        value="0"
      />
      <span class="matrix-amount-value" id="matrixAmount${slotNum}Val" data-slot="${slotNum}">+0%</span>
    </div>
  `;
}

/**
 * Initialize the modulation matrix UI
 * Creates 12 slots and attaches double-click reset handlers
 */
export function initializeMatrixUI() {
  const container = document.getElementById('modulationMatrix');
  if (!container) {
    console.error('Matrix container not found');
    return;
  }

  // Generate all 12 slots
  const html = [];
  for (let i = 1; i <= 12; i++) {
    html.push(generateMatrixSlot(i));
  }
  container.innerHTML = html.join('');

  // Attach double-click reset handlers to amount value spans
  for (let i = 1; i <= 12; i++) {
    const valueSpan = document.getElementById(`matrixAmount${i}Val`);
    const amountSlider = document.getElementById(`matrixAmount${i}`);

    if (valueSpan && amountSlider) {
      valueSpan.addEventListener('dblclick', () => {
        amountSlider.value = 0;
        // Trigger change event to update synth
        amountSlider.dispatchEvent(new Event('input'));
        valueSpan.textContent = '+0%';
      });
    }
  }

  console.log('Modulation matrix UI initialized with 12 slots');
}
