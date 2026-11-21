# Draw sheet: Dimash builds a bridge

Story route (from /higgsfield-faceless-script, "a tempting fix"): attempt, result, new problem; each fix exposes the next constraint.
Contract: we change how Dimash crosses one river, keep the river and the boy the same, follow four ideas from the dumbest to the best, and answer "which idea is the engineer's one and why".

## Facts (two sources each)
- A plank is the simplest beam bridge; a beam carries load by bending. Wikipedia "Beam bridge"; Britannica "truss bridge" ("beam bridges ... carry vertical loads through bending").
- A rope bridge: deck on two cables, moves under load, foot traffic only. Wikipedia "Simple suspension bridge" (one source; shown, not claimed as a number).
- An arch carries load in compression and pushes sideways on its supports, so the banks must hold. Wikipedia "Arch bridge"; Britannica "arch bridge".
- A truss is made of triangles, which are not easily distorted, so it carries a lot with little material. Wikipedia "Truss bridge"; Britannica "truss bridge".

## References (ref/)
- truss.jpg: trapezoid side frame, verticals and diagonals forming triangles, deck at the bottom chord. https://en.wikipedia.org/wiki/Truss_bridge
- rope.jpg: thin sagging deck, two hand ropes, no towers. https://en.wikipedia.org/wiki/Simple_suspension_bridge
- arch.jpg: one curve from bank to bank, deck carried by it. https://www.britannica.com/technology/arch-bridge

## Hero
- Dimash, a boy: kind human, black spiky hair `#1f1814`, blue T-shirt `#2f8fe0` with a yellow print, dark shorts, white trainers, brown eyes. h 1.35 m.
- From "think like an engineer" on he wears a yellow hard hat (DIMASH_PRO): the costume change is the turn of the story.
- Friends for the last test: CAT (h 0.8), PANDA (h 1.2), ready specs.

## Set
- New 3D stage `river` (river.js): two grass banks, a 3.6 m gap, water 1.1 m below, trees and hills behind. Sun high from the front left, cool lilac shadows, pale blue haze.
- Bridges built in the stage, one per shot through `shot.bridge`: plank (two hinged halves that sag and snap), rope (sagging deck that swings), arch (nine stone blocks and a deck), truss (red steel triangles).
- 2D diagram cards for the three "why": bending, sideways push, square versus triangle.

## Props per beat
- splash (new, registerProp) for both falls; bulb for the idea.

## Engine lacks
- Hands cannot grip; mouth is not synced (no voice in this test).
