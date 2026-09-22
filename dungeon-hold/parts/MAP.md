# Dungeon Hold — the seven-door hall (map v2 plan)

Player's brief: "3 separate vessels open up on the crystal but they start at 7 different doors, bifurcations that converge
then turn, or maybe there's a landing and another flight, where defenses could be." Desktop/tablet only.
Goal: mobs stay under fire longer; landings are tower spots that see the legs feeding them.

## Approaches

- **North — the grand stair.** Doors 1 and 2 in the top corners (level +6). Each leg runs along the top wall and converges on
  Landing A (+6). From A a wide stairway drops toward the crystal in two flights with a mid-landing B (+3), then into the hall.
  Towers on A cover both legs; towers on B cover the lower flight and the hall mouth.
- **West — the switchback.** Door 3 high on the west wall, door 4 low. Both legs meet at Landing C (+3), then one flight turns
  east and descends into the hall's west entrance. C covers both legs plus the turn.
- **East — the three-way.** Doors 5 and 6 converge on Landing D (+6); a flight drops to Landing E (+3) where door 7's leg
  joins from below; a turn and a final flight into the hall's east entrance. E sees three streams.
- **The hall** stays the current room (slightly larger), crystal on the dais (+0.5), floor at 0.

## Engine work needed

1. Grid grows (about 2.5x floor area); walls/torches/banners already build themselves from the grid.
2. A height layer per cell (`hgt[]`): floor levels 0 / +3 / +6, ramp cells interpolating between neighbours.
   - floor mesh per region/level, stair side faces, wall heights follow the floor
   - `baseFloor(x,z)` returns the interpolated height; mobs, loot, orbs, projectiles, the hero's landing all use it
   - flow field stays 2D (ramps are walkable); `los()` unchanged
3. Seven spawn doors (`LANES` grows), wave composition spreads across doors by wave number.
4. Camera: pitch clamp and wall clipping need checking on the upper levels.
