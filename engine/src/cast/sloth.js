// A species is one spec file. Colours are hex; shapes are picked from the rig's options.
export const SLOTH = {
  name: 'sloth', outline: '#231a14',
  fur: '#a48a6a', belly: '#bfa685', limb: '#8f7659', hand: '#7e6850',
  face: '#eddcb6', muzzle: '#f5e9cc', nose: '#4a372a', lid: '#dcc9a0',
  ears: { type: 'none' },
  eyePatch: { type: 'slant', color: '#5b4635' },     // none | slant | round
  pattern: { type: 'none' },                          // none | spots | stripes
  tail: { type: 'none' },                             // none | stub | long
  armLen: 1.28, claws: 3, headW: 1, headH: 0.96, tuft: true,
};
