/**
 * FX Controls UI
 * Provides drag-and-drop interface for FX chain management
 */

export class FXControls {
  constructor(fxController) {
    this.fxController = fxController;
    this.chainContainer = document.getElementById('fx-chain');
    this.effectsLibrary = document.getElementById('fx-library');
    this.draggedElement = null;

    // Wait for metadata to load before initializing
    this.init();
  }

  async init() {
    // Wait until metadata is loaded
    while (!this.fxController.metadataLoaded) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.initLibrary();
    this.initDragAndDrop();
    this.initEventListeners();
  }

  initLibrary() {
    const effects = this.fxController.getAvailableEffects();

    if (effects.length === 0) {
      console.warn('No effects metadata loaded yet');
      return;
    }

    this.effectsLibrary.innerHTML = effects
      .map(
        (fx) => `
      <div class="fx-library-item" data-effect-id="${fx.id}" draggable="true">
        <span class="fx-name">${fx.name}</span>
      </div>
    `
      )
      .join('');
  }

  initDragAndDrop() {
    this.effectsLibrary.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('fx-library-item')) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('effectId', e.target.dataset.effectId);
        e.dataTransfer.setData('source', 'library');
      }
    });

    this.chainContainer.addEventListener('dragover', (e) => {
      e.preventDefault();

      // Determine if dragging from library or chain
      const draggable = document.querySelector('.dragging');

      // If there's a .dragging element, it's from chain (move)
      // Otherwise it's from library (copy)
      if (draggable) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'copy';
      }

      const afterElement = this.getDragAfterElement(e.clientY);

      if (afterElement == null && draggable) {
        this.chainContainer.appendChild(draggable);
      } else if (draggable && afterElement) {
        this.chainContainer.insertBefore(draggable, afterElement);
      }
    });

    this.chainContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const effectId = e.dataTransfer.getData('effectId');
      const source = e.dataTransfer.getData('source');

      console.log('Drop event:', { effectId, source });

      if (source === 'library' && effectId) {
        const position = this.getDropPosition(e.clientY);
        console.log('Adding effect:', effectId, 'at position:', position);
        this.fxController.addEffect(effectId, position);
        // UI will be updated via fxChainChanged event
      } else if (source === 'chain') {
        this.updateChainOrder();
      }
    });

    this.chainContainer.addEventListener('dragstart', (e) => {
      // Don't allow dragging when clicking on buttons
      if (e.target.matches('button')) {
        e.preventDefault();
        return;
      }

      // Allow dragging from header or drag handle
      if (
        e.target.classList.contains('fx-header') ||
        e.target.classList.contains('fx-drag-handle') ||
        e.target.classList.contains('fx-title')
      ) {
        const chainItem = e.target.closest('.fx-chain-item');
        if (chainItem) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('instanceId', chainItem.dataset.instanceId);
          e.dataTransfer.setData('source', 'chain');
          chainItem.classList.add('dragging');
          this.draggedElement = chainItem;
        }
      } else {
        e.preventDefault();
      }
    });

    this.chainContainer.addEventListener('dragend', (e) => {
      // Clean up dragging state regardless of what element fired the event
      const chainItem = e.target.closest('.fx-chain-item');
      if (chainItem) {
        chainItem.classList.remove('dragging');
      }

      // Also clean up any other elements that might have dragging class
      this.chainContainer.querySelectorAll('.dragging').forEach((el) => {
        el.classList.remove('dragging');
      });

      this.draggedElement = null;
    });
  }

  getDragAfterElement(y) {
    const draggableElements = [
      ...this.chainContainer.querySelectorAll('.fx-chain-item:not(.dragging)'),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  addEffectToUI(instanceId, effectId) {
    const metadata = this.fxController.getEffectMetadata(effectId);

    const item = document.createElement('div');
    item.className = 'fx-chain-item';
    item.dataset.instanceId = instanceId;
    item.draggable = false; // Don't make whole item draggable

    item.innerHTML = `
      <div class="fx-header" draggable="true">
        <span class="fx-drag-handle">☰</span>
        <span class="fx-title">${metadata.name}</span>
        <button class="fx-toggle" data-enabled="true">ON</button>
        <button class="fx-remove">×</button>
      </div>
      <div class="fx-parameters">
        ${metadata.parameters
          .map(
            (p) => `
          <div class="fx-param">
            <label>${p.label}</label>
            <input type="range"
                   min="${p.min}"
                   max="${p.max}"
                   step="0.001"
                   value="${p.default}"
                   data-param="${p.name}">
            <span class="fx-param-value">${p.default.toFixed(3)}${p.unit || ''}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    this.initEffectControls(item, instanceId, effectId);
    this.chainContainer.appendChild(item);
  }

  initEffectControls(item, instanceId, effectId) {
    const toggle = item.querySelector('.fx-toggle');
    toggle.addEventListener('click', () => {
      const enabled = toggle.dataset.enabled === 'true';
      const newState = !enabled;
      toggle.dataset.enabled = newState;
      toggle.textContent = newState ? 'ON' : 'OFF';
      item.classList.toggle('fx-disabled', !newState);
      this.fxController.setEnabled(instanceId, newState);
    });

    item.querySelector('.fx-remove').addEventListener('click', () => {
      this.fxController.removeEffect(instanceId);
      item.remove();
    });

    item.querySelectorAll('input[type="range"]').forEach((slider) => {
      slider.addEventListener('input', () => {
        const param = slider.dataset.param;
        const value = parseFloat(slider.value);
        this.fxController.setParameter(instanceId, param, value);

        const valueSpan = slider.nextElementSibling;
        const metadata = this.fxController.getEffectMetadata(effectId);
        const paramMeta = metadata.parameters.find((p) => p.name === param);
        valueSpan.textContent = `${value.toFixed(3)}${paramMeta.unit || ''}`;
      });
    });
  }

  getDropPosition(clientY) {
    const items = [...this.chainContainer.querySelectorAll('.fx-chain-item')];

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return i;
      }
    }

    return items.length;
  }

  updateChainOrder() {
    const items = [...this.chainContainer.querySelectorAll('.fx-chain-item')];
    const newOrder = items.map((item) => item.dataset.instanceId);
    this.fxController.reorderChain(newOrder);
  }

  initEventListeners() {
    window.addEventListener('fxChainChanged', (e) => {
      console.log('FX Chain changed:', e.detail);

      if (e.detail.type === 'added') {
        // Check if this effect is already in UI
        const existing = this.chainContainer.querySelector(
          `[data-instance-id="${e.detail.instanceId}"]`
        );
        if (!existing) {
          this.addEffectToUI(e.detail.instanceId, e.detail.effectId);
        }
      }
    });
  }
}
