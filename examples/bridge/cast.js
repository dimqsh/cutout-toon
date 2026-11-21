// The cast of this project. Keep these specs for later videos with the same hero.
export const DIMASH = {
  name: 'dimash', kind: 'human', skin: '#f0c39a', iris: '#4a2f1c',
  hair: { style: 'spiky', color: '#1f1814' },
  top: { type: 'tshirt', color: '#2f8fe0', print: true, accent: '#ffd24a' },
  legs: '#34405a', feet: '#f2efe8', headW: 1.05,
};
// After he starts thinking like an engineer.
export const DIMASH_PRO = { ...DIMASH, name: 'dimash-engineer', hat: { type: 'hardhat', color: '#ffc933' } };
