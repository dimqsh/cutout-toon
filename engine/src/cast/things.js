// Objects with a face. Shape and pattern carry the identity; the face and limbs are shared.
export const COIN = {
  name: 'coin', kind: 'object', fur: '#ffcc33', outline: '#3a2508', headShape: 'circle',
  pattern: { type: 'rim', color: '#d99a1e' }, limb: '#3a2508', hand: '#ffffff', feet: '#3a2508', lid: '#f0b928', gloves: true,
};
export const BRAIN = {
  name: 'brain', kind: 'object', fur: '#f4a3b4', outline: '#4a1f2a', headShape: 'blob', headW: 1.12, headH: 0.9,
  pattern: { type: 'folds', color: '#d97a8e' }, limb: '#4a1f2a', hand: '#f4a3b4', feet: '#4a1f2a', lid: '#ec8ea1',
};
export const PHONE = {
  name: 'phone', kind: 'object', fur: '#2b2d36', outline: '#101116', headShape: 'box', headW: 0.72, headH: 1.15,
  pattern: { type: 'screen', color: '#5ab0ff' }, limb: '#101116', hand: '#ffffff', feet: '#101116', lid: '#4a9ae8', gloves: true, cheeks: false, faceY: 4,
};
export const JAR = {
  name: 'jar', kind: 'object', fur: '#ffb347', outline: '#3a2508', headShape: 'box', headW: 0.85, headH: 1.05,
  pattern: { type: 'label', color: '#ffffff', text: 'HONEY', textColor: '#c86b14' }, limb: '#3a2508', hand: '#ffffff', feet: '#3a2508', gloves: true, faceY: -12, faceScale: 0.8,
};
