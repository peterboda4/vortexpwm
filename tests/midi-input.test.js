import test from 'node:test';
import assert from 'node:assert/strict';
import { MIDIInput } from '../midi/midi-input.js';

function createSynthStub() {
  const fxCalls = [];
  const fxController = {
    states: {},
    getEffectState(effectType) {
      return this.states[effectType] ?? { enabled: true };
    },
    setEffectParam(effectType, param, value) {
      fxCalls.push({ effectType, param, value });
    },
    calls: fxCalls,
    reset() {
      fxCalls.length = 0;
    },
  };

  return {
    params: new Map(),
    paramCalls: [],
    noteOffCalls: [],
    panicCount: 0,
    setParam(name, value) {
      this.params.set(name, value);
      this.paramCalls.push({ name, value });
    },
    noteOff(note) {
      this.noteOffCalls.push(note);
    },
    noteOn() {},
    aftertouch() {},
    allNotesOff() {
      this.panicCount += 1;
    },
    fxController,
  };
}

function findMappingById(midiInput, id) {
  return midiInput.getMappingsSnapshot().find((mapping) => mapping.id === id);
}

test('default CC mappings control synth parameters', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  midi.handleCC(1, 64); // PWM depth
  const pwmDepth = synth.params.get('pulseWidthModulationDepth');
  assert.ok(
    pwmDepth > 0.49 && pwmDepth < 0.52,
    `expected PWM depth to be around 0.5, got ${pwmDepth}`
  );

  midi.handleCC(74, 127); // Filter cutoff (exponential)
  const cutoff = synth.params.get('filterCutoff');
  assert.equal(cutoff, 20000);
});

test('FX CC mappings route through FX controller when enabled', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  synth.fxController.states.reverb = { enabled: true };
  midi.handleCC(91, 96); // Reverb mix

  assert.equal(synth.fxController.calls.length, 1);
  const [{ effectType, param, value }] = synth.fxController.calls;
  assert.equal(effectType, 'reverb');
  assert.equal(param, 'mix');
  assert.ok(value > 0.7 && value < 0.8);

  synth.fxController.reset();
  synth.fxController.states.reverb = { enabled: false };
  midi.handleCC(91, 96);
  assert.equal(
    synth.fxController.calls.length,
    0,
    'FX handler should skip when effect disabled'
  );
});

test('custom CC mapping reassigns targets and clears conflicts', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  midi.setCCMapping('ampEnvAttack', 21);
  const attackMapping = findMappingById(midi, 'ampEnvAttack');
  assert.equal(attackMapping.cc, 21);

  const prevCallCount = synth.paramCalls.length;
  midi.handleCC(73, 100); // old CC should no longer trigger
  assert.equal(synth.paramCalls.length, prevCallCount);

  midi.handleCC(21, 100);
  const lastCall = synth.paramCalls[synth.paramCalls.length - 1];
  assert.equal(lastCall.name, 'envelopeAttack');

  // Reassign to conflicting CC to ensure previous owner cleared
  midi.setCCMapping('ampEnvDecay', 16); // 16 belongs to subOscVolume by default
  const ampDecay = findMappingById(midi, 'ampEnvDecay');
  const subOsc = findMappingById(midi, 'subOscVolume');
  assert.equal(ampDecay.cc, 16);
  assert.equal(subOsc.cc, null);
});

test('MIDI learn captures next CC message and updates mapping', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  let learnResult = null;
  midi.startMidiLearn('masterVolume', (data) => {
    learnResult = data;
  });

  midi.handleCC(55, 120);
  assert.deepEqual(learnResult, { targetId: 'masterVolume', ccNumber: 55 });

  const masterMapping = findMappingById(midi, 'masterVolume');
  assert.equal(masterMapping.cc, 55);

  midi.handleCC(55, 80);
  const masterVol = synth.params.get('masterVolume');
  assert.ok(masterVol > 0.6 && masterVol < 0.64);
});

test('sustain pedal holds and releases notes', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  midi.handleCC(64, 127); // pedal down
  midi.handleNoteOff(60);
  assert.equal(synth.noteOffCalls.length, 0);

  midi.handleCC(64, 0); // pedal up, should release sustained note
  assert.equal(synth.noteOffCalls.length, 1);
  assert.equal(synth.noteOffCalls[0], 60);
});

test('panic CC clears sustain and triggers all notes off', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  midi.sustainPedal = true;
  midi.sustainedNotes.add(60);

  midi.handleCC(120, 0);
  assert.equal(synth.panicCount, 1);
  assert.equal(midi.sustainPedal, false);
  assert.equal(midi.sustainedNotes.size, 0);
});
