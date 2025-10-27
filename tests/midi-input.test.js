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

test('filter cutoff CC uses exponential scaling', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 74 = filter cutoff with exponential scaling
  midi.handleCC(74, 0); // minimum
  const cutoffMin = synth.params.get('filterCutoff');
  assert.equal(cutoffMin, 20, 'minimum cutoff should be 20 Hz');

  midi.handleCC(74, 127); // maximum
  const cutoffMax = synth.params.get('filterCutoff');
  assert.equal(cutoffMax, 20000, 'maximum cutoff should be 20000 Hz');

  // Middle value should be closer to low end due to exponential scaling
  midi.handleCC(74, 64); // ~50%
  const cutoffMid = synth.params.get('filterCutoff');
  assert.ok(
    cutoffMid < 2000,
    `mid cutoff should be < 2kHz due to exp scaling, got ${cutoffMid}`
  );
});

test('filter resonance CC maps correctly', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 71 = filter resonance
  midi.handleCC(71, 0);
  assert.equal(synth.params.get('filterResonance'), 0);

  midi.handleCC(71, 127);
  const resMax = synth.params.get('filterResonance');
  assert.ok(
    resMax >= 0.94 && resMax <= 0.95,
    `max resonance should be ~0.95, got ${resMax}`
  );
});

test('HPF cutoff CC maps correctly', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 102 = HPF cutoff with exponential scaling
  midi.handleCC(102, 0);
  assert.equal(synth.params.get('hpfCutoff'), 20);

  midi.handleCC(102, 127);
  assert.equal(synth.params.get('hpfCutoff'), 20000);
});

test('envelope CC mappings control amp envelope', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 73 = amp attack
  midi.handleCC(73, 127);
  assert.equal(synth.params.get('envelopeAttack'), 6);

  // CC 80 = amp decay
  midi.handleCC(80, 64);
  const decay = synth.params.get('envelopeDecay');
  assert.ok(decay > 2.9 && decay < 3.1, `decay should be ~3s, got ${decay}`);

  // CC 81 = amp sustain
  midi.handleCC(81, 64);
  const sustain = synth.params.get('envelopeSustain');
  assert.ok(
    sustain > 0.49 && sustain < 0.52,
    `sustain should be ~0.5, got ${sustain}`
  );

  // CC 82 = amp release
  midi.handleCC(82, 0);
  assert.equal(synth.params.get('envelopeRelease'), 0);
});

test('envelope CC mappings control filter envelope', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 75 = filter attack
  midi.handleCC(75, 0);
  assert.equal(synth.params.get('filterEnvAttack'), 0);

  // CC 76 = filter decay
  midi.handleCC(76, 127);
  assert.equal(synth.params.get('filterEnvDecay'), 6);

  // CC 77 = filter sustain
  midi.handleCC(77, 127);
  assert.equal(synth.params.get('filterEnvSustain'), 1);

  // CC 72 = filter release
  midi.handleCC(72, 64);
  const release = synth.params.get('filterEnvRelease');
  assert.ok(
    release > 2.9 && release < 3.1,
    `release should be ~3s, got ${release}`
  );
});

test('modulation CC mappings work correctly', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 1 = PWM depth
  midi.handleCC(1, 127);
  assert.equal(synth.params.get('pulseWidthModulationDepth'), 1);

  // CC 12 = PWM rate (0.1-10 Hz range)
  midi.handleCC(12, 0);
  const rateMin = synth.params.get('pulseWidthModulationRate');
  assert.ok(
    rateMin >= 0.09 && rateMin <= 0.11,
    `min PWM rate should be ~0.1, got ${rateMin}`
  );

  midi.handleCC(12, 127);
  const rateMax = synth.params.get('pulseWidthModulationRate');
  assert.ok(
    rateMax >= 9.9 && rateMax <= 10.1,
    `max PWM rate should be ~10, got ${rateMax}`
  );

  // CC 13 = Pan depth
  midi.handleCC(13, 64);
  const panDepth = synth.params.get('panningModulationDepth');
  assert.ok(
    panDepth > 0.49 && panDepth < 0.52,
    `pan depth should be ~0.5, got ${panDepth}`
  );
});

test('volume CC mappings control mixer levels', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 7 = master volume
  midi.handleCC(7, 127);
  assert.equal(synth.params.get('masterVolume'), 1);

  // CC 11 = osc1 volume
  midi.handleCC(11, 64);
  const osc1Vol = synth.params.get('oscillatorVolume');
  assert.ok(
    osc1Vol > 0.49 && osc1Vol < 0.52,
    `osc1 volume should be ~0.5, got ${osc1Vol}`
  );

  // CC 16 = sub osc1 volume
  midi.handleCC(16, 0);
  assert.equal(synth.params.get('subOscillatorVolume'), 0);

  // CC 17 = osc2 volume
  midi.handleCC(17, 127);
  assert.equal(synth.params.get('oscillator2Volume'), 1);

  // CC 18 = sub osc2 volume
  midi.handleCC(18, 32);
  const sub2Vol = synth.params.get('subOscillator2Volume');
  assert.ok(
    sub2Vol > 0.24 && sub2Vol < 0.26,
    `sub2 volume should be ~0.25, got ${sub2Vol}`
  );

  // CC 19 = noise volume
  midi.handleCC(19, 96);
  const noiseVol = synth.params.get('noiseVolume');
  assert.ok(
    noiseVol > 0.74 && noiseVol < 0.76,
    `noise volume should be ~0.75, got ${noiseVol}`
  );
});

test('pan CC maps to full stereo range', () => {
  const synth = createSynthStub();
  const midi = new MIDIInput(synth);

  // CC 10 = pan position
  midi.handleCC(10, 0); // full left
  const panLeft = synth.params.get('panningPosition');
  assert.ok(
    panLeft >= -1.01 && panLeft <= -0.99,
    `pan left should be -1, got ${panLeft}`
  );

  midi.handleCC(10, 64); // center
  const panCenter = synth.params.get('panningPosition');
  assert.ok(
    panCenter > -0.02 && panCenter < 0.02,
    `pan center should be ~0, got ${panCenter}`
  );

  midi.handleCC(10, 127); // full right
  const panRight = synth.params.get('panningPosition');
  assert.ok(
    panRight >= 0.99 && panRight <= 1.01,
    `pan right should be 1, got ${panRight}`
  );
});
