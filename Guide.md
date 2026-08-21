# Advanced Drunken Walkers

Advanced Drunken Walkers is a seeded drunkard's-walk generation engine for Construct 3. It is an invisible logic object that owns an integer grid and a set of named **walkers**, agents that stagger across that grid one cell at a time carving values as they go. On top of carving it runs deterministic **mark** passes that drop tagged points along a walk or scatter them across carved regions, so coins, enemies, objectives and decorations all come out of the same seed as the map itself. The plugin draws nothing and spawns nothing: it hands you cell values and tagged points, and you paint them with a Tilemap, sprites, 3D shapes or nothing at all. Everything flows from one seedable PRNG, so the same seed reproduces the same floors, the same coin positions and the same decoration scatter on every device and every export platform.

## Table of Contents

1. [Scenarios Where This Addon Excels](#1-scenarios-where-this-addon-excels)
2. [Core Concepts](#2-core-concepts)
3. [Project Setup](#3-project-setup)
4. [Plugin Properties](#4-plugin-properties)
5. [The Grid](#5-the-grid)
6. [Walkers](#6-walkers)
7. [Direction Weights](#7-direction-weights)
8. [Seeding and Determinism](#8-seeding-and-determinism)
9. [Marks](#9-marks)
10. [Post-Processing Passes](#10-post-processing-passes)
11. [Reading the Results](#11-reading-the-results)
12. [Animated Generation](#12-animated-generation)
13. [Save and Load](#13-save-and-load)
14. [Actions Reference](#14-actions-reference)
15. [Conditions Reference](#15-conditions-reference)
16. [Expressions Reference](#16-expressions-reference)
17. [Triggers Reference](#17-triggers-reference)
18. [System Use Cases](#18-system-use-cases)
19. [Game Use Cases](#19-game-use-cases)
20. [C3 Debugger](#20-c3-debugger)
21. [Scripting (C3 Script / JavaScript)](#21-scripting-c3-script--javascript)
22. [Deep Dive: The Determinism Model](#22-deep-dive-the-determinism-model)
23. [Deep Dive: Advanced Random Integration](#23-deep-dive-advanced-random-integration)
24. [Tips and Common Mistakes](#24-tips-and-common-mistakes)

---

## 1. Scenarios Where This Addon Excels

- **Organic, non-rectangular level layouts.** When rooms-and-corridors feels too rigid, a drunkard's walk is the classic answer. Caves, burrows, mines, ant nests, coral and root systems all fall out of a few walkers with the right direction count and turn limit.
- **Daily-seed and shareable-code content.** Because every cell and every placement derives from one seed string, "today's dungeon" or an eight character level code reproduces the entire experience, floors and coins and enemies alike, on every player's device.
- **Layered generation at scale.** Dozens of walkers and mark passes on grids of hundreds of cells per axis run in a single synchronous call, so a 256x256 map with terrain, ore veins, loot and three decoration layers generates inside one frame.
- **Lockstep and replay-safe multiplayer.** Deterministic generation means clients exchange a seed instead of a map, and replays regenerate the world rather than record it.
- **Anything path-shaped, not just dungeons.** A walker with two or three directions and a small max turn is a river, a road, a lightning bolt, a crack in glass or a brush stroke. Same maths, wildly different genres.
- **Animated, watch-it-build generation.** Walkers can be stepped a few cells per tick, so "the map draws itself" title screens and digging animations use the exact same engine that builds the real level.
- **Placement rules you would otherwise hand-roll.** Minimum spacing, "only in open areas", "only against walls" and "roughly every N steps along this path" are parameters here, not nested sub-events full of distance checks.

---

## 2. Core Concepts

### The problem this addon solves

A drunkard's walk is famously simple to describe and famously fiddly to build in event sheets. The naive version, pick a random direction, move, mark the cell, repeat, takes an Array object, a loop and twenty minutes. Then the real requirements arrive. Corridors should wind gently instead of jittering, so you need heading state and a turn-angle clamp instead of `choose(0,90,180,270)`. Diagonal movement should be optional. Walks must stay inside bounds without hugging the border. You need six walkers with different personalities, not one. And every `random()` call you just wrote has made your level unreproducible.

Placement is the same pain in a different costume. Scattering coins "along the path, roughly every eight steps, but not too close together", placing enemies "only in open interior areas" and pushing torches "only against walls" each become their own pass over the Array with their own distance checks. All copy-pasted, all easy to desynchronise from the carve pass, and all consuming `random()` calls in an order you can no longer reason about.

Advanced Drunken Walker replaces that with one contract. You describe walkers and mark passes as data, the plugin executes them deterministically against one seeded random stream, and it hands you the results as iterable cells and tagged marks. Adding a third walker, a fourth decoration pass or a "hard mode uses 40% more enemies" variant becomes a parameter change instead of an event-sheet rewrite, and the seed still reproduces the whole map including placement.

### Key design decisions

**The plugin owns the grid data, you own everything visible.** Advanced Drunken Walker stores cell values and marks. It never draws tiles, spawns objects or sets positions. You read results through triggers and expressions and drive Tilemaps or sprites yourself. This is exactly why it works with any art pipeline.

**One PRNG, one order, total determinism.** All walkers and mark passes consume the same seeded stream in a fixed order: walkers in registration order, then mark passes in call order. The consequence you must internalise is that **the action sequence is part of the seed**. Reordering your generation actions legitimately changes the output. Keeping them stable guarantees identical maps from identical seeds.

**Direction count and max turn are per-walker, not global.** A cave carver with eight directions and a 180 degree max turn coexists on the same grid, in the same run, with a river using three directions and a 45 degree max turn. Walker personality lives in the walker definition, never in plugin properties.

**Generation is on-demand, never automatic.** Nothing runs until you call *Run All Walkers* or step walkers manually. The plugin never regenerates behind your back on layout start or on a seed change.

**Marks are data points, not objects.** A mark is a column, a row and a tag, nothing more. "coin", "enemy_grunt", "torch" and "fern" are just tags you invent. The plugin guarantees their positions and spacing. What a tag means is implemented entirely in your event sheet.

**Hard bounds, soft failure.** A walker can never leave the grid. A step that would exit is re-rolled toward a legal heading, consuming randomness deterministically, so borders repel walkers instead of trapping them. The *Max Grid Size* property caps allocation so a bad expression fails loudly instead of reserving gigabytes.

### Key concepts at a glance

| Term | What it means |
|---|---|
| **Grid** | The rectangular field of integer cell values the plugin generates into. Each plugin instance owns exactly one. |
| **Cell value** | The integer stored in one cell. You decide what the numbers mean: 0 empty, 1 floor, 2 water, and so on. |
| **Walker** | A named agent with a heading that staggers one cell per step, writing its carve value into the cells it visits. |
| **Direction count** | How many evenly spaced headings, 1 to 8, a walker may face. 4 gives cardinal corridors, 8 allows diagonals, 1 walks a straight line. |
| **Max turn** | The largest heading change in degrees a walker may make in one step. Low values wind smoothly, 180 gives classic jittery caves. |
| **Mark** | A tagged point at a column and row, used for coins, enemies, objectives and decorations. |
| **Tag** | A free-form string. On a walker it groups walkers into batches, on a mark it names what the point represents. |

---

## 3. Project Setup

**Step 1: install the addon.** In Construct 3 open *Menu > View > Addon Manager*, click *Install new addon* and pick the `.c3addon` file. Restart the editor when prompted.

**Step 2: add the object.** Double click an empty area of the layout, choose *Advanced Drunken Walker* from the *Other* category, and place it. It is invisible at runtime and never draws anything, so it does not matter where it sits. Name it something short, for example `AdvWalker`, because that name is what you type in expressions.

**Step 3: decide what your cell values mean.** The grid stores plain integers, so pick a convention up front and stick to it. A common one is 0 for empty rock, 1 for floor, 2 for water and 3 for wall.

**Step 4: set the properties.** Leave *Grid Width* and *Grid Height* at 64 for now, set *Cell Size* to match your tilemap tile size, and leave *Empty Value* at 0. Tick *Debug Mode* while you are building so the plugin logs what it is doing.

**Step 5: generate and draw.** The minimum viable setup is four actions and one loop. Create the grid, seed the generator, register a walker, run it, then paint the results.

```
Event: On start of layout
  Action: AdvWalker > Create grid -> 40, 30
  Action: AdvWalker > Set seed -> "hello-world"
  Action: AdvWalker > Add walker -> "cave", 20, 15, 400, 8, 180, ""
  Action: AdvWalker > Run all walkers

Event: AdvWalker > On generation complete
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(1, loopindex), AdvWalker.GetCellRowByIndex(1, loopindex)) to tile 0
  // CountCells(1) is every cell the walker carved. Value 1 is the default carve value.
```

Run the layout and you have a winding cave painted into your Tilemap. Change the seed string and you get a different cave. Change it back and the first cave returns, cell for cell.

**Step 6: check your work.** Open *Debug Layout* rather than *Preview*, select the AdvWalker object in the inspector, and you will see the grid size, the active seed, every registered walker and every mark tag. That panel answers most "why is my map empty" questions in a couple of seconds.

---

## 4. Plugin Properties

| Property | Type | Default | Description |
|---|---|---|---|
| **Grid Width** | Integer | 64 | Columns created at startup, and the fallback *Create Grid* uses when it is called with a width of 0. Minimum 1. |
| **Grid Height** | Integer | 64 | Rows created at startup, and the fallback *Create Grid* uses when it is called with a height of 0. Minimum 1. |
| **Max Grid Size** | Integer | 2048 | Hard cap on both axes. *Create Grid* clamps to this and warns in debug mode. A safety net so a bad expression cannot allocate gigabytes. |
| **Cell Size** | Integer | 32 | Pixel size of one cell. Used only by the four coordinate conversion expressions, never by generation itself. |
| **Origin X** | Float | 0 | Layout X of the grid's top-left corner, for the coordinate expressions. |
| **Origin Y** | Float | 0 | Layout Y of the grid's top-left corner, for the coordinate expressions. |
| **Empty Value** | Integer | 0 | The value a fresh grid is filled with. It is also what out-of-bounds reads return, and the only value *Outline Cells* is allowed to overwrite. |
| **Seed** | String | *(empty)* | Initial seed. Leaving it empty derives one from the clock, which means the first run is not reproducible until you call *Set Seed*. |
| **Random Source** | Combo | Internal seeded | `Internal seeded` uses the built-in PRNG. `Injected` consumes values queued by *Inject Random*, for example from the Advanced Random plugin. |
| **Debug Mode** | Boolean | false | Logs walker lifecycles, boundary re-rolls, clamped grid sizes, failed scatters and injected-queue underruns to the browser console. Turn it off for release. |

A grid always exists, sized from *Grid Width* and *Grid Height*, from the moment the object is created. That means `CellValue` and the grid conditions are safe to call before you have run *Create Grid*, and they will report the empty value rather than error.

Property order is a contract. The runtime reads properties by index, so if you ever fork this addon do not reorder them.

---

## 5. The Grid

The grid is a rectangle of integers. Every cell holds one number and nothing else, which is what keeps the plugin fast and rendering-agnostic. You assign meaning to the numbers.

### Creating and clearing

*Create Grid* allocates a fresh grid filled with the Empty Value. It is destructive on purpose: it throws away the previous grid, **every registered walker and every mark**. Think of it as "start a new level". Passing 0 for either dimension falls back to the *Grid Width* or *Grid Height* property, which is handy when most levels are the same size.

```
Event: On function "NewFloor"
  Action: AdvWalker > Create grid -> 0, 0
  // 0, 0 means "use the Grid Width and Grid Height properties"
  Action: AdvWalker > Set seed -> "run-" & RunSeed & "-floor-" & FloorNumber
```

*Clear Grid* refills every cell with a value you choose but leaves walkers, marks and the random stream untouched. Use it when you want to re-run the same walkers over a blank slate without re-registering them.

*Set Cell* writes a single cell directly. It is deliberately silent: it does **not** fire *On Cell Carved*. That makes it the right tool for pre-placing anchors, such as a guaranteed entrance or a boss room, before the walkers run.

```
Event: On function "PreplaceEntrance"
  Action: AdvWalker > Set cell -> 5, 5, 1
  Action: AdvWalker > Set cell -> 5, 6, 1
  // Carved by hand, so the tilemap painter that listens to On Cell Carved will not see these.
  // Pick them up later with CountCells(1) instead.
```

### Grid space and layout space

The grid knows nothing about pixels until you ask it to convert. *Set Origin* tells it where the top-left corner sits in layout coordinates and how big a cell is, and the four conversion expressions do the rest. Passing 0 for the cell size keeps the current value, so you can move the grid without resizing it.

| Expression | Converts |
|---|---|
| `CellToLayoutX(col)` | Column to the layout X of that cell's **centre** |
| `CellToLayoutY(row)` | Row to the layout Y of that cell's centre |
| `LayoutToCol(x)` | Layout X to the column containing it |
| `LayoutToRow(y)` | Layout Y to the row containing it |

```
Event: On start of layout
  Action: AdvWalker > Set origin -> 0, 0, 32

Event: On Mark placed -> "chest"
  Action: System > Create object Chest on layer "Items" at
          (AdvWalker.CellToLayoutX(AdvWalker.MarkCol), AdvWalker.CellToLayoutY(AdvWalker.MarkRow))
  // Cell centres, so the sprite lands centred in its tile whatever the origin is.
```

`LayoutToCol` and `LayoutToRow` can return coordinates outside the grid, because a point on screen may simply not be over the grid at all. Guard them with *Is Inside Grid* before you use the result.

```
Event: On Mouse clicked
  Condition: AdvWalker > (LayoutToCol(Mouse.X), LayoutToRow(Mouse.Y)) is inside the grid
  Condition: AdvWalker > Cell (AdvWalker.LayoutToCol(Mouse.X), AdvWalker.LayoutToRow(Mouse.Y)) is 1
    Action: System > Set Selected to "walkable floor"
```

### Reading cells

`CellValue(col, row)` returns the value at a cell, or the Empty Value if you ask outside the grid, so it never errors. *Is Cell Value* is the condition form, and it is stricter: out-of-bounds cells match **nothing**, not even the Empty Value. That difference matters when you are testing the border.

`NeighbourCount(col, row, value)` counts how many of the eight surrounding cells hold a value. Off-grid neighbours never match, which means a cell on the grid border always has fewer than eight matching neighbours. That is what makes edge detection and autotiling work without special-casing the border.

```
Event: On function "PaintAutotile"
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: System > Set Col to AdvWalker.GetCellColByIndex(1, loopindex)
    Action: System > Set Row to AdvWalker.GetCellRowByIndex(1, loopindex)
    Action: Tilemap > Set tile (Col, Row) to tile AdvWalker.NeighbourCount(Col, Row, 1)
    // Eight neighbours means "fully enclosed floor", fewer means an edge tile.
```

---

## 6. Walkers

A **walker** is an agent with a position, a heading and a step budget. Each step it decides whether to turn, moves one cell, and writes its carve value into the cell it lands on. Registering a walker does not run it. Running is a separate, explicit action.

### The walker definition

Every walker is built from these fields. Only `id`, `startCol` and `startRow` have no meaningful default.

| Field | Default | Meaning |
|---|---|---|
| `id` | *(required)* | Unique string identifying this walker. Re-using an id replaces that walker in place. |
| `startCol` | 0 | Starting column. |
| `startRow` | 0 | Starting row. |
| `steps` | 400 | Total step budget. |
| `directions` | 8 | How many evenly spaced headings, clamped to 1 to 8. |
| `maxTurn` | 180 | Largest heading change per step in degrees, clamped to 0 to 180. |
| `startAngle` | 0 | Initial heading in degrees. 0 is right, 90 is down, matching Construct's angle system. |
| `turnChance` | 1 | Probability per step, 0 to 1, that the walker considers turning at all. |
| `carveValue` | 1 | The integer written into every visited cell. |
| `brushSize` | 1 | Square brush edge in cells. 1 is a single cell, 3 is a 3x3 centred block. Never rotates. |
| `brushWidth` | *(none)* | Cells dug across the heading, so the corridor width. Setting either this or `brushHeight` switches the walker to the oriented dig rectangle. |
| `brushHeight` | *(none)* | Cells dug along the heading. Positive digs ahead of the walker, negative digs behind it. |
| `weights` | *(none)* | Optional per-direction turn weights. See [Direction Weights](#7-direction-weights). |
| `tag` | `""` | Groups walkers for *Run Walkers By Tag*. |

### Registering walkers

*Add Walker* exposes the seven fields you change most often and takes the defaults for the rest. It is the action you will use ninety percent of the time.

```
Event: On function "BuildCave"
  Action: AdvWalker > Add walker -> "main", 32, 32, 600, 8, 180, "cave"
  // 8 directions with a 180 degree max turn is the classic jittery cave carver.
```

*Define Walker* takes the whole definition as a JSON string, which is how you reach `startAngle`, `turnChance`, `carveValue`, `brushSize` and `weights`. Anything you leave out of the JSON falls back to the default in the table above.

```
Event: On function "BuildRiver"
  Action: AdvWalker > Define walker -> "{""id"":""river"",""startCol"":0,""startRow"":10,""steps"":300,""directions"":3,""maxTurn"":45,""startAngle"":0,""turnChance"":0.4,""carveValue"":2,""brushSize"":2,""tag"":""water""}"
  // Three directions, a small max turn and a low turn chance gives a wide, lazily meandering river.
```

Remember that in a Construct string literal a double quote is escaped by doubling it. If the JSON fails to parse the walker is skipped and, with Debug Mode on, the console tells you exactly which string was rejected.

*Remove Walker* unregisters a walker. Cells it already carved stay exactly as they are, because carving writes into the grid immediately rather than being replayed at the end.

### How direction count and max turn shape a walk

These two numbers do most of the aesthetic work, so it is worth understanding them together. The **direction set** is `directions` evenly spaced headings starting at `startAngle`. With `directions: 4` and `startAngle: 0` the walker may face right, down, left or up. With `directions: 8` it also gets the four diagonals. Movement is quantised to the eight grid neighbours, so a heading always resolves to one of the surrounding cells.

`maxTurn` then decides which members of that set are reachable from where the walker is already pointing. This is the difference between a scribble and a path.

| Directions | Max turn | Result |
|---|---|---|
| 1 | *(ignored)* | A dead straight line. Stops early when it hits a wall. |
| 2 | 0 to 180 | Back-and-forth along one axis, or a lightning-bolt zigzag. |
| 3 | 45 | Rivers, roads and cracks. Gentle, mostly forward. |
| 4 | 90 | Cardinal corridors with no diagonals. Hand-hewn dungeon look. |
| 8 | 45 | Smoothly winding tunnels. |
| 8 | 180 | Classic jittery drunkard's-walk cavern. |

`turnChance` is the third dial and it is the one people forget. At the default of 1 the walker considers turning on every single step, so even a small `maxTurn` produces a curly path because the heading itself performs a random walk. Drop it to 0.15 and the walker mostly keeps going, turning occasionally, which is what actually reads as a road or a river.

```
Event: On function "BuildRoad"
  Action: AdvWalker > Define walker -> "{""id"":""road"",""startCol"":0,""startRow"":8,""steps"":200,""directions"":8,""maxTurn"":45,""turnChance"":0.15}"
  // maxTurn 45 alone still scribbles. The low turnChance is what makes it a road.
```

### Brush size

`brushSize` stamps a square block instead of a single cell, which is how you get corridors wider than one tile without running multiple parallel walkers. Odd sizes centre exactly. Even sizes cannot centre on a square grid, so they extend right and down: a size of 2 covers the walker's cell plus the one to its right, below, and below-right.

The square brush never rotates. A walker with `brushSize` 3 digs the same 3x3 block whether it is heading right or heading down, which is fine for blobby caves but wrong for corridors. For corridors you want the dig size below.

### Dig size

**Dig size** replaces the square brush with a rectangle that **turns with the walker**. You give it two numbers:

- **Width** is measured *across* the direction the walker faces. This is the corridor width, and it is always centred.
- **Depth** is measured *along* that direction, and it is signed. Positive digs ahead of the walker, negative digs behind it.

A walker facing right with a dig size of 3 wide by 1 deep carves a vertical slice three cells tall. Turn the same walker to face down and it carves a horizontal slice three cells wide. The corridor keeps its width through every corner, which a square brush cannot do.

```
Event: On function "DigTunnel"
  Action: AdvWalker > Add walker -> "tunnel", 4, 20, 300, 4, 90, ""
  Action: AdvWalker > Set walker "tunnel" dig size to 5 wide by 1 deep
  Action: AdvWalker > Run walker -> "tunnel"
  // A five cell wide tunnel that stays five cells wide around every turn.
```

Facing right with a 3 wide, 1 deep dig, against the same walk with a plain 3x3 square brush:

```
dig size 3 x 1              brushSize 3
....................        ....................
..#################.        .###################
..#################.        .###################
..#################.        .###################
....................        ....................
```

They look identical on a straight run. The difference shows at corners, where the square brush keeps its axis alignment and the dig rectangle rotates.

### Depth is signed

Depth is the dial for how much material comes out along the heading, and its **sign chooses which side of the walker it comes from**.

- A **positive** depth digs **forward**, starting at the walker's own cell.
- A **negative** depth digs **behind** it, again including its own cell.
- So `1` and `-1` both mean "just this cell", and the sign only starts to matter from 2 upward.

With the walker parked at column 10 facing right:

```
depth  1   ..........#...........   just its own cell
depth  5   ..........#####.......   its cell plus four ahead
depth -5   ......#####...........   its cell plus four behind
```

Forward depth is a boring machine: it clears the ground the walker is about to walk into, so the tunnel opens up ahead of it. Negative depth is the opposite, a trailing dig that widens the ground already behind it, which is useful when you want the mouth of a tunnel to flare out or a machine that back-fills a chamber as it retreats.

```
Event: On function "BoreAhead"
  Action: AdvWalker > Add walker -> "bore", 10, 10, 60, 8, 45, ""
  Action: AdvWalker > Set walker "bore" dig size to 7 wide by 5 deep
  Action: AdvWalker > Run walker -> "bore"
  // Clears a 7 by 5 block ahead of itself as it advances, cutting a broad hall.

Event: On function "FlareTheEntrance"
  Action: AdvWalker > Add walker -> "mouth", 2, 20, 30, 1, 0, ""
  Action: AdvWalker > Set walker "mouth" dig size to 9 wide by -4 deep
  Action: AdvWalker > Run walker -> "mouth"
  // Digs backward, so the opening is widest behind the walker and tapers as it goes in.
```

Width has no front and back, so it is always centred and its sign is ignored. `9` and `-9` both give a nine cell wide corridor.

You can set the dig size in a *Define Walker* definition too, with `brushWidth` and `brushHeight`.

```
Action: AdvWalker > Define walker -> "{""id"":""tunnel"",""startCol"":4,""startRow"":20,""steps"":300,""directions"":4,""maxTurn"":90,""brushWidth"":5,""brushHeight"":1}"
```

Supplying only one of the two is fine. The other falls back to `brushSize`, so `brushWidth: 1` with `brushSize: 3` gives a one cell wide dig that reaches three cells along the heading.

Passing 0 for a dimension falls back to `brushSize` for that axis, and 0 for both restores the plain square brush. That makes the action a clean toggle rather than a one-way door. Note that 0 is the reset, not a negative: negatives are meaningful on the depth axis.

```
Event: On function "StopBoring"
  Action: AdvWalker > Set walker "bore" dig size to 0 wide by 0 deep
  // Back to the ordinary square brush.
```

Because dig size is live state on the walker, you can change it partway through a walk to widen or narrow the tunnel as it goes.

```
Event: On function "NarrowingShaft"
  Action: AdvWalker > Add walker -> "shaft", 30, 2, 180, 8, 90, ""
  Action: AdvWalker > Set walker "shaft" dig size to 7 wide by 1 deep
  Action: AdvWalker > Step walker "shaft" by 40
  Action: AdvWalker > Set walker "shaft" dig size to 3 wide by 1 deep
  Action: AdvWalker > Step walker "shaft" by 40
  Action: AdvWalker > Set walker "shaft" dig size to 1 wide by 1 deep
  Action: AdvWalker > Run walker -> "shaft"
  // The shaft starts as a wide entrance and tapers to a crawlspace.
```

On a diagonal heading the rectangle is rotated 45 degrees, which no longer lines up with the grid. The plugin fills it solidly rather than leaving the lattice of holes a naive rotation would produce, so a diagonal corridor is continuous. It will look wider measured along a grid row than a cardinal one of the same width, because a 45 degree corridor genuinely crosses more cells per row.

Dig size never consumes randomness, so switching a walker to it does not change anything else the seed produces.

### Running walkers

| Action | What it runs | Triggers it fires |
|---|---|---|
| *Run All Walkers* | Every registered walker, in registration order | *On Cell Carved*, *On Walker Finished*, then *On Generation Complete* |
| *Run Walkers By Tag* | Every walker carrying the tag, in registration order | *On Cell Carved*, *On Walker Finished*, then *On Walkers By Tag Complete* |
| *Run Walker* | One walker by id | *On Cell Carved*, *On Walker Finished*. **Not** *On Generation Complete* |
| *Step Walker* | One walker, up to N steps | *On Walker Stepped* per step, *On Walker Finished* when the budget runs out |

Tags let you stage generation in passes, which matters because later passes can react to what earlier ones carved.

```
Event: On function "Generate"
  Action: AdvWalker > Add walker -> "cave1", 20, 20, 500, 8, 180, "cave"
  Action: AdvWalker > Add walker -> "cave2", 40, 30, 500, 8, 180, "cave"
  Action: AdvWalker > Define walker -> "{""id"":""river"",""startCol"":0,""startRow"":5,""steps"":200,""directions"":3,""maxTurn"":45,""carveValue"":2,""tag"":""water""}"
  Action: AdvWalker > Run walkers tagged -> "cave"
  Action: AdvWalker > Outline cells -> 1, 3
  Action: AdvWalker > Run walkers tagged -> "water"
  // The caves get their walls before the river runs, so the river cuts through finished rock.
```

An empty tag is not a wildcard here: *Run Walkers By Tag* with an empty string runs only the walkers that have no tag.

### Boundaries and early endings

A walker can never step off the grid. When the heading it picked would take it outside, the plugin re-rolls among the headings that stay in bounds, consuming one more random value. Borders therefore repel walkers rather than trapping them against the edge.

If **no** heading is legal, which happens to a one-direction walker facing a wall or to any walker boxed into a 1x1 grid, the walker ends early. It still fires *On Walker Finished*, so chaining logic never stalls. A walker whose start cell is outside the grid carves nothing at all and finishes immediately.

```
Event: AdvWalker > On walker "" finished
  Condition: System > AdvWalker.WalkerID = "corridor"
  Condition: System > AdvWalker.WalkerCol < 30
    Action: System > Set NeedsRetry to 1
    // The corridor did not reach the far side, so this seed is a dud. Retry with the next sub-seed.
```

Chaining walkers off each other's endpoints is the idiomatic way to grow branching structures.

```
Event: AdvWalker > On walker "trunk" finished
  Action: AdvWalker > Add walker -> "branch", AdvWalker.WalkerCol, AdvWalker.WalkerRow, 120, 8, 180, "branch"
  Action: AdvWalker > Run walker -> "branch"
  // WalkerCol and WalkerRow are the trunk's final cell, so the branch starts where it stopped.
```

---

## 7. Direction Weights

By default a walker picks evenly among the headings it can reach. **Direction weights** bias that choice, which turns a wandering walker into one that has a preferred direction while still wandering.

*Set Walker Direction Weights* takes a comma separated list of relative weights, one per direction, **in direction order**. Entry 0 is the walker's `startAngle` and each entry after it follows clockwise around the direction set. The numbers are relative, so `"2,1"` and `"20,10"` behave identically.

- A weight of **0** rules that direction out entirely.
- Any entry you **leave off** counts as 1, so `"6,3"` on an eight direction walker weights the first two and leaves the other six at 1.
- **Negative** values are floored to 0, and non-numeric entries fall back to 1.
- An **empty string** restores equal weights.

```
Event: On function "BuildDescendingVein"
  Action: AdvWalker > Add walker -> "vein", 30, 0, 400, 8, 180, "ore"
  Action: AdvWalker > Set walker "vein" direction weights -> "1,4,9,4,1,0,0,0"
  Action: AdvWalker > Run walker -> "vein"
  // Direction 2 is 90 degrees, straight down, and carries the heaviest weight.
  // The last three weights are 0, so the vein can never head back upward.
```

For an eight direction walker with `startAngle` 0, the indices map to compass headings like this.

| Index | Heading | Direction on screen |
|---|---|---|
| 0 | 0 | Right |
| 1 | 45 | Down-right |
| 2 | 90 | Down |
| 3 | 135 | Down-left |
| 4 | 180 | Left |
| 5 | 225 | Up-left |
| 6 | 270 | Up |
| 7 | 315 | Up-right |

Change `startAngle` and the whole table rotates, because index 0 is always the start angle.

Weights interact with `maxTurn` rather than replacing it. `maxTurn` decides which directions are reachable this step, then the weights decide which of those reachable directions wins. If every reachable direction has a weight of 0 the walker falls back to an even pick instead of deadlocking, so a walker can never get stuck because of its weights.

You can also set weights inside a *Define Walker* JSON string using a `weights` array, which is convenient when the walker is data-driven.

```
Action: AdvWalker > Define walker -> "{""id"":""vein"",""startCol"":30,""startRow"":0,""steps"":400,""weights"":[1,4,9,4,1,0,0,0]}"
```

Weights survive save and load, and the weighted pick consumes exactly one random value whether or not weights are set, so adding weights to a walker does not shift the rest of the random stream.

---

## 8. Seeding and Determinism

*Set Seed* resets the internal generator from a string. Any string works, and strings that differ by a single character produce completely unrelated maps, so `"level-1"` and `"level-2"` will not look like siblings.

```
Event: On start of layout
  Action: AdvWalker > Set seed -> RunSeed & "-floor-" & FloorNumber
  // One master run seed plus the floor number gives every floor its own reproducible layout.
```

The rule that governs everything else is that **the order of your generation actions is part of the seed**. The same seed with the same actions in the same order produces byte-identical output. Insert an extra walker, or swap two *Scatter Marks* calls, and the output legitimately changes from that point onward. This is not a bug to work around, it is what makes the system predictable. Build your generation as one function that always runs its actions in the same order, and vary the seed rather than the sequence.

If you leave the *Seed* property empty, the plugin derives a seed from the clock at startup and stores it. `CurrentSeed` will report that derived value, so you can still show it to the player or save it, but the first generation of a session is not reproducible until you call *Set Seed* yourself.

```
Event: On function "ShowSeedToPlayer"
  Action: Text > Set text to "Seed: " & AdvWalker.CurrentSeed
  // Works whether the seed came from Set Seed or was derived from the clock.
```

*Set Random Source* switches between the built-in generator and an injected queue. See [Deep Dive: Advanced Random Integration](#23-deep-dive-advanced-random-integration) for when that is worth doing.

Note that *Create Grid* does not reset the seed, and *Set Seed* does not clear the grid. They are independent on purpose, so you can re-seed and re-run without reallocating, or reallocate without disturbing the stream.

---

## 9. Marks

A **mark** is a tagged point on the grid. The plugin decides where marks go and guarantees their spacing. You decide what each tag means when you read the results back.

### Dropping marks along a walk

*Drop Marks Along Walk* replays a walker's recorded path and considers a candidate every N steps. Each candidate is kept with the given chance and then rejected if it lands too close to an existing mark of the same tag. The walker must have run already, because the path is recorded as it walks.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Drop "ammo" marks along walker "main" every 10 steps, chance 0.5, min spacing 4
  // A candidate every 10 steps, half of them kept, never two within 4 cells of each other.
```

Candidates start at step N rather than at the walk's start cell, so the first possible mark appears after the walker has actually travelled. Because the path is recorded per step, a walker that doubled back over itself gets multiple candidates in the same area, and the minimum spacing is what stops them piling up.

### Scattering marks over a region

*Scatter Marks* places up to a number of marks on cells holding a particular value. The **placement** rule filters which of those cells are eligible.

| Placement | Requires | Good for |
|---|---|---|
| **Any** | Nothing beyond the cell value | General scatter, ground clutter |
| **Interior** | All 8 neighbours hold the value | Enemies, objectives, anything needing open space |
| **Edge** | At least one neighbour differs or is off-grid | Torches, doors, foliage, anything hugging a wall |

Because off-grid neighbours never match, a cell on the grid border can never be interior and is always an edge cell.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Scatter 12 "enemy" marks on cells valued 1, placement Interior, min spacing 6
  Action: AdvWalker > Scatter 30 "torch" marks on cells valued 1, placement Edge, min spacing 2
  Action: AdvWalker > Scatter 1 "exit" marks on cells valued 1, placement Interior, min spacing 0
  // Enemies need room, torches want walls, and the exit just needs somewhere open.
```

The count is a maximum, not a promise. If the spacing is too tight for the space available the plugin places as many as it can fit and, with Debug Mode on, logs how many it managed. That is the first thing to check when you asked for 50 enemies and got 11.

### Spacing rules

Minimum spacing is a Euclidean distance measured in cells, and it only ever applies **between marks of the same tag**. Coins and enemies never crowd each other out, because they are separate tags with separate spacing.

A spacing of 0 still prevents two marks of the same tag stacking on a single cell, so you never get a double coin by accident.

Spacing also takes existing marks into account, not just the ones placed by the current call. Two consecutive scatter passes with the same tag will respect each other.

```
Event: On function "PlaceLoot"
  Action: AdvWalker > Scatter 10 "chest" marks on cells valued 1, placement Interior, min spacing 8
  Action: AdvWalker > Drop "chest" marks along walker "main" every 25 steps, chance 1, min spacing 8
  // The second pass sees the first pass's chests and keeps its distance from them.
```

### Reading and clearing marks

*Has Mark At* asks whether a mark sits on a cell. An empty tag matches any mark, which is the quick way to ask "is anything already here".

*Clear Marks* removes every mark with a tag, and an empty tag clears all of them. It does not touch the grid, so clearing marks and re-scattering is cheap.

```
Event: On function "RerollEnemies"
  Action: AdvWalker > Clear marks tagged -> "enemy"
  Action: AdvWalker > Scatter 12 "enemy" marks on cells valued 1, placement Interior, min spacing 6
  // The grid is untouched. Only the enemy placement is regenerated.
```

---

## 10. Post-Processing Passes

Two actions reshape the grid after the walkers have run. Both fire *On Cell Carved* for every cell they change, and both report an empty `WalkerID` because no walker was responsible.

### Dilate Cells

*Dilate Cells* grows every region of a value outward by one ring per iteration. It is how you turn one-cell-wide corridors into chambers, and how you soften a walk that came out too spindly.

Any cell that does not already hold the value but touches one that does, in any of the eight directions, is converted. That includes cells holding **other** values, so dilating your floor value will eat into water or ore where they touch. Run dilation before you carve anything you want to preserve, or dilate first and layer afterwards.

```
Event: On function "WidenCaves"
  Action: AdvWalker > Run walkers tagged -> "cave"
  Action: AdvWalker > Dilate cells valued 1 by 1 iterations
  Action: AdvWalker > Run walkers tagged -> "water"
  // Dilate the caves before the rivers exist, so the rivers survive intact.
```

Each iteration is computed from a snapshot, so a single pass grows exactly one ring rather than smearing across the grid in the scan direction. Two iterations grow two rings, which on a one-cell corridor produces a five-cell-wide hall, so increase this number carefully.

### Outline Cells

*Outline Cells* writes an outline value into every Empty Value cell that touches a cell holding your target value. This is the classic "put walls around the floor" pass.

Unlike dilation, outlining only ever overwrites cells holding the **Empty Value**. It will never eat your water, ore or any other terrain, which makes it safe to run last.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Outline cells valued 1 with 3
  // Every empty cell touching a floor cell becomes a wall. Water and ore are left alone.
```

Because the outline value is just another integer, you can outline more than once with different values to build layered borders, for example a wall ring and then a shadow ring outside it.

```
Event: On function "LayeredWalls"
  Action: AdvWalker > Outline cells valued 1 with 3
  Action: AdvWalker > Outline cells valued 3 with 4
  // Value 3 is the wall, value 4 is the shadow just outside it.
```

---

## 11. Reading the Results

There are two ways to get the generated world out of the plugin, and picking the right one matters for performance.

### Iterating after generation, the fast path

`CountCells(value)` tells you how many cells hold a value, and `GetCellColByIndex` / `GetCellRowByIndex` walk that set in a stable row-major order. Marks work the same way with `CountMarks`, `GetMarkColByIndex` and `GetMarkRowByIndex`, in placement order. Out-of-range indices return -1 rather than erroring.

```
Event: AdvWalker > On generation complete
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(1, loopindex), AdvWalker.GetCellRowByIndex(1, loopindex)) to tile 0
  Action: System > Repeat AdvWalker.CountCells(3) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(3, loopindex), AdvWalker.GetCellRowByIndex(3, loopindex)) to tile 1
  Action: System > Repeat AdvWalker.CountMarks("enemy") times
    Action: System > Create object Enemy on layer "Game" at
            (AdvWalker.CellToLayoutX(AdvWalker.GetMarkColByIndex("enemy", loopindex)),
             AdvWalker.CellToLayoutY(AdvWalker.GetMarkRowByIndex("enemy", loopindex)))
```

`CountMarks("")` with an empty tag counts every mark regardless of tag, and the index expressions accept an empty tag the same way, so you can iterate the complete mark list when you want a single dispatcher.

```
Event: On function "SpawnEverything"
  Action: System > Repeat AdvWalker.CountMarks("") times
    Action: System > Set Tag to ... // read the tag with your own lookup, or iterate per tag instead
```

Prefer iterating per tag. The mark index expressions give you positions, not tags, so a single loop over all marks cannot tell you what each one is.

### Reacting per cell, the convenient path

*On Cell Carved* fires once for every cell whose value actually changes. A walker re-crossing ground it already carved does not fire it again, because nothing changed. Inside the trigger, `CarvedCol`, `CarvedRow` and `CarvedValue` describe the cell and `WalkerID` names the responsible walker, or is empty for dilation and outlining.

```
Event: AdvWalker > On cell carved
  Condition: System > AdvWalker.CarvedValue = 1
    Action: Tilemap > Set tile (AdvWalker.CarvedCol, AdvWalker.CarvedRow) to tile 0

Event: AdvWalker > On cell carved
  Condition: System > AdvWalker.WalkerID = ""
    Action: Tilemap > Set tile (AdvWalker.CarvedCol, AdvWalker.CarvedRow) to tile 5
    // Empty WalkerID means this cell came from Dilate or Outline, not from a walker.
```

This is convenient and it is fine for small grids, but it fires a full Construct event for every carved cell. Past roughly ten thousand carved cells, the iterate-after-generation pattern is markedly faster. Use *On Cell Carved* for reactive effects and animated generation, and use the Count plus Index loop for bulk painting.

### Which trigger fires when

| You called | Per-cell | Per-walker | At the end |
|---|---|---|---|
| *Run All Walkers* | *On Cell Carved* | *On Walker Finished* | *On Generation Complete* |
| *Run Walkers By Tag* | *On Cell Carved* | *On Walker Finished* | *On Walkers By Tag Complete* |
| *Run Walker* | *On Cell Carved* | *On Walker Finished* | nothing |
| *Step Walker* | *On Cell Carved* | *On Walker Finished* | *On Walker Stepped* per step |
| *Dilate Cells* / *Outline Cells* | *On Cell Carved* | nothing | nothing |
| *Set Cell* / *Clear Grid* | nothing | nothing | nothing |

All the filtered triggers treat an empty filter string as "match everything".

---

## 12. Animated Generation

*Step Walker* advances one walker by up to N steps instead of running it to completion. Call it every tick and the map draws itself in front of the player, using the exact same engine and the exact same seed as an instant generation would.

```
Event: On start of layout
  Action: AdvWalker > Create grid -> 60, 40
  Action: AdvWalker > Set seed -> "title-screen"
  Action: AdvWalker > Add walker -> "show", 30, 20, 900, 8, 180, ""

Event: Every tick
  Action: AdvWalker > Step walker "show" by 3
  // Three cells per tick. The walk is identical to running it instantly, just spread over time.

Event: AdvWalker > On walker "show" stepped
  Action: Tilemap > Set tile (AdvWalker.WalkerCol, AdvWalker.WalkerRow) to tile 0
  Action: Sprite_Digger > Set position to (AdvWalker.CellToLayoutX(AdvWalker.WalkerCol), AdvWalker.CellToLayoutY(AdvWalker.WalkerRow))
  Action: Sprite_Digger > Set angle to AdvWalker.WalkerAngle degrees
  // WalkerAngle is the heading in degrees, so the digger sprite faces where it is going.

Event: AdvWalker > On walker "show" finished
  Action: System > Go to layout "Menu"
```

*On Walker Stepped* fires only from *Step Walker*. Batch runs skip it deliberately, because firing a Construct event per step would make bulk generation far slower. Inside it, `WalkerCol`, `WalkerRow`, `WalkerAngle` and `WalkerStepsLeft` are all valid.

`WalkerStepsLeft` is the natural driver for a progress bar.

```
Event: AdvWalker > On walker "show" stepped
  Action: ProgressBar > Set width to 400 * (1 - AdvWalker.WalkerStepsLeft / 900)
```

Stepping and batch running mix freely. A common pattern is to animate the hero walker for show and then run the rest instantly once it has finished.

```
Event: AdvWalker > On walker "show" finished
  Action: AdvWalker > Run walkers tagged -> "detail"
  Action: AdvWalker > Scatter 20 "gem" marks on cells valued 1, placement Any, min spacing 3
```

Because *Step Walker* carves the start cell on the walker's very first step, you do not need a separate "place the walker" action. The first call handles it.

---

## 13. Save and Load

The plugin fully supports Construct's built-in save and load system. A save captures the grid buffer, the origin and cell size, the seed, **the PRNG state**, every registered walker including its progress along its path, and every mark.

That PRNG state is the important part. Because it round-trips, generation that continues after a load stays on exactly the same random stream it would have been on without the save. A half-finished *Step Walker* animation resumes and produces the identical remaining path.

```
Event: On function "QuickSave"
  Action: System > Save game to slot "quick"

Event: On loaded
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(1, loopindex), AdvWalker.GetCellRowByIndex(1, loopindex)) to tile 0
  // The grid came back with the save. Repaint from it, do not regenerate.
```

Loading restores state silently. It does **not** replay *On Cell Carved* or *On Mark Placed* for the restored content, which is why you repaint from the Count plus Index expressions after a load rather than relying on triggers.

For games that regenerate rather than store, you often do not need the grid in the save at all. Saving just the seed and the floor number and regenerating on load is smaller and faster, and it is only possible because generation is deterministic.

```
Event: On loaded
  Action: AdvWalker > Create grid -> 64, 64
  Action: AdvWalker > Set seed -> RunSeed & "-floor-" & FloorNumber
  Action: System > Call function "RegisterWalkers"
  Action: AdvWalker > Run all walkers
  // Identical output to the original session, from two saved numbers.
```

---

## 14. Actions Reference

### Grid

| Action | Description |
|---|---|
| **Create Grid** | Allocates a fresh grid filled with the Empty Value, clamped to Max Grid Size. Pass 0 for a dimension to use the property default. Destroys the previous grid, all walkers and all marks. |
| **Clear Grid** | Refills every cell with a value you choose. Leaves walkers, marks and the random stream alone, and does not fire On Cell Carved. |
| **Set Cell** | Writes one cell directly. Silent, so it does not fire On Cell Carved. Use it to pre-place anchors before the walkers run. |
| **Set Origin** | Moves the grid in layout space and optionally changes the cell size, for the coordinate expressions. Pass 0 for the cell size to keep the current one. |

### Randomness

| Action | Description |
|---|---|
| **Set Seed** | Resets the generator from a seed string. Call it before generation. The same seed with the same action order reproduces identical output. |
| **Set Random Source** | Switches between the built-in seeded generator and the injected queue filled by Inject Random. |
| **Inject Random** | Queues one value between 0 and 1 for injected mode, for example `AdvancedRandom.Random`. Running out mid-generation falls back to the internal generator and warns in debug mode. |

### Walkers

| Action | Description |
|---|---|
| **Add Walker** | Registers a walker with the seven most common settings. Everything else takes its default. Re-using an id replaces that walker without changing its place in the run order. |
| **Define Walker** | Registers a walker from a full JSON definition, which is how you reach start angle, turn chance, carve value, brush size and weights. |
| **Set Walker Dig Size** | Switches a walker from its square brush to a rectangle that turns with it. Width across the heading is the corridor width and is always centred; depth along the heading is signed, digging ahead of the walker when positive and behind it when negative. 0 for both restores the square brush. |
| **Set Walker Direction Weights** | Biases which direction a walker turns toward, as a comma separated list of relative weights in direction order. An empty string restores equal weights. |
| **Remove Walker** | Unregisters a walker. Anything it already carved stays in the grid. |
| **Run All Walkers** | Runs every registered walker to the end of its budget in registration order, then fires On Generation Complete. |
| **Run Walkers By Tag** | Runs only the walkers carrying a tag, then fires On Walkers By Tag Complete. An empty tag runs only untagged walkers. |
| **Run Walker** | Runs one walker to completion by id. Does not fire On Generation Complete. |
| **Step Walker** | Advances one walker by up to N steps, for animated generation. Fires On Walker Stepped per step. |

### Marks

| Action | Description |
|---|---|
| **Drop Marks Along Walk** | Places tagged marks along a finished walker's recorded path, considering a candidate every N steps and keeping each one with a given chance. |
| **Scatter Marks** | Places up to a number of tagged marks on cells holding a value, filtered by placement and thinned by minimum spacing. |
| **Clear Marks** | Removes every mark carrying a tag. An empty tag removes all marks. Leaves the grid untouched. |

### Post-Processing

| Action | Description |
|---|---|
| **Dilate Cells** | Grows every region of a value outward by one ring per iteration, widening corridors into chambers. Converts any neighbouring cell, including ones holding other values. |
| **Outline Cells** | Writes an outline value into every Empty Value cell touching a cell of the target value. The classic walls-around-the-floor pass, and safe for other terrain. |

---

## 15. Conditions Reference

| Condition | Description |
|---|---|
| **Is Cell Value** | True when the cell holds exactly that value. Out-of-bounds cells match nothing, not even the Empty Value. |
| **Is Inside Grid** | True when the column and row fall within the current grid. |
| **Has Mark At** | True when a mark with the tag sits on that cell. An empty tag matches any mark. |
| **Has Walker** | True when a walker with that id is currently registered. |

---

## 16. Expressions Reference

| Expression | Returns | Description |
|---|---|---|
| `CellValue(col, row)` | Number | Value at the cell. Returns the Empty Value for out-of-bounds queries rather than erroring. |
| `GridCols` | Number | Current grid width in cells. |
| `GridRows` | Number | Current grid height in cells. |
| `NeighbourCount(col, row, value)` | Number | How many of the 8 neighbours hold the value. Off-grid neighbours never match, which is what makes border detection work. |
| `CellToLayoutX(col)` | Number | Layout X of that cell's centre, from Origin X and Cell Size. |
| `CellToLayoutY(row)` | Number | Layout Y of that cell's centre, from Origin Y and Cell Size. |
| `LayoutToCol(x)` | Number | Column containing that layout X. May fall outside the grid. |
| `LayoutToRow(y)` | Number | Row containing that layout Y. May fall outside the grid. |
| `CountCells(value)` | Number | How many cells currently hold the value. Pairs with the two index expressions below. |
| `GetCellColByIndex(value, index)` | Number | Column of the index-th cell holding the value, 0-based in a stable row-major order. Returns -1 out of range. |
| `GetCellRowByIndex(value, index)` | Number | Row of the index-th cell holding the value. Returns -1 out of range. |
| `CountMarks(tag)` | Number | Marks carrying the tag. An empty tag counts every mark. |
| `GetMarkColByIndex(tag, index)` | Number | Column of the index-th mark with the tag, 0-based in placement order. Returns -1 out of range. |
| `GetMarkRowByIndex(tag, index)` | Number | Row of the index-th mark with the tag. Returns -1 out of range. |
| `CurrentSeed` | String | The seed the generator was last set with, including one derived from the clock. |
| `WalkerCol` | Number | Current column of the triggering walker. Reads 0 outside walker triggers. |
| `WalkerRow` | Number | Current row of the triggering walker. Reads 0 outside walker triggers. |
| `WalkerAngle` | Number | Current heading of the triggering walker in degrees, 0 right and 90 down. |
| `WalkerStepsLeft` | Number | Remaining step budget of the triggering walker. |
| `WalkerID` | String | Id of the triggering walker. Empty inside post-processing passes and outside triggers. |
| `WalkerTag` | String | Tag of the triggering walker, or the batch tag inside On Walkers By Tag Complete. |
| `CarvedCol` | Number | Column of the cell just written, inside On Cell Carved. |
| `CarvedRow` | Number | Row of the cell just written, inside On Cell Carved. |
| `CarvedValue` | Number | Value just written into the cell, inside On Cell Carved. |
| `MarkCol` | Number | Column of the mark just placed, inside On Mark Placed. |
| `MarkRow` | Number | Row of the mark just placed, inside On Mark Placed. |
| `MarkTag` | String | Tag of the mark just placed, inside On Mark Placed. |

The context expressions in the lower half of the table are only meaningful inside their own trigger. Outside it they read 0 or an empty string rather than stale data.

---

## 17. Triggers Reference

| Trigger | Description |
|---|---|
| **On Cell Carved** | Fires once per cell whose value actually changes, during walker runs, dilation and outlining. Read `CarvedCol`, `CarvedRow`, `CarvedValue` and `WalkerID` inside. |
| **On Walker Stepped** | Fires after each step of *Step Walker* only. Batch runs skip it for speed. Filtered by walker id, empty matches all. |
| **On Walker Finished** | Fires when a walker exhausts its budget or runs out of legal moves. `WalkerCol` and `WalkerRow` give its final cell, which is how you chain walkers. |
| **On Mark Placed** | Fires once per mark from *Drop Marks Along Walk* and *Scatter Marks*. Filtered by tag, empty matches all. |
| **On Walkers By Tag Complete** | Fires after a *Run Walkers By Tag* batch finishes. `WalkerTag` holds the batch tag inside it. |
| **On Generation Complete** | Fires after *Run All Walkers* finishes every walker. The idiomatic place to run mark passes and paint the tilemap. |

---

## 18. System Use Cases

These examples are deliberately narrow. Each one isolates a single system so you can see what that system does on its own. Combinations live in the next section.

### Grid system

Owns allocation, direct writes and the mapping between cells and layout pixels.

**Use case: size the grid to the layout instead of hardcoding it.**

*Scenario:* The level should always fill the layout, whatever resolution the layout is set to.

```
Event: On start of layout
  Action: AdvWalker > Set origin -> 0, 0, 32
  Action: AdvWalker > Create grid -> floor(LayoutWidth / 32), floor(LayoutHeight / 32)
  // Cell size and the division must agree, or the grid will not line up with the layout.
```

**Use case: pre-place a guaranteed entrance before generating.**

*Scenario:* Every floor must have a fixed entrance room in the top-left, regardless of what the walkers do.

```
Event: On function "PreplaceEntrance"
  Action: System > For "x" from 2 to 5
    Action: System > For "y" from 2 to 5
      Action: AdvWalker > Set cell -> loopindex("x"), loopindex("y"), 1
  Action: AdvWalker > Add walker -> "main", 4, 4, 500, 8, 180, ""
  // The walker starts inside the pre-placed room, so the cave is always connected to it.
```

*Note:* Set Cell does not fire On Cell Carved, so a tilemap painter driven by that trigger will miss the entrance. Paint from `CountCells` after generation instead, which picks up hand-placed and carved cells alike.

**Use case: turn a mouse position into a grid query.**

*Scenario:* The player hovers the map and you want to show what is under the cursor.

```
Event: Every tick
  Condition: AdvWalker > (AdvWalker.LayoutToCol(Mouse.X), AdvWalker.LayoutToRow(Mouse.Y)) is inside the grid
    Action: TextHover > Set text to "Cell value: " & AdvWalker.CellValue(AdvWalker.LayoutToCol(Mouse.X), AdvWalker.LayoutToRow(Mouse.Y))
  Else
    Action: TextHover > Set text to "Outside the map"
```

### Randomness system

Owns the seed, the stream and where random values come from.

**Use case: a daily seed everyone shares.**

*Scenario:* Every player gets the same dungeon on the same calendar day.

```
Event: On start of layout
  Action: AdvWalker > Set seed -> "daily-" & Date.GetFullYear(Date.Now) & "-" & Date.GetMonth(Date.Now) & "-" & Date.GetDate(Date.Now)
  Action: System > Call function "Generate"
```

**Use case: show and accept a level code.**

*Scenario:* Players can copy a code and paste it to replay someone else's map.

```
Event: AdvWalker > On generation complete
  Action: TextCode > Set text to "Code: " & AdvWalker.CurrentSeed

Event: On button "Load" clicked
  Action: AdvWalker > Create grid -> 64, 64
  Action: AdvWalker > Set seed -> TextInput.Text
  Action: System > Call function "Generate"
  // Create grid first, because it wipes walkers and marks from the previous map.
```

*Note:* Because the seed is a plain string, level codes need no encoding scheme. Whatever the player types is the seed.

### Walker system

Owns registration, run order, stepping and the shape of each walk.

**Use case: three walkers with different personalities on one grid.**

*Scenario:* A cavern, a river through it, and a scattering of small pockets.

```
Event: On function "Generate"
  Action: AdvWalker > Add walker -> "cavern", 32, 32, 700, 8, 180, ""
  Action: AdvWalker > Define walker -> "{""id"":""river"",""startCol"":0,""startRow"":20,""steps"":250,""directions"":3,""maxTurn"":45,""turnChance"":0.3,""carveValue"":2}"
  Action: AdvWalker > Define walker -> "{""id"":""pocket1"",""startCol"":10,""startRow"":50,""steps"":60,""directions"":8,""maxTurn"":180,""brushSize"":2}"
  Action: AdvWalker > Run all walkers
  // Registration order is run order, so the river carves over the cavern and the pocket over both.
```

**Use case: grow a branching tunnel network.**

*Scenario:* A trunk tunnel that sprouts two side branches from wherever it happened to end.

```
Event: On function "Generate"
  Action: AdvWalker > Add walker -> "trunk", 5, 30, 400, 8, 90, ""
  Action: AdvWalker > Run walker -> "trunk"

Event: AdvWalker > On walker "trunk" finished
  Action: AdvWalker > Add walker -> "branchA", AdvWalker.WalkerCol, AdvWalker.WalkerRow, 150, 8, 180, "branch"
  Action: AdvWalker > Add walker -> "branchB", AdvWalker.WalkerCol, AdvWalker.WalkerRow, 150, 8, 180, "branch"
  Action: AdvWalker > Run walkers tagged -> "branch"
```

*Note:* Run Walker does not fire On Generation Complete, so in this pattern you drive the follow-up from On Walker Finished instead.

**Use case: verify a walk reached its goal and retry if not.**

*Scenario:* A tower defence creep road must cross from the left edge to the right edge, and some seeds will fail.

```
Event: On function "TryRoad"
  Action: AdvWalker > Clear grid -> 0
  Action: AdvWalker > Set seed -> BaseSeed & "-try" & Attempt
  Action: AdvWalker > Define walker -> "{""id"":""road"",""startCol"":0,""startRow"":15,""steps"":300,""directions"":3,""maxTurn"":45,""turnChance"":0.25}"
  Action: AdvWalker > Run walker -> "road"

Event: AdvWalker > On walker "road" finished
  Condition: System > AdvWalker.WalkerCol < AdvWalker.GridCols - 3
    Action: System > Add 1 to Attempt
    Action: AdvWalker > Remove walker -> "road"
    Action: System > Call function "TryRoad"
  Else
    Action: System > Call function "PaintRoad"
  // Remove the failed walker before retrying, otherwise Define Walker would replace it in place
  // and the retry would inherit an exhausted step budget.
```

### Direction weights system

Owns the bias in a walker's turn choice.

**Use case: a river that only ever flows downhill.**

*Scenario:* Water should meander but never travel back up the map.

```
Event: On function "CarveRiver"
  Action: AdvWalker > Define walker -> "{""id"":""river"",""startCol"":20,""startRow"":0,""steps"":300,""directions"":8,""maxTurn"":90,""carveValue"":2}"
  Action: AdvWalker > Set walker "river" direction weights -> "2,6,9,6,2,0,0,0"
  Action: AdvWalker > Run walker -> "river"
  // Indices 5, 6 and 7 are the three upward headings, all weighted to zero.
```

**Use case: change a walker's bias partway through its walk.**

*Scenario:* A mine shaft drops straight down for a while, then spreads sideways into a chamber.

```
Event: On function "MineShaft"
  Action: AdvWalker > Add walker -> "shaft", 30, 2, 200, 8, 180, ""
  Action: AdvWalker > Set walker "shaft" direction weights -> "0,1,12,1,0,0,0,0"
  Action: AdvWalker > Step walker "shaft" by 60
  Action: AdvWalker > Set walker "shaft" direction weights -> "6,3,1,3,6,0,0,0"
  Action: AdvWalker > Run walker -> "shaft"
  // Weights are live state, so changing them mid-walk redirects the rest of the walk.
```

*Note:* Weights are relative, so `"0,1,12,1,0,0,0,0"` means "twelve times more likely to go down than diagonally, and never sideways or up".

### Mark system

Owns tagged placement, spacing and the placement rules.

**Use case: loot that follows the path rather than the room.**

*Scenario:* Ammo should appear along the route the player will actually walk, not in dead corners.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Drop "ammo" marks along walker "main" every 12 steps, chance 0.6, min spacing 5
  Action: System > Repeat AdvWalker.CountMarks("ammo") times
    Action: System > Create object Ammo at
            (AdvWalker.CellToLayoutX(AdvWalker.GetMarkColByIndex("ammo", loopindex)),
             AdvWalker.CellToLayoutY(AdvWalker.GetMarkRowByIndex("ammo", loopindex)))
```

**Use case: torches on walls, enemies in the open, from the same grid.**

*Scenario:* Decoration and threat placement need opposite rules.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Scatter 40 "torch" marks on cells valued 1, placement Edge, min spacing 3
  Action: AdvWalker > Scatter 10 "enemy" marks on cells valued 1, placement Interior, min spacing 7
  // Edge means at least one neighbour is not floor. Interior means all eight are.
```

**Use case: react to each mark as it is placed.**

*Scenario:* You want to spawn objects immediately rather than loop afterwards.

```
Event: AdvWalker > On "gem" mark placed
  Action: System > Create object Gem at (AdvWalker.CellToLayoutX(AdvWalker.MarkCol), AdvWalker.CellToLayoutY(AdvWalker.MarkRow))

Event: AdvWalker > On "" mark placed
  Action: System > Add 1 to TotalMarks
  // An empty filter matches every tag, so this counts all of them including the gems above.
```

*Note:* Both handlers fire for a gem. Filtered and unfiltered triggers are independent, not exclusive.

**Use case: reroll only the enemies without touching the map.**

*Scenario:* A "shuffle enemies" debug button, or a difficulty change that keeps the layout.

```
Event: On button "Reroll" clicked
  Action: AdvWalker > Clear marks tagged -> "enemy"
  Action: Enemy > Destroy
  Action: AdvWalker > Scatter EnemyCount "enemy" marks on cells valued 1, placement Interior, min spacing 6
  // The grid is untouched, so walls and floors stay exactly where they were.
```

### Post-processing system

Owns bulk reshaping of the grid after the walkers have run.

**Use case: widen thin corridors into rooms.**

*Scenario:* A one-cell drunkard's walk feels cramped to play in.

```
Event: On function "Generate"
  Action: AdvWalker > Run all walkers
  Action: AdvWalker > Dilate cells valued 1 by 1 iterations
  // One iteration turns a one-cell corridor into three cells wide. Two makes it five.
```

**Use case: walls that respect other terrain.**

*Scenario:* The map has floor and water, and only the floor should get walls.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Outline cells valued 1 with 3
  // Outline only overwrites Empty Value cells, so the water at value 2 is left intact.
```

*Note:* If you need dilation and water together, dilate before you carve the water. Dilation converts any neighbouring cell, water included.

### Results system

Owns getting the generated world back out.

**Use case: paint several terrain layers in one pass.**

*Scenario:* Floor, water and wall all need to reach the tilemap.

```
Event: AdvWalker > On generation complete
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(1, loopindex), AdvWalker.GetCellRowByIndex(1, loopindex)) to tile 0
  Action: System > Repeat AdvWalker.CountCells(2) times
    Action: TilemapWater > Set tile (AdvWalker.GetCellColByIndex(2, loopindex), AdvWalker.GetCellRowByIndex(2, loopindex)) to tile 0
  Action: System > Repeat AdvWalker.CountCells(3) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(3, loopindex), AdvWalker.GetCellRowByIndex(3, loopindex)) to tile 1
```

**Use case: pick a spawn point from the generated floor.**

*Scenario:* The player must start on a floor cell, and you do not know in advance where any are.

```
Event: AdvWalker > On generation complete
  Action: System > Set SpawnIndex to floor(random(AdvWalker.CountCells(1)))
  Action: Player > Set position to
          (AdvWalker.CellToLayoutX(AdvWalker.GetCellColByIndex(1, SpawnIndex)),
           AdvWalker.CellToLayoutY(AdvWalker.GetCellRowByIndex(1, SpawnIndex)))
  // This uses Construct's random(), so the spawn is not part of the plugin's seed.
  // For a reproducible spawn, use a "spawn" mark from Scatter Marks instead.
```

*Note:* That caveat matters more than it looks. Anything you place with Construct's own `random()` breaks reproducibility even though the map itself is deterministic.

### Save and load system

Owns persisting and restoring the whole generator, PRNG state included.

**Use case: store the seed, not the map.**

*Scenario:* Save files should stay tiny, and the world is fully derivable.

```
Event: On function "Save"
  Action: LocalStorage > Set item "seed" to AdvWalker.CurrentSeed
  Action: LocalStorage > Set item "floor" to FloorNumber

Event: LocalStorage > On item "seed" get
  Action: AdvWalker > Create grid -> 64, 64
  Action: AdvWalker > Set seed -> LocalStorage.ItemValue
  Action: System > Call function "RegisterWalkers"
  Action: AdvWalker > Run all walkers
```

**Use case: resume a half-finished animated generation.**

*Scenario:* The player quit during the "map draws itself" intro and expects the same map when they return.

```
Event: On function "QuickSave"
  Action: System > Save game to slot "quick"

Event: On loaded
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(1, loopindex), AdvWalker.GetCellRowByIndex(1, loopindex)) to tile 0
  // The walker's remaining budget and the PRNG state both came back, so the
  // Every tick Step Walker event simply carries on and draws the identical rest of the path.
```

*Note:* Loading restores state silently. It does not replay On Cell Carved or On Mark Placed, which is why you repaint from the Count and Index expressions rather than relying on triggers after a load.

---

## 19. Game Use Cases

### 1. The simplest possible cave

*Scenario:* One walker, one tilemap, nothing else.

```
Event: On start of layout
  Action: AdvWalker > Create grid -> 40, 30
  Action: AdvWalker > Set seed -> "cave-1"
  Action: AdvWalker > Add walker -> "cave", 20, 15, 400, 8, 180, ""
  Action: AdvWalker > Run all walkers

Event: AdvWalker > On generation complete
  Action: System > Repeat AdvWalker.CountCells(1) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(1, loopindex), AdvWalker.GetCellRowByIndex(1, loopindex)) to tile 0
```

### 2. Nuclear Throne style roguelike floor

*Scenario:* A main cavern with two side pockets grown from its endpoint, enemies in the open and ammo along the route.

```
Layer structure:
  Background
  Tilemap
  Game      (player, enemies, pickups)
  UI
```

```
Event: On function "NewFloor"
  Action: AdvWalker > Create grid -> 64, 64
  Action: AdvWalker > Set seed -> RunSeed & "-" & FloorNumber
  Action: AdvWalker > Add walker -> "main", 32, 32, 800, 8, 180, ""
  Action: AdvWalker > Run walker -> "main"

Event: AdvWalker > On walker "main" finished
  Action: AdvWalker > Add walker -> "pocketA", AdvWalker.WalkerCol, AdvWalker.WalkerRow, 150, 8, 180, "pocket"
  Action: AdvWalker > Add walker -> "pocketB", AdvWalker.WalkerCol, AdvWalker.WalkerRow, 150, 8, 180, "pocket"
  Action: AdvWalker > Run walkers tagged -> "pocket"
  Action: AdvWalker > Outline cells valued 1 with 3
  Action: AdvWalker > Scatter 14 "enemy" marks on cells valued 1, placement Interior, min spacing 6
  Action: AdvWalker > Drop "ammo" marks along walker "main" every 10 steps, chance 0.5, min spacing 4
  Action: System > Call function "PaintAndSpawn"
```

*Note:* Restarting the run with the same `RunSeed` reproduces every wall and every enemy on every floor.

### 3. Mining descent with ore veins

*Scenario:* A tall grid of solid rock with narrow veins running downward and gas pockets scattered through it.

```
Event: On function "GeneratePlanet"
  Action: AdvWalker > Create grid -> 128, 512
  Action: AdvWalker > Set seed -> PlanetSeed
  Action: System > For "v" from 0 to 11
    Action: AdvWalker > Define walker -> "{""id"":""vein" & loopindex("v") & """,""startCol"":" & floor(random(128)) & ",""startRow"":" & (30 + loopindex("v") * 40) & ",""steps"":120,""directions"":8,""maxTurn"":90,""carveValue"":2,""tag"":""vein""}"
  Action: AdvWalker > Run walkers tagged -> "vein"
  Action: AdvWalker > Scatter 60 "iron" marks on cells valued 2, placement Any, min spacing 4
```

*Note:* The `random(128)` in the walker definition happens in Construct, not in the plugin, so it breaks reproducibility. Derive the columns from the seed deterministically if speedrunners need identical planets.

### 4. Classic Rogue style dungeon

*Scenario:* Cardinal-only corridors for a hand-hewn look, widened where the walker doubled back, with doors on the edges.

```
Event: On function "Generate"
  Action: AdvWalker > Create grid -> 60, 40
  Action: AdvWalker > Set seed -> "dungeon-" & DepthLevel
  Action: AdvWalker > Add walker -> "halls", 30, 20, 600, 4, 90, ""
  Action: AdvWalker > Run all walkers

Event: AdvWalker > On generation complete
  Action: AdvWalker > Dilate cells valued 1 by 1 iterations
  Action: AdvWalker > Outline cells valued 1 with 3
  Action: AdvWalker > Scatter 8 "door" marks on cells valued 1, placement Edge, min spacing 5
  Action: AdvWalker > Scatter 1 "amulet" marks on cells valued 1, placement Interior, min spacing 0
```

*Note:* Four directions with a 90 degree max turn guarantees no diagonal-only connections, so every floor cell is reachable by orthogonal movement.

### 5. Tower defence creep road

*Scenario:* One organic road from the left edge to the right, with build spots hugging it.

```
Event: On function "BuildMap"
  Action: AdvWalker > Create grid -> 50, 30
  Action: AdvWalker > Set seed -> "map-" & MapOfTheDay
  Action: AdvWalker > Define walker -> "{""id"":""road"",""startCol"":0,""startRow"":15,""steps"":220,""directions"":3,""maxTurn"":45,""turnChance"":0.25,""brushSize"":2}"
  Action: AdvWalker > Set walker "road" direction weights -> "8,3,0"
  Action: AdvWalker > Run walker -> "road"

Event: AdvWalker > On walker "road" finished
  Condition: System > AdvWalker.WalkerCol >= AdvWalker.GridCols - 3
    Action: AdvWalker > Outline cells valued 1 with 3
    Action: AdvWalker > Scatter 30 "buildspot" marks on cells valued 3, placement Any, min spacing 3
  // Build spots scatter on the wall value, so they always hug the road.
```

### 6. Survival island overworld

*Scenario:* Grassland carved out of ocean, rivers cut across it, forest patches stamped on top, and resources placed per biome.

```
Event: On function "GenerateIsland"
  Action: AdvWalker > Create grid -> 128, 128
  Action: AdvWalker > Set seed -> WorldSeed
  Action: AdvWalker > Define walker -> "{""id"":""land1"",""startCol"":64,""startRow"":64,""steps"":1200,""brushSize"":3,""tag"":""land""}"
  Action: AdvWalker > Define walker -> "{""id"":""land2"",""startCol"":50,""startRow"":70,""steps"":900,""brushSize"":3,""tag"":""land""}"
  Action: AdvWalker > Define walker -> "{""id"":""river1"",""startCol"":64,""startRow"":10,""steps"":300,""directions"":3,""maxTurn"":45,""carveValue"":2,""tag"":""river""}"
  Action: AdvWalker > Define walker -> "{""id"":""forest1"",""startCol"":40,""startRow"":40,""steps"":200,""carveValue"":3,""brushSize"":2,""tag"":""forest""}"
  Action: AdvWalker > Run walkers tagged -> "land"
  Action: AdvWalker > Run walkers tagged -> "forest"
  Action: AdvWalker > Run walkers tagged -> "river"
  Action: AdvWalker > Scatter 200 "tree" marks on cells valued 3, placement Any, min spacing 2
  Action: AdvWalker > Scatter 40 "berry" marks on cells valued 1, placement Any, min spacing 6
```

*Note:* Rivers run last so they cut through both grass and forest. Swap the two tag runs and the forest would grow over the rivers instead.

### 7. Animated title screen

*Scenario:* The menu background draws itself while the player reads the title.

```
Event: On start of layout
  Action: AdvWalker > Create grid -> 60, 34
  Action: AdvWalker > Set seed -> "menu"
  Action: AdvWalker > Add walker -> "show", 30, 17, 1200, 8, 180, ""

Event: Every tick
  Action: AdvWalker > Step walker "show" by 4

Event: AdvWalker > On walker "show" stepped
  Action: Tilemap > Set tile (AdvWalker.WalkerCol, AdvWalker.WalkerRow) to tile 0
```

### 8. Deterministic crack VFX in multiplayer

*Scenario:* A pane of glass shatters and every client must see the identical fracture without sending shape data.

```
Event: On function "Shatter" (ImpactCol, ImpactRow, ImpactIndex)
  Action: AdvWalker > Create grid -> 24, 24
  Action: AdvWalker > Set seed -> MatchSeed & "-crack-" & ImpactIndex
  Action: AdvWalker > Define walker -> "{""id"":""crack"",""startCol"":" & ImpactCol & ",""startRow"":" & ImpactRow & ",""steps"":40,""directions"":2,""maxTurn"":20}"
  Action: AdvWalker > Run all walkers

Event: AdvWalker > On cell carved
  Action: System > Create object CrackShard at (AdvWalker.CellToLayoutX(AdvWalker.CarvedCol), AdvWalker.CellToLayoutY(AdvWalker.CarvedRow))
```

*Note:* The grid is throwaway. It exists only long enough to place the shards, and the match seed plus the impact index is all that travels over the wire.

### 9. Ink and calligraphy puzzle

*Scenario:* Each daily puzzle is a glyph the player must reproduce, revealed stroke by stroke.

```
Event: On function "BuildGlyph"
  Action: AdvWalker > Create grid -> 32, 32
  Action: AdvWalker > Set seed -> "glyph-" & DateString
  Action: AdvWalker > Define walker -> "{""id"":""stroke1"",""startCol"":6,""startRow"":6,""steps"":24,""directions"":3,""maxTurn"":45,""turnChance"":0.3,""brushSize"":2}"
  Action: AdvWalker > Define walker -> "{""id"":""stroke2"",""startCol"":24,""startRow"":8,""steps"":20,""directions"":2,""maxTurn"":45,""brushSize"":2}"

Event: Every 0.05 seconds
  Condition: System > RevealStroke = 1
    Action: AdvWalker > Step walker "stroke1" by 1

Event: On function "ScorePlayerStroke" (Col, Row)
  Condition: AdvWalker > Cell (Col, Row) is 1
    Action: System > Add 1 to Score
```

### 10. Garden that grows while you are away

*Scenario:* Each in-game day adds a little growth, and reopening the save replays every missed day deterministically.

```
Event: On function "GrowDay" (DayIndex)
  Action: AdvWalker > Set seed -> GardenSeed & "-day-" & DayIndex
  Action: AdvWalker > Add walker -> "moss" & DayIndex, MossCol, MossRow, 20, 8, 180, ""
  Action: AdvWalker > Run walker -> "moss" & DayIndex
  Action: AdvWalker > Drop "wildflower" marks along walker "moss" & DayIndex every 5 steps, chance 0.4, min spacing 2

Event: On loaded
  Action: System > For "d" from LastSeenDay to CurrentDay
    Action: System > Call function "GrowDay" (loopindex("d"))
  // The garden is never stored. It is replayed from the seed and the day number.
```

*Note:* Do not call Create Grid inside GrowDay. It would wipe every previous day's growth along with the walkers and marks.

### 11. Lightning bolt with branches

*Scenario:* A strike forks two or three times on its way down.

```
Event: On function "Strike" (StartCol)
  Action: AdvWalker > Create grid -> 40, 40
  Action: AdvWalker > Set seed -> "bolt-" & StrikeIndex
  Action: AdvWalker > Define walker -> "{""id"":""bolt"",""startCol"":" & StartCol & ",""startRow"":0,""steps"":40,""directions"":8,""maxTurn"":45}"
  Action: AdvWalker > Set walker "bolt" direction weights -> "1,5,9,5,1,0,0,0"
  Action: AdvWalker > Run walker -> "bolt"

Event: AdvWalker > On cell carved
  Condition: System > random(1) < 0.12
    Action: AdvWalker > Add walker -> "fork" & ForkCount, AdvWalker.CarvedCol, AdvWalker.CarvedRow, 10, 8, 90, "fork"
    Action: System > Add 1 to ForkCount
```

*Note:* Registering a walker from inside On Cell Carved is safe. It joins the registry and runs on the next batch call rather than interrupting the current walk.

### 12. Persistent destructible world

*Scenario:* The player digs into generated rock and the changes must survive a save.

```
Event: On function "Dig" (Col, Row)
  Action: AdvWalker > Set cell -> Col, Row, 1
  Action: Tilemap > Erase tile (Col, Row)
  // Set Cell writes straight into the plugin's grid, so the dig becomes part of the saved state.

Event: On loaded
  Action: Tilemap > Erase all
  Action: System > Repeat AdvWalker.CountCells(0) times
    Action: Tilemap > Set tile (AdvWalker.GetCellColByIndex(0, loopindex), AdvWalker.GetCellRowByIndex(0, loopindex)) to tile 2
```

*Note:* This is the case where you must save the grid rather than just the seed. Player edits are not derivable from a seed.

### 13. Difficulty variants from one layout

*Scenario:* Easy, normal and hard share the same map but not the same enemy density.

```
Event: On function "PlaceEnemies" (Difficulty)
  Action: AdvWalker > Clear marks tagged -> "enemy"
  Action: AdvWalker > Scatter (8 + Difficulty * 6) "enemy" marks on cells valued 1, placement Interior, min spacing (8 - Difficulty * 2)
  // Higher difficulty means more enemies and less breathing room between them.
```

### 14. Guaranteed connected start and exit

*Scenario:* The exit must sit far from the entrance but still on carved ground.

```
Event: AdvWalker > On walker "main" finished
  Action: System > Set ExitCol to AdvWalker.WalkerCol
  Action: System > Set ExitRow to AdvWalker.WalkerRow
  Action: AdvWalker > Set cell -> ExitCol, ExitRow, 4

Event: AdvWalker > On generation complete
  Action: Exit > Set position to (AdvWalker.CellToLayoutX(ExitCol), AdvWalker.CellToLayoutY(ExitRow))
  // The walker's final cell is on the path by definition, so the exit is always reachable.
```

### 15. Two independent generators side by side

*Scenario:* A 256x256 overworld and a small crack-effect grid running at once with unrelated seeds.

```
Event: On start of layout
  Action: WorldGen > Create grid -> 256, 256
  Action: WorldGen > Set seed -> WorldSeed
  Action: CrackGen > Create grid -> 24, 24
  Action: CrackGen > Set seed -> "vfx"
  // Two separate instances of the plugin. Each owns its own grid, walkers, marks and PRNG.
```

*Note:* The object is not single-global, so you can place as many instances as you need. They never share state.

### 16. Fog of war from a second value layer

*Scenario:* Track explored cells without a second Array object.

```
Event: On function "Explore" (Col, Row)
  Action: System > For "dx" from -2 to 2
    Action: System > For "dy" from -2 to 2
      Condition: FogGrid > (Col + loopindex("dx"), Row + loopindex("dy")) is inside the grid
        Action: FogGrid > Set cell -> Col + loopindex("dx"), Row + loopindex("dy"), 1

Event: Every tick
  Action: System > Set ExploredPercent to round(100 * FogGrid.CountCells(1) / (FogGrid.GridCols * FogGrid.GridRows))
```

### 17. Autotiled walls with NeighbourCount

*Scenario:* Wall tiles should pick a variant based on how enclosed they are.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Outline cells valued 1 with 3
  Action: System > Repeat AdvWalker.CountCells(3) times
    Action: System > Set C to AdvWalker.GetCellColByIndex(3, loopindex)
    Action: System > Set R to AdvWalker.GetCellRowByIndex(3, loopindex)
    Action: Tilemap > Set tile (C, R) to tile (10 + AdvWalker.NeighbourCount(C, R, 1))
    // Tiles 10 to 18 are wall variants indexed by how many floor cells touch them.
```

### 18. Boss arena stamped into the map

*Scenario:* A guaranteed open room at the end of the longest walk.

```
Event: AdvWalker > On walker "main" finished
  Action: System > Set BossCol to AdvWalker.WalkerCol
  Action: System > Set BossRow to AdvWalker.WalkerRow
  Action: System > For "x" from -4 to 4
    Action: System > For "y" from -4 to 4
      Action: AdvWalker > Set cell -> BossCol + loopindex("x"), BossRow + loopindex("y"), 1
  // Set Cell clips silently outside the grid, so no bounds check is needed here.
```

*Note:* Out-of-range Set Cell calls are ignored rather than erroring, which makes stamping shapes near the border safe.

### 19. Multi-floor tower with a shared shaft

*Scenario:* Every floor of a tower is generated from the same run seed but must line up on one lift shaft column.

```
Event: On function "BuildFloor" (Index)
  Action: AdvWalker > Create grid -> 48, 32
  Action: AdvWalker > Set seed -> RunSeed & "-floor-" & Index
  Action: System > For "y" from 0 to 31
    Action: AdvWalker > Set cell -> 24, loopindex("y"), 1
  Action: AdvWalker > Add walker -> "floor", 24, 16, 500, 8, 180, ""
  Action: AdvWalker > Run all walkers
  // The shaft is stamped before the walker runs and the walker starts on it,
  // so every floor is connected to the lift.
```

### 20. Cleanup between levels

*Scenario:* Moving to the next level must not leak walkers or marks from the last one.

```
Event: On function "NextLevel"
  Action: System > Add 1 to LevelNumber
  Action: Enemy > Destroy
  Action: Pickup > Destroy
  Action: Tilemap > Erase all
  Action: AdvWalker > Create grid -> 64, 64
  // Create Grid clears walkers and marks too, so this single action is the whole reset.
  Action: AdvWalker > Set seed -> RunSeed & "-" & LevelNumber
  Action: System > Call function "RegisterWalkers"
  Action: AdvWalker > Run all walkers
```

*Note:* If you use Clear Grid instead of Create Grid, the old walkers stay registered with exhausted budgets and will silently carve nothing on the next run.

### 21. Combined pass: caves, water, ore, walls and four mark types

*Scenario:* The full pipeline, showing how the systems layer in one deterministic sequence.

```
Event: On function "GenerateWorld"
  Action: AdvWalker > Create grid -> 96, 96
  Action: AdvWalker > Set seed -> WorldSeed
  Action: AdvWalker > Add walker -> "cave1", 48, 48, 900, 8, 180, "cave"
  Action: AdvWalker > Add walker -> "cave2", 20, 70, 600, 8, 180, "cave"
  Action: AdvWalker > Define walker -> "{""id"":""river"",""startCol"":0,""startRow"":30,""steps"":300,""directions"":3,""maxTurn"":45,""turnChance"":0.3,""carveValue"":2,""tag"":""water""}"
  Action: AdvWalker > Define walker -> "{""id"":""ore"",""startCol"":70,""startRow"":10,""steps"":200,""directions"":8,""maxTurn"":90,""carveValue"":4,""tag"":""ore""}"
  Action: AdvWalker > Set walker "ore" direction weights -> "1,4,9,4,1,0,0,0"
  Action: AdvWalker > Run walkers tagged -> "cave"
  Action: AdvWalker > Dilate cells valued 1 by 1 iterations
  Action: AdvWalker > Run walkers tagged -> "water"
  Action: AdvWalker > Run walkers tagged -> "ore"
  Action: AdvWalker > Outline cells valued 1 with 3
  Action: AdvWalker > Scatter 12 "enemy" marks on cells valued 1, placement Interior, min spacing 7
  Action: AdvWalker > Scatter 40 "torch" marks on cells valued 1, placement Edge, min spacing 3
  Action: AdvWalker > Scatter 25 "iron" marks on cells valued 4, placement Any, min spacing 2
  Action: AdvWalker > Drop "chest" marks along walker "cave1" every 40 steps, chance 0.7, min spacing 10
  Action: System > Call function "PaintAndSpawn"
```

*Note:* Every action in that list draws from the same stream in that exact order. Move the ore run above the water run and the whole world changes, legitimately. Keep the sequence stable and vary only `WorldSeed`.

### Other game use cases

**Roguelike / roguelite.** The home turf. One walker per cavern, tags to stage passes, interior scatter for enemies and a seed per floor gives you an entire dungeon generator with no Array logic at all.

**Metroidvania.** Generate the connective tunnels between hand-authored rooms. A low turn chance walker between two fixed anchor cells produces an organic link that still lands exactly where the designer placed the doors.

**Survival crafting.** Biomes as cell values, resources as tagged marks. Scatter trees on the forest value, ore on the rock value and berries on grass, all from the world seed, so the world can be regenerated from a save code instead of stored.

**Mining and digging games.** Ore veins are downward-weighted walkers with their own carve value. Player digging writes back through Set Cell, so the excavated world becomes part of the save.

**Tower defence.** The creep road is a single low-turn walker, and build spots scatter on the wall value so they always line the path. Map rotations become a list of date-derived seeds.

**Dungeon crawler.** Four direction walkers with a 90 degree max turn deliver the boxy, hand-hewn corridor look, and edge-placed marks give you doors and torches without a single distance check.

**Action platformer.** Weight a walker heavily toward horizontal directions and give it a brush size of three. The result is a run of connected ledges and caverns rather than a vertical scribble.

**Vertical climber.** The mirror image: weight upward, zero out the downward headings, and every generated level naturally rises.

**Twin-stick shooter.** Large open arenas from a high-step walker with a big brush, then interior scatter with generous spacing so enemies never spawn on top of the player.

**Bullet hell.** The grid is not a level here, it is a firing pattern. A short walker over a small grid becomes a deterministic spread of bullet spawn points that every replay reproduces exactly.

**Puzzle games.** Generate the board rather than authoring it. A walker over a small grid produces the connected region a sliding or flood puzzle needs, and the seed becomes the puzzle number.

**Match-3 and board games.** Use the grid as an irregular board mask so the playfield is not a plain rectangle, with the same shape reproduced for every player of a daily challenge.

**City builders.** Roads are three direction walkers with a low turn chance, rivers are the same with a different carve value, and buildable plots are edge marks along the roads.

**Farming and life sim.** Small daily growth passes seeded with the day number let plants spread believably without storing the history of the garden.

**Horror and exploration.** Long, narrow, high-turn-chance walkers with a brush size of one create disorienting warrens where the player cannot see far ahead.

**Stealth games.** Carve the walkable region, then use interior placement for guard patrol anchors and edge placement for cover objects, so cover always sits against something solid.

**RPG world maps.** Layer continents, rivers and forests as separate tagged walker batches, then scatter settlements with a large minimum spacing so towns never cluster.

**Racing games.** A wide brush, low turn chance walker on a large grid is a rally stage. Zero out the reverse headings and the track never doubles back on itself.

**Endless runners.** Generate one chunk at a time, seeding each chunk with the run seed plus the chunk index, so the endless world is reproducible for leaderboard verification.

**Tactics and strategy games.** The grid maps directly onto a tactical battlefield. Cell values become terrain types and interior marks become deployment zones.

**Sandbox and voxel games.** Run several plugin instances, one per chunk or per layer, each seeded from the world seed plus its coordinates, so chunks generate independently but consistently.

**Idle and incremental games.** Generate the mine or dungeon layout that the automated workers traverse, refreshing it each prestige from a new seed.

**Multiplayer competitive games.** Every client generates from the match seed. No map data crosses the network, and replays regenerate the arena instead of recording it.

**Educational and simulation software.** The walk is the subject: visualise random walks, diffusion or percolation with Step Walker driving the animation frame by frame.

**Art and generative toys.** Walkers as brush strokes over a small grid, with brush size and turn chance as the artist's controls, gives you a generative drawing tool rather than a level generator.

**VFX and technical art.** Cracks, lightning, root systems and frost patterns are all short, low direction count walkers on throwaway grids that exist only long enough to place sprites.

---

## 20. C3 Debugger

Advanced Drunken Walker publishes three sections to Construct's debugger. Open *Debug Layout* instead of *Preview*, then select the plugin's object in the inspector panel on the left.

### Grid section

| Field | Meaning |
|---|---|
| `$gridCols` | Current grid width in cells. |
| `$gridRows` | Current grid height in cells. |
| `$emptyValue` | The configured Empty Value. |
| `$seed` | The seed the generator was last set with, including a clock-derived one. |
| `$randomSource` | Either `internal_seeded` or `injected`. |
| `$injectedRemaining` | How many injected values are still unconsumed in the queue. |
| `$cells[N]` | One row per distinct cell value in the grid, showing how many cells hold it. |

The `$cells[N]` rows only appear once something has built the cell index, which happens the first time you call `CountCells` or *Scatter Marks*. Until then you will see a single `$cells` row reading `(not indexed yet)`. This is deliberate: rebuilding the index on every debug frame would stall a large grid.

### Walkers section

| Field | Meaning |
|---|---|
| `$count` | How many walkers are currently registered. |
| `$<walker id>` | One row per walker showing its current column, row, heading in degrees, remaining steps and whether it has finished. |

### Marks section

| Field | Meaning |
|---|---|
| `$total` | Total marks placed across all tags. |
| `$<tag>` | One row per tag with its mark count. Untagged marks appear as `$(untagged)`. |

### What the panel tells you

Most generation problems are visible here in a couple of seconds. A `$seed` that is not what you expected means *Set Seed* ran after generation instead of before. A `$count` above zero with a `$gridCols` of zero means you registered walkers before creating the grid. Walkers showing a full step budget means you registered them but never ran them. A `$cells` row missing your carve value means the walkers ran but started outside the grid.

---

## 21. Scripting (C3 Script / JavaScript)

Every one of the plugin's 57 ACEs is exposed to scripting, so anything you can do in an event sheet you can do in JavaScript.

### Accessing the plugin

The plugin is a regular object type, and `IsSingleGlobal` is false, so a project can hold several independent generators. Get an instance the usual way. The name comes from what you called the object in your project, not from the addon id.

```js
const walker = runtime.objects.AdvWalker.getFirstInstance();
```

If you placed more than one generator, fetch them individually.

```js
const world = runtime.objects.WorldGen.getFirstInstance();
const vfx = runtime.objects.CrackGen.getFirstInstance();
```

### Calling actions from script

`expose: true` copies the ACE function directly onto the instance prototype rather than wrapping it, so calling it from script has exactly the same effect as the event sheet action, triggers included. Method names are **PascalCase** and come from the ACE filename: `a.CreateGrid.js` becomes `CreateGrid()`, `a.SetWalkerDirectionWeights.js` becomes `SetWalkerDirectionWeights()`. Parameters are positional and in the same order as the action shows them in the editor.

```js
walker.CreateGrid(64, 64);
walker.SetSeed("hello-world");
walker.AddWalker("main", 32, 32, 600, 8, 180, "cave");
walker.SetWalkerDigSize("main", 5, 3);   // 5 wide across the heading, 3 deep ahead
walker.SetWalkerDigSize("main", 5, -3);  // same, but dug behind the walker instead
walker.RunAllWalkers();
```

Combo parameters arrive as **0-based indices**, not strings. There are two combos in this plugin.

| Combo | 0 | 1 | 2 |
|---|---|---|---|
| *Scatter Marks* `placement` | Any | Interior | Edge |
| *Set Random Source* `source` | Internal seeded | Injected |

```js
walker.ScatterMarks("enemy", 12, 1, 1, 6);   // 1 = Interior
walker.ScatterMarks("torch", 40, 1, 2, 3);   // 2 = Edge
walker.SetRandomSource(1);                   // 1 = Injected
```

*Define Walker* takes a JSON string, so build it with `JSON.stringify` rather than by hand.

```js
walker.DefineWalker(JSON.stringify({
  id: "river",
  startCol: 0, startRow: 20,
  steps: 300, directions: 3, maxTurn: 45,
  turnChance: 0.3, carveValue: 2,
  brushWidth: 4, brushHeight: 1,
  weights: [8, 3, 0],
  tag: "water",
}));
```

### Reading state from script

Conditions and expressions are exposed the same way, as PascalCase methods that return a value. This is worth stressing because it differs from some addons: here the expressions really are callable, because every ACE is on the prototype.

```js
// Grid queries
walker.GridCols();                       // number
walker.GridRows();                       // number
walker.CellValue(10, 12);                // number, Empty Value when out of bounds
walker.NeighbourCount(10, 12, 1);        // number, 0 to 8
walker.IsInsideGrid(10, 12);             // boolean
walker.IsCellValue(10, 12, 1);           // boolean

// Coordinates
walker.CellToLayoutX(10);
walker.CellToLayoutY(12);
walker.LayoutToCol(320);
walker.LayoutToRow(384);

// Cells and marks
walker.CountCells(1);
walker.GetCellColByIndex(1, 0);
walker.GetCellRowByIndex(1, 0);
walker.CountMarks("enemy");              // "" counts every mark
walker.GetMarkColByIndex("enemy", 0);
walker.GetMarkRowByIndex("enemy", 0);
walker.HasMarkAt(10, 12, "enemy");       // boolean, "" matches any tag
walker.HasWalker("main");                // boolean

// Seed
walker.CurrentSeed();                    // string
```

The trigger context expressions work in script too, but only inside a trigger listener, exactly as in the event sheet. Outside one they return 0 or an empty string.

```js
walker.WalkerCol();  walker.WalkerRow();  walker.WalkerAngle();
walker.WalkerStepsLeft();  walker.WalkerID();  walker.WalkerTag();
walker.CarvedCol();  walker.CarvedRow();  walker.CarvedValue();
walker.MarkCol();  walker.MarkRow();  walker.MarkTag();
```

### Listening to triggers from script

The plugin dispatches its triggers through its own listener API, `on` and `off`, rather than through the SDK's `addEventListener`. Pass the trigger name exactly as it appears in the ACE list, with no spaces.

```js
walker.on("OnGenerationComplete", () => {
  console.log("carved", walker.CountCells(1), "cells");
});
```

Filtered triggers take the filter as `params`, matching the parameter order of the condition. The plugin re-runs the condition with those values to decide whether your callback fires, which is exactly what Construct does for a filtered trigger block.

```js
// Only marks tagged "enemy"
walker.on("OnMarkPlaced", () => {
  spawnEnemy(walker.MarkCol(), walker.MarkRow());
}, { params: ["enemy"] });

// Only this walker finishing
walker.on("OnWalkerFinished", () => {
  console.log("main ended at", walker.WalkerCol(), walker.WalkerRow());
}, { params: ["main"] });
```

Pass `{ once: true }` for a listener that removes itself after firing, and use `off` to remove one by reference.

```js
const onDone = () => paintEverything();
walker.on("OnGenerationComplete", onDone, { once: true });
walker.off("OnGenerationComplete", onDone);   // if you need to cancel it early
```

The available trigger names are `OnCellCarved`, `OnWalkerStepped`, `OnWalkerFinished`, `OnMarkPlaced`, `OnWalkersByTagComplete` and `OnGenerationComplete`.

### Looping patterns

The Count plus Index expression pairs translate into ordinary `for` loops, which is usually clearer than the event sheet equivalent.

```js
// Every carved floor cell
const floorCount = walker.CountCells(1);
for (let i = 0; i < floorCount; i++) {
  const col = walker.GetCellColByIndex(1, i);
  const row = walker.GetCellRowByIndex(1, i);
  tilemap.setTileAt(col, row, 0);
}

// Every enemy mark
const enemyCount = walker.CountMarks("enemy");
for (let i = 0; i < enemyCount; i++) {
  runtime.objects.Enemy.createInstance("Game",
    walker.CellToLayoutX(walker.GetMarkColByIndex("enemy", i)),
    walker.CellToLayoutY(walker.GetMarkRowByIndex("enemy", i)));
}
```

Cache the count before the loop rather than calling it each iteration. It is cheap, but it is not free on a large grid.

### A complete example

```js
class LevelGenerator {
  constructor(runtime) {
    this.runtime = runtime;
    this.walker = runtime.objects.AdvWalker.getFirstInstance();

    this.walker.on("OnMarkPlaced", () => this.spawn("Enemy"), { params: ["enemy"] });
    this.walker.on("OnMarkPlaced", () => this.spawn("Chest"), { params: ["chest"] });
    this.walker.on("OnGenerationComplete", () => this.paint());
  }

  generate(seed, floor) {
    const w = this.walker;
    w.CreateGrid(64, 64);                       // wipes grid, walkers and marks
    w.SetSeed(`${seed}-floor-${floor}`);
    w.AddWalker("main", 32, 32, 700, 8, 180, "");
    w.DefineWalker(JSON.stringify({
      id: "river", startCol: 0, startRow: 20, steps: 250,
      directions: 3, maxTurn: 45, turnChance: 0.3, carveValue: 2,
    }));
    w.RunAllWalkers();                          // fires OnGenerationComplete
  }

  paint() {
    const w = this.walker;
    w.DilateCells(1, 1);
    w.OutlineCells(1, 3);
    w.ScatterMarks("enemy", 10 + this.difficulty * 4, 1, 1, 6);   // 1 = Interior
    w.ScatterMarks("chest", 4, 1, 1, 10);
    w.DropMarksAlongWalk("main", "ammo", 12, 0.5, 4);

    const tilemap = this.runtime.objects.Tilemap.getFirstInstance();
    for (const [value, tile] of [[1, 0], [2, 4], [3, 1]]) {
      const n = w.CountCells(value);
      for (let i = 0; i < n; i++) {
        tilemap.setTileAt(w.GetCellColByIndex(value, i), w.GetCellRowByIndex(value, i), tile);
      }
    }
  }

  spawn(objectName) {
    const w = this.walker;
    this.runtime.objects[objectName].createInstance("Game",
      w.CellToLayoutX(w.MarkCol()), w.CellToLayoutY(w.MarkRow()));
  }
}
```

Note the ordering in `paint`. The mark passes run after the post-processing so that interior and edge placement see the finished, dilated and outlined grid rather than the raw walk.

---

## 22. Deep Dive: The Determinism Model

### What is guaranteed

Given the same seed, the same walker definitions and the same sequence of generation actions, Advanced Drunken Walker produces byte-identical output. That holds across sessions, across browsers, across export platforms and across machines, because the internal generator uses only 32-bit integer arithmetic rather than floating point, and because the seed string is hashed the same way everywhere.

### Where the randomness is spent

Every stochastic decision draws from one stream, in this order:

1. Walkers run in **registration order** within a run call.
2. Within a walker, steps run in sequence. Each step spends one value on the turn check, one more if it turns, and one more again if the chosen heading would leave the grid and has to be re-rolled.
3. Mark passes run in **call order**, spending one value per candidate for *Drop Marks Along Walk* and one per examined candidate for *Scatter Marks*.

A one-direction walker spends nothing on turning, because it has no choice to make.

### Why some values are drawn even when they cannot change anything

Two places deliberately draw a random value that looks wasted. The turn check in each step is rolled even when `turnChance` is 1, and *Drop Marks Along Walk* rolls per candidate even when the chance is 1. This is intentional. It means that changing a probability changes only that decision, and leaves every later decision in the stream exactly where it was. Without it, dropping a walker's turn chance from 1 to 0.9 would shift every subsequent walker and every subsequent mark pass, and tuning one number would rebuild the whole map.

Direction weights follow the same rule. The weighted pick consumes exactly one value whether or not weights are set, so adding weights to a walker does not shift anything downstream of it.

### What breaks determinism

- **Construct's own `random()` and `choose()`** anywhere in your generation logic. They draw from a different, unseeded stream. If a walker's start column comes from `random(64)`, the map is not reproducible no matter what the plugin does.
- **Reordering generation actions.** This is not a bug, it is the model. Two *Scatter Marks* calls swapped produce a different but equally valid world.
- **Conditional generation.** An `if` that sometimes registers an extra walker means the stream diverges from that point on. If you need optional content, generate it into a separate plugin instance with its own seed.
- **Leaving the Seed property empty** and never calling *Set Seed*. The first generation of the session then derives from the clock.

### Making variation deterministic

The usual fix for wanting variety is not a second random source, it is a richer seed.

```
Event: On function "Generate"
  Action: AdvWalker > Set seed -> RunSeed & "-" & FloorNumber & "-" & Difficulty
  // Difficulty is part of the seed, so hard mode is a different world, reproducibly.
```

And when you genuinely need a random number derived from the plugin's stream rather than Construct's, take it from the generated world itself. The position of the first scattered mark, for instance, is deterministic and effectively random.

```
Event: AdvWalker > On generation complete
  Action: AdvWalker > Scatter 1 "spawn" marks on cells valued 1, placement Interior, min spacing 0
  Action: Player > Set position to
          (AdvWalker.CellToLayoutX(AdvWalker.GetMarkColByIndex("spawn", 0)),
           AdvWalker.CellToLayoutY(AdvWalker.GetMarkRowByIndex("spawn", 0)))
  // A reproducible spawn point, unlike floor(random(CountCells(1))).
```

---

## 23. Deep Dive: Advanced Random Integration

Advanced Drunken Walker ships its own seeded generator and depends on no other addon. If your project also uses the Advanced Random plugin, there are two supported ways to keep everything on one master seed. They suit different situations, so pick deliberately.

### Pattern 1: shared seed, independent streams (recommended)

Seed both plugins from the same master string. Each keeps its own stream, so neither consumes the other's values and neither can desynchronise the other.

```
Event: On start of layout
  Action: AdvancedRandom > Set seed -> MasterSeed
  Action: AdvWalker > Set seed -> AdvancedRandom.Seed
  Action: System > Call function "Generate"
  // One master seed, two independent generators. Adding a dice roll elsewhere
  // in your game cannot change the map.
```

You can derive per-system seeds from the same master so that unrelated systems stay unrelated.

```
Event: On function "NewRun"
  Action: AdvancedRandom > Set seed -> MasterSeed
  Action: AdvWalker > Set seed -> AdvancedRandom.Seed & "-map"
  Action: LootRoller > Set seed -> AdvancedRandom.Seed & "-loot"
  // Rerolling loot cannot possibly change the map, because they are different streams.
```

### Pattern 2: injected, one single audited stream

Switch the random source to *Injected* and feed values in from Advanced Random. Every decision the generator makes then comes out of Advanced Random's stream. This is the pattern to use when a project mandates that all randomness audit through one plugin.

```
Event: On function "GenerateInjected"
  Action: AdvancedRandom > Set seed -> MasterSeed
  Action: AdvWalker > Create grid -> 64, 64
  Action: AdvWalker > Set random source -> Injected
  Action: System > Repeat 5000 times
    Action: AdvWalker > Inject random -> AdvancedRandom.Random
  Action: AdvWalker > Add walker -> "main", 32, 32, 600, 8, 180, ""
  Action: AdvWalker > Run all walkers
  // Queue the values before generating. Generation consumes them in order.
```

The queue must be deep enough. Budget roughly two values per walker step, plus one per mark candidate, and add headroom. If the queue runs dry mid-generation the plugin does not stop, it falls back to its internal generator and, with Debug Mode on, logs a warning. That keeps a half-generated map from becoming a hard failure, but it does mean a silent loss of the audit guarantee if you are not watching the console.

Check `$injectedRemaining` in the debugger after a generation to see how much headroom you actually had.

### Pattern 3: injected only for one pass

You can switch sources mid-run, which is useful when only part of the generation needs auditing.

```
Event: On function "MixedGenerate"
  Action: AdvWalker > Set seed -> "terrain"
  Action: AdvWalker > Run walkers tagged -> "terrain"
  Action: AdvWalker > Set random source -> Injected
  Action: System > Repeat 500 times
    Action: AdvWalker > Inject random -> AdvancedRandom.Random
  Action: AdvWalker > Scatter 20 "loot" marks on cells valued 1, placement Interior, min spacing 5
  Action: AdvWalker > Set random source -> Internal seeded
  // Terrain uses the plugin's own seed, loot placement audits through Advanced Random.
```

### Choosing between them

| | Shared seed | Injected |
|---|---|---|
| Setup cost | One action | Queue thousands of values first |
| Failure mode | None | Queue underrun falls back silently |
| Coupling | None. Streams are independent | Total. Any change to Advanced Random's consumption shifts the map |
| Use it when | Almost always | An audit requirement forces one stream |

Shared seed is the default recommendation because the independence is a feature. With injected mode, adding one extra `AdvancedRandom.Random` call anywhere earlier in your project shifts every value the generator receives and changes the whole map.

---

## 24. Tips and Common Mistakes

- **Set the seed before you generate, not after.** *Set Seed* resets the stream. Calling it after *Run All Walkers* changes nothing about the map you just built, and it is the single most common reason a map is not reproducible. The debugger's `$seed` row makes this obvious in a second.

- **Create Grid wipes walkers and marks, not just cells.** That is what makes it a clean level reset, but it also means registering walkers *before* calling *Create Grid* silently throws them away. Always create the grid first.

- **Clear Grid does not reset walkers.** If you use it between levels instead of *Create Grid*, the previous level's walkers are still registered with exhausted step budgets, so *Run All Walkers* appears to do nothing. Use *Create Grid* for a full reset, and *Clear Grid* only when you deliberately want to keep the walker set.

- **Set Cell and Clear Grid do not fire On Cell Carved.** They are documented silent writes. If your tilemap is painted from that trigger, hand-placed cells will be missing. Paint from `CountCells` and the index expressions instead, which see every cell regardless of how it got there.

- **On Walker Stepped only fires from Step Walker.** Batch runs skip it deliberately for speed. If you are animating, you must use *Step Walker*, and if you are running in bulk you should listen to *On Cell Carved* or iterate afterwards.

- **A low max turn alone does not make a smooth path.** With the default `turnChance` of 1 the walker considers turning every single step, so the heading performs its own random walk and the result still curls. Lower `turnChance` to somewhere around 0.15 to 0.3 for roads and rivers.

- **Dig depth is signed, dig width is not.** A negative depth digs behind the walker, which is deliberate. A negative width is not an error either, but the sign is ignored because "across the heading" has no front and back. Use 0, not a negative, when you mean "fall back to the brush size".

- **The square brush does not rotate, the dig size does.** `brushSize` stamps the same axis-aligned block whatever way the walker is facing, so a "wide corridor" built from it pinches at corners. Use *Set Walker Dig Size* when you want a corridor that keeps its width around turns.

- **Dilate Cells converts other terrain, Outline Cells does not.** Dilation overwrites any neighbouring cell whatever value it holds, so dilating floor will eat water where they touch. Outlining only ever overwrites the Empty Value. Dilate before you carve anything you want to keep.

- **The count in Scatter Marks is a maximum, not a promise.** Tight spacing, a small eligible region or a placement rule that matches almost nothing will all silently produce fewer marks. Turn on Debug Mode and the console tells you how many it actually placed and why.

- **Interior placement finds nothing on thin corridors.** Interior needs all eight neighbours to match, which a one-cell-wide walk never has. Run *Dilate Cells* first, or use Any placement.

- **Empty filter strings mean "match everything", except on Run Walkers By Tag.** For the triggers, an empty tag or id matches all. For *Run Walkers By Tag*, an empty tag runs only the walkers that genuinely have no tag. That asymmetry catches people out.

- **Do not mix Construct's random() into generation.** It draws from a different, unseeded stream, so a single `random()` in a walker's start position is enough to make an otherwise perfect setup unreproducible. Derive variation from the seed string instead.

- **Reordering generation actions changes the map, by design.** Two swapped *Scatter Marks* calls produce a different world from the same seed. Build generation as one function whose action order never varies, and change the seed rather than the sequence.

- **Loading a save does not replay triggers.** *On Cell Carved* and *On Mark Placed* do not fire for restored content. Repaint from the Count and Index expressions in *On loaded*.

- **Turn off Debug Mode for release.** The logging is per-carve in places and will noticeably slow a large generation, quite apart from filling the player's console.
