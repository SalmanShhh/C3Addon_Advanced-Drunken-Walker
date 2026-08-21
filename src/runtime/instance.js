/**
 * Advanced Drunken Walker - the engine. The ACE files under src/aces are thin
 * handlers that validate their parameters and call in here.
 *
 * State: an Int32Array grid, a Map of walkers (iteration order = registration
 * order), a list of tagged marks, and one PRNG state. All built in the
 * constructor, because Construct can run actions before any tick hook fires.
 *
 * Determinism: every random decision goes through _random(), in a fixed order.
 * When editing, draw random values unconditionally rather than behind an `if`
 * (see the turn roll in _advanceWalker) so tuning a probability does not shift
 * everything downstream of it.
 *
 * Triggers: Construct matches a filtered trigger by re-running the condition
 * during the _trigger() call, so context fields (_ctxWalker, _carved*, _mark*)
 * must be assigned before _trigger(), never after. Every ACE handler is a
 * one-line call into the "ACE implementations" section at the bottom.
 */

import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

// Combo parameters reach the runtime as a 0-based index into the `items` array
// declared in the ACE config, never as the string id, so these enums must stay
// in the same order as those lists.

// Mirrors the Random Source property in config.caw.js and the `source`
// parameter of src/aces/Randomness/a.SetRandomSource.js.
const RANDOM_SOURCE = { INTERNAL: 0, INJECTED: 1 };

// Mirrors the `placement` parameter of src/aces/Marks/a.ScatterMarks.js:
// any cell / all 8 neighbours matching / at least one neighbour differing.
const PLACEMENT = { ANY: 0, INTERIOR: 1, EDGE: 2 };

// Fallbacks for every optional Walker Definition field. Add Walker fills in
// what it does not expose from here, and Define Walker falls back to it for
// anything missing from the JSON. Only id, startCol and startRow have no
// meaningful default. These numbers are quoted in both ACE descriptions.
const WALKER_DEFAULTS = {
  steps: 400,
  directions: 8,
  maxTurn: 180,
  startAngle: 0,
  turnChance: 1,
  carveValue: 1,
  brushSize: 1,
  tag: "",
};

// Grid offsets for the 8 neighbours by octant, where octant i is the heading
// i * 45 degrees: index 0 is right, index 2 is down (Construct's Y axis points
// down). Used for both walker movement and neighbourhood queries.
const OCTANT_DX = [1, 1, 0, -1, -1, -1, 0, 1];
const OCTANT_DY = [0, 1, 1, 1, 0, -1, -1, -1];

// How many bytes to hand String.fromCharCode at once when base64-packing.
const B64_CHUNK = 0x8000;

// Slack for angle comparisons, so a maxTurn of 45 still reaches a heading
// that floating point computed as 45.000000000000004.
const ANGLE_EPSILON = 1e-9;

// Event-sheet expressions can hand us an empty string or a NaN, so every
// parameter that reaches the engine degrades to a default instead.
function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Wraps any angle into [0, 360).
function normAngle(angle) {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

// Smallest absolute angle between two headings, in degrees (0-180).
function angleDelta(a, b) {
  let d = Math.abs(normAngle(a - b));
  if (d > 180) d = 360 - d;
  return d;
}

// Per-direction turn weights, for Set Walker Direction Weights and for the
// `weights` field of a Walker Definition. Accepts an array or a comma-
// separated string; entry i is the walker direction i, where 0 is startAngle
// and the rest follow it clockwise. Missing entries weigh 1, negatives are
// floored at 0. Empty input returns null, meaning "all directions equal".
function parseWeights(raw, directions) {
  let parts;
  if (Array.isArray(raw)) {
    parts = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    parts = trimmed.split(",");
  } else {
    return null;
  }
  if (parts.length === 0) return null;

  const weights = new Array(directions);
  for (let i = 0; i < directions; i++) {
    weights[i] = Math.max(0, toNumber(parts[i], 1));
  }
  return weights;
}

// One axis of a walker's oriented dig rectangle. 0, a missing value or junk
// all mean "fall back to the square brush size for this axis" and are stored
// as null, which is what keeps the plain square brush the default.
//
// The sign is preserved, because it carries meaning on the depth axis: a
// positive depth digs forward from the walker and a negative one digs behind
// it. Truncation rather than floor, so -2.5 becomes -2 and not -3.
function normaliseDigExtent(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

// FNV-1a plus an avalanche step. The avalanche matters: without it, seeds
// differing by one character ("level-1", "level-2") produce visibly similar
// maps, which is exactly the case level numbers and dates hit.
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// Savegames are JSON, where a 256x256 grid as an array of numbers is megabytes
// of text, so the raw buffer is base64'd. Chunked because passing a whole
// multi-megabyte buffer as arguments blows the call stack.
function packInt32Array(arr) {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + B64_CHUNK));
  }
  return btoa(binary);
}

// `length` comes from the saved cols/rows rather than the string, so a
// truncated payload yields a correctly sized grid instead of throwing.
function unpackInt32Array(str, length) {
  const result = new Int32Array(length);
  if (!str) return result;
  const binary = atob(str);
  const bytes = new Uint8Array(result.buffer);
  const count = Math.min(bytes.length, binary.length);
  for (let i = 0; i < count; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return result;
}

export default function (parentClass) {
  return class extends parentClass {
    constructor() {
      super();

      // --- grid, row-major: index = row * _cols + col ---
      this._cols = 0;
      this._rows = 0;
      this._grid = new Int32Array(0);
      this._emptyValue = 0;
      this._maxGridSize = 2048;
      // Create Grid falls back to these when passed a 0 dimension.
      this._defaultCols = 64;
      this._defaultRows = 64;

      // --- placement in layout space, for the coordinate expressions ---
      this._cellSize = 32;
      this._originX = 0;
      this._originY = 0;

      // --- randomness ---
      this._seed = "";
      this._prngState = 0;
      this._randomSource = RANDOM_SOURCE.INTERNAL;
      // An index rather than shift(), so a long queue is not re-copied on
      // every draw during generation.
      this._injectedQueue = [];
      this._injectedIndex = 0;

      this._debug = false;

      // --- walkers and marks ---
      this._walkers = new Map();
      this._marks = []; // placement order, as the Index expressions expose it
      this._marksByTag = new Map(); // tag -> marks, for CountMarks and spacing
      this._markCells = new Map(); // "col,row" -> marks, for Has Mark At

      // value -> cell indexes, built on demand by _cellIndex() and
      // invalidated (not rebuilt) on write.
      this._cellCache = null;
      this._cellCacheDirty = true;

      // Trigger context - assign before _trigger(), never after.
      this._ctxWalker = null;
      this._ctxTag = "";
      this._ctxCarvedCol = 0;
      this._ctxCarvedRow = 0;
      this._ctxCarvedValue = 0;
      this._ctxMarkCol = 0;
      this._ctxMarkRow = 0;
      this._ctxMarkTag = "";

      // Properties are read positionally, which is why config.caw.js warns
      // against reordering them:
      //   0 Grid Width      1 Grid Height   2 Max Grid Size   3 Cell Size
      //   4 Origin X        5 Origin Y      6 Empty Value     7 Seed
      //   8 Random Source   9 Debug Mode
      const properties = this._getInitProperties();
      if (properties) {
        this._defaultCols = Math.max(
          1,
          Math.floor(toNumber(properties[0], 64))
        );
        this._defaultRows = Math.max(
          1,
          Math.floor(toNumber(properties[1], 64))
        );
        this._maxGridSize = Math.max(
          1,
          Math.floor(toNumber(properties[2], 2048))
        );
        // `|| 32` also rejects a cell size of 0, which would make every
        // coordinate expression return Infinity.
        this._cellSize = toNumber(properties[3], 32) || 32;
        this._originX = toNumber(properties[4], 0);
        this._originY = toNumber(properties[5], 0);
        this._emptyValue = Math.floor(toNumber(properties[6], 0)) | 0;
        this._randomSource =
          properties[8] === RANDOM_SOURCE.INJECTED
            ? RANDOM_SOURCE.INJECTED
            : RANDOM_SOURCE.INTERNAL;
        this._debug = !!properties[9];
        // Seeded after _debug so its log line is not suppressed.
        this._setSeed(properties[7] === undefined ? "" : String(properties[7]));
      } else {
        this._setSeed("");
      }

      // A grid exists from the start, so CellValue and the conditions are safe
      // to call before the project has run Create Grid.
      this._allocGrid(
        Math.min(this._defaultCols, this._maxGridSize),
        Math.min(this._defaultRows, this._maxGridSize)
      );
    }

    // ---------------------------------------------------------------------
    // Trigger plumbing
    // ---------------------------------------------------------------------

    _trigger(method) {
      this.dispatch(method);
      super._trigger(self.C3[AddonTypeMap[addonType]][id].Cnds[method]);
    }

    // Scripting API: subscribe to a trigger.
    on(tag, callback, options) {
      if (!this.events[tag]) {
        this.events[tag] = [];
      }
      this.events[tag].push({ callback, options });
    }

    off(tag, callback) {
      if (this.events[tag]) {
        this.events[tag] = this.events[tag].filter(
          (event) => event.callback !== callback
        );
      }
    }

    // Scripting API counterpart of the event sheet's trigger matching: a
    // listener with filter params has the condition re-run with them, exactly
    // as Construct does for a filtered trigger block.
    dispatch(tag) {
      if (this.events[tag]) {
        this.events[tag].forEach((event) => {
          if (event.options && event.options.params) {
            const fn = self.C3[AddonTypeMap[addonType]][id].Cnds[tag];
            if (fn && !fn.call(this, ...event.options.params)) {
              return;
            }
          }
          event.callback();
          if (event.options && event.options.once) {
            this.off(tag, event.callback);
          }
        });
      }
    }

    // ---------------------------------------------------------------------
    // Debug logging (Debug Mode property)
    // ---------------------------------------------------------------------

    _log(...args) {
      if (!this._debug) return;
      console.log("[Advanced Drunken Walker]", ...args);
    }

    _warn(...args) {
      if (!this._debug) return;
      console.warn("[Advanced Drunken Walker]", ...args);
    }

    // ---------------------------------------------------------------------
    // Randomness - the single funnel every stochastic decision goes through
    // ---------------------------------------------------------------------

    // An empty seed derives one from the clock and stores it, so CurrentSeed
    // can still report what was actually used.
    _setSeed(seed) {
      const str = seed === undefined || seed === null ? "" : String(seed);
      this._seed = str === "" ? "time-" + Date.now() : str;
      this._prngState = hashSeed(this._seed);
      this._log("seed set to", this._seed);
    }

    // mulberry32: 32-bit integer maths only, so the sequence is bit-identical
    // on every export platform. An injected-queue underrun falls back to the
    // internal PRNG and warns rather than throwing - a half-generated map is
    // easier to diagnose than a hard failure during a layout start.
    _random() {
      if (this._randomSource === RANDOM_SOURCE.INJECTED) {
        if (this._injectedIndex < this._injectedQueue.length) {
          return this._injectedQueue[this._injectedIndex++];
        }
        this._warn(
          "injected random queue underrun, falling back to the internal PRNG"
        );
      }
      this._prngState = (this._prngState + 0x6d2b79f5) >>> 0;
      let t = this._prngState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Guarded at both ends because an injected value comes from the project
    // and may legitimately be exactly 1, which would index past the end.
    _randomInt(count) {
      if (count <= 1) return 0;
      const i = Math.floor(this._random() * count);
      if (i < 0) return 0;
      return i >= count ? count - 1 : i;
    }

    // ---------------------------------------------------------------------
    // Grid storage
    // ---------------------------------------------------------------------

    _allocGrid(cols, rows) {
      this._cols = Math.max(0, Math.floor(cols));
      this._rows = Math.max(0, Math.floor(rows));
      this._grid = new Int32Array(this._cols * this._rows);
      // Typed arrays are already zeroed, so only a non-zero Empty Value costs
      // a pass over the buffer.
      if (this._emptyValue !== 0) this._grid.fill(this._emptyValue);
      this._cellCache = null;
      this._cellCacheDirty = true;
    }

    _isInside(col, row) {
      return col >= 0 && row >= 0 && col < this._cols && row < this._rows;
    }

    // Everything outside the grid reads as the Empty Value.
    _cellAt(col, row) {
      if (!this._isInside(col, row)) return this._emptyValue;
      return this._grid[row * this._cols + col];
    }

    // The single write path for generated content, and the only place On Cell
    // Carved fires. A write that changes nothing is not a carve, so re-walking
    // covered ground stays silent. A null `walker` marks a post-processing
    // write, which is what makes WalkerID read as empty inside those triggers.
    // Set Cell deliberately bypasses this: it is a documented silent write.
    _carveCell(col, row, value, walker) {
      if (!this._isInside(col, row)) return false;
      const index = row * this._cols + col;
      if (this._grid[index] === value) return false;
      this._grid[index] = value;
      this._cellCacheDirty = true;

      this._ctxCarvedCol = col;
      this._ctxCarvedRow = row;
      this._ctxCarvedValue = value;
      this._ctxWalker = walker || null;
      this._ctxTag = walker ? walker.tag : "";
      this._trigger("OnCellCarved");
      return true;
    }

    // Off-grid neighbours never match, whatever `value` is. That is what lets
    // the placement rules treat the border as a wall: an edge cell can never
    // be "interior".
    _countNeighbours(col, row, value) {
      let count = 0;
      for (let i = 0; i < 8; i++) {
        const c = col + OCTANT_DX[i];
        const r = row + OCTANT_DY[i];
        if (!this._isInside(c, r)) continue;
        if (this._grid[r * this._cols + c] === value) count++;
      }
      return count;
    }

    // Early-out version, for the dilate and outline passes.
    _hasNeighbour(col, row, value) {
      for (let i = 0; i < 8; i++) {
        const c = col + OCTANT_DX[i];
        const r = row + OCTANT_DY[i];
        if (!this._isInside(c, r)) continue;
        if (this._grid[r * this._cols + c] === value) return true;
      }
      return false;
    }

    // Backs CountCells, GetCell*ByIndex and Scatter Marks. Row-major insertion
    // gives the stable order those expressions promise. Invalidated rather
    // than updated on write, so generate-then-iterate costs one scan however
    // many cells were carved - which is why the ACE descriptions steer users
    // towards iterating after On Generation Complete.
    _cellIndex() {
      if (this._cellCache && !this._cellCacheDirty) return this._cellCache;
      const map = new Map();
      const grid = this._grid;
      for (let i = 0; i < grid.length; i++) {
        const value = grid[i];
        let list = map.get(value);
        if (!list) {
          list = [];
          map.set(value, list);
        }
        list.push(i);
      }
      this._cellCache = map;
      this._cellCacheDirty = false;
      return map;
    }

    // Cell indexes holding `value`, or null when there are none.
    _cellsWithValue(value) {
      return this._cellIndex().get(value) || null;
    }

    // ---------------------------------------------------------------------
    // Walkers
    //
    // A walker is a plain object with three groups of fields: configuration
    // (id..brushSize), derived (headings, octants - precomputed so the step
    // loop does no trigonometry) and progress (col..path). Save/load persists
    // the first and third and rebuilds the second via _registerWalker.
    // ---------------------------------------------------------------------

    // Normalises a raw Walker Definition - from Add Walker's parameters or
    // Define Walker's parsed JSON - and registers it. Everything is clamped
    // here so no downstream code has to defend against 400 directions.
    // Returns the walker, or null if the definition had no id.
    _registerWalker(raw) {
      const walkerId = raw.id === undefined ? "" : String(raw.id);
      if (!walkerId) {
        this._warn("walker definition is missing an id, ignored");
        return null;
      }

      const directions = clamp(
        Math.round(toNumber(raw.directions, WALKER_DEFAULTS.directions)),
        1,
        8
      );
      const startAngle = normAngle(
        toNumber(raw.startAngle, WALKER_DEFAULTS.startAngle)
      );

      // The direction set: `directions` evenly spaced headings anchored at
      // startAngle. Movement is quantised to the 8 grid neighbours, so each
      // heading also gets its nearest octant, resolved once here rather than
      // per step. (Math.round(x / 45) yields 8 just under 360, hence % 8.)
      const headings = [];
      const octants = [];
      for (let i = 0; i < directions; i++) {
        const angle = normAngle(startAngle + (i * 360) / directions);
        headings.push(angle);
        octants.push(Math.round(angle / 45) % 8);
      }

      const walker = {
        // configuration
        id: walkerId,
        tag: raw.tag === undefined ? WALKER_DEFAULTS.tag : String(raw.tag),
        startCol: Math.floor(toNumber(raw.startCol, 0)),
        startRow: Math.floor(toNumber(raw.startRow, 0)),
        steps: Math.max(
          0,
          Math.floor(toNumber(raw.steps, WALKER_DEFAULTS.steps))
        ),
        directions,
        maxTurn: clamp(toNumber(raw.maxTurn, WALKER_DEFAULTS.maxTurn), 0, 180),
        startAngle,
        turnChance: clamp(
          toNumber(raw.turnChance, WALKER_DEFAULTS.turnChance),
          0,
          1
        ),
        carveValue:
          Math.floor(toNumber(raw.carveValue, WALKER_DEFAULTS.carveValue)) | 0,
        brushSize: Math.max(
          1,
          Math.floor(toNumber(raw.brushSize, WALKER_DEFAULTS.brushSize))
        ),
        // Oriented dig rectangle. Both null means "use the square brush".
        // brushWidth runs across the heading, brushHeight along it.
        brushWidth: normaliseDigExtent(raw.brushWidth),
        brushHeight: normaliseDigExtent(raw.brushHeight),
        // null means every direction is equally likely.
        weights: parseWeights(raw.weights, directions),

        // derived
        headings,
        octants,

        // progress. `angle` is always a member of `headings`, which
        // _advanceWalker relies on when looking its index back up.
        col: 0,
        row: 0,
        angle: headings[0],
        stepsLeft: 0,
        started: false,
        finished: false,
        // Flat [col0, row0, col1, row1, ...] of every cell stood on, start
        // included. Flat rather than objects because Drop Marks Along Walk
        // may replay thousands of steps.
        path: [],
      };

      walker.col = walker.startCol;
      walker.row = walker.startRow;
      walker.stepsLeft = walker.steps;

      // Map.set on an existing key keeps its position, so redefining a walker
      // does not move it to the end of the run order and change every seed.
      this._walkers.set(walkerId, walker);
      this._log("registered walker", walkerId);
      return walker;
    }

    // Register (restoring configuration and recomputing the derived tables),
    // then overwrite the progress fields.
    _restoreWalker(saved) {
      const walker = this._registerWalker(saved);
      if (!walker) return;
      walker.col = Math.floor(toNumber(saved.col, walker.startCol));
      walker.row = Math.floor(toNumber(saved.row, walker.startRow));
      walker.angle = normAngle(toNumber(saved.angle, walker.startAngle));
      walker.stepsLeft = Math.max(
        0,
        Math.floor(toNumber(saved.stepsLeft, walker.steps))
      );
      walker.started = !!saved.started;
      walker.finished = !!saved.finished;
      walker.path = Array.isArray(saved.path) ? saved.path.slice() : [];
    }

    // Stamps the walker's brush centred on one cell.
    //
    // Two shapes are possible. By default it is an axis-aligned square of
    // brushSize cells, which never rotates. If the walker has a dig size set
    // it is a rectangle that turns with the heading instead, handled by
    // _carveOrientedBrush.
    //
    // Even sizes cannot truly centre on a square grid, so they extend right
    // and down: size 2 covers (col, row) to (col + 1, row + 1).
    _carveBrush(walker, col, row) {
      if (walker.brushWidth !== null || walker.brushHeight !== null) {
        this._carveOrientedBrush(
          walker,
          col,
          row,
          walker.brushWidth === null ? walker.brushSize : walker.brushWidth,
          walker.brushHeight === null ? walker.brushSize : walker.brushHeight
        );
        return;
      }

      const size = walker.brushSize;
      if (size <= 1) {
        this._carveCell(col, row, walker.carveValue, walker);
        return;
      }
      const offset = Math.floor((size - 1) / 2);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          this._carveCell(
            col - offset + c,
            row - offset + r,
            walker.carveValue,
            walker
          );
        }
      }
    }

    // Carves a rectangle that turns with the walker: `width` cells across its
    // heading and `height` cells along it, so a walker facing right digs a
    // corridor `width` tall, and the same walker facing down digs one `width`
    // wide.
    //
    // The two axes read their arguments differently, because only one of them
    // has a meaningful front and back:
    //
    //   width   always centred across the heading, so the sign is ignored and
    //           only the magnitude counts.
    //   height  signed. A positive digs forward from the walker's own cell, a
    //           negative digs backward from it. Either way the walker's cell
    //           is included, so +1 and -1 both mean "just this cell".
    //
    // Each candidate cell centre is projected onto the heading and onto its
    // perpendicular and tested against those bounds. A cell at brush-local
    // index k covers the continuous span k - 0.5 to k + 0.5, which is where
    // the half cell padding comes from. For a cardinal heading the
    // projections are whole numbers, so the result is exactly the
    // axis-aligned rectangle you asked for.
    //
    // Diagonal headings need one correction. A thin rectangle lying at 45
    // degrees passes between cell centres, so a strict test would stamp a
    // lattice with holes in it and consecutive steps would not join up. The
    // along axis is therefore widened by half the extra reach a unit cell has
    // when it is rotated, which is zero for a cardinal heading and about 0.21
    // of a cell at 45 degrees. That is the smallest correction that makes
    // consecutive stamps overlap, and it leaves the across axis alone so the
    // corridor keeps the width that was asked for.
    _carveOrientedBrush(walker, col, row, width, height) {
      const radians = (walker.angle * Math.PI) / 180;
      const forwardX = Math.cos(radians);
      const forwardY = Math.sin(radians); // grid Y grows downward, as 90 = down

      // Along the heading: run the extent forward or backward from the
      // walker's cell depending on the sign.
      const depth = Math.abs(height);
      const alongFrom = height >= 0 ? 0 : -(depth - 1);
      const alongTo = alongFrom + depth - 1;

      // Across the heading: always centred. Even widths cannot straddle a cell
      // centre, so they lean to one side, matching how the square brush leans
      // right and down.
      const span = Math.abs(width);
      const acrossFrom = -Math.floor((span - 1) / 2);
      const acrossTo = acrossFrom + span - 1;

      const bridge =
        0.5 * (Math.abs(forwardX) + Math.abs(forwardY) - 1) + ANGLE_EPSILON;
      const alongMin = alongFrom - 0.5 - bridge;
      const alongMax = alongTo + 0.5 + bridge;
      const acrossMin = acrossFrom - 0.5 - ANGLE_EPSILON;
      const acrossMax = acrossTo + 0.5 + ANGLE_EPSILON;

      // A rotated rectangle never reaches further than the sum of its sides.
      const reach = span + depth;

      for (let dr = -reach; dr <= reach; dr++) {
        for (let dc = -reach; dc <= reach; dc++) {
          const along = dc * forwardX + dr * forwardY;
          if (along < alongMin || along > alongMax) continue;
          const across = dr * forwardX - dc * forwardY;
          if (across < acrossMin || across > acrossMax) continue;
          this._carveCell(col + dc, row + dr, walker.carveValue, walker);
        }
      }
    }

    // Carves the start cell once, on the walker's first step. Separate from
    // _advanceWalker so Step Walker and the batch runs share one path:
    // whichever touches the walker first lays down its start cell.
    _beginWalker(walker) {
      if (walker.started) return;
      walker.started = true;
      walker.path.push(walker.col, walker.row);
      this._carveBrush(walker, walker.col, walker.row);
    }

    _finishWalker(walker) {
      if (walker.finished) return;
      walker.finished = true;
      this._ctxWalker = walker;
      this._ctxTag = walker.tag;
      this._trigger("OnWalkerFinished");
      this._log("walker finished", walker.id, walker.col, walker.row);
    }

    // Where heading index `headingIndex` would put the walker next.
    _stepDestination(walker, headingIndex) {
      const octant = walker.octants[headingIndex];
      return [walker.col + OCTANT_DX[octant], walker.row + OCTANT_DY[octant]];
    }

    // One step. Returns false once the walker is done - budget exhausted or
    // boxed in - having already fired On Walker Finished.
    _advanceWalker(walker) {
      if (walker.finished) return false;
      if (walker.stepsLeft <= 0) {
        this._finishWalker(walker);
        return false;
      }

      const headings = walker.headings;

      // Headings reachable from the current one in a single step. This is
      // what maxTurn does, and what turns jitter into winding.
      const candidates = [];
      for (let i = 0; i < headings.length; i++) {
        if (
          angleDelta(headings[i], walker.angle) <=
          walker.maxTurn + ANGLE_EPSILON
        ) {
          candidates.push(i);
        }
      }

      let chosen = headings.indexOf(walker.angle);
      if (chosen < 0) chosen = 0;

      if (headings.length > 1) {
        // Rolled unconditionally so the stream layout does not change when
        // turnChance is tuned. A single-direction walker never turns, so it
        // draws nothing here.
        if (this._random() < walker.turnChance && candidates.length > 0) {
          chosen = this._pickHeading(walker, candidates);
        }
      }

      let [col, row] = this._stepDestination(walker, chosen);

      if (!this._isInside(col, row)) {
        // Borders repel rather than trap: re-roll among the legal headings,
        // widening to the full direction set when every reachable one is
        // blocked (which is how a walker escapes a corner).
        let legal = candidates.filter((i) =>
          this._isInside(...this._stepDestination(walker, i))
        );
        if (legal.length === 0) {
          legal = [];
          for (let i = 0; i < headings.length; i++) {
            if (this._isInside(...this._stepDestination(walker, i))) {
              legal.push(i);
            }
          }
        }
        if (legal.length === 0) {
          this._log("walker has no legal move, ending early", walker.id);
          this._finishWalker(walker);
          return false;
        }
        chosen = this._pickHeading(walker, legal);
        [col, row] = this._stepDestination(walker, chosen);
        this._log("boundary re-roll", walker.id, "to", headings[chosen]);
      }

      walker.angle = headings[chosen];
      walker.col = col;
      walker.row = row;
      walker.stepsLeft--;
      walker.path.push(col, row);
      this._carveBrush(walker, col, row);
      return true;
    }

    // Runs a walker to the end of its budget. Shared by _runWalker,
    // _runAllWalkers and _runWalkersByTag.
    _runWalkerToEnd(walker) {
      this._beginWalker(walker);
      while (this._advanceWalker(walker)) {
        // keep stepping until the budget runs out
      }
      if (!walker.finished) this._finishWalker(walker);
    }

    // Picks one heading index out of `indexes`, honouring the walker's
    // direction weights. Consumes exactly one random value either way, so
    // weighting a walker does not shift the rest of the stream.
    _pickHeading(walker, indexes) {
      const weights = walker.weights;
      if (!weights) return indexes[this._randomInt(indexes.length)];

      let total = 0;
      for (let k = 0; k < indexes.length; k++) total += weights[indexes[k]];
      if (total <= 0) {
        // Every reachable direction is weighted out - fall back to an even
        // pick rather than deadlocking the walker.
        return indexes[this._randomInt(indexes.length)];
      }

      let roll = this._random() * total;
      for (let k = 0; k < indexes.length; k++) {
        roll -= weights[indexes[k]];
        if (roll < 0) return indexes[k];
      }
      return indexes[indexes.length - 1]; // float rounding safety net
    }

    // ---------------------------------------------------------------------
    // Marks
    //
    // A mark is just {col, row, tag}. _marks is the source of truth and
    // _marksByTag / _markCells are indexes over it - add to all three in
    // _addMark, drop all three in _clearAllMarks, and keep Clear Marks in
    // sync when it removes a single tag.
    // ---------------------------------------------------------------------

    _markCellKey(col, row) {
      return col + "," + row;
    }

    _addMark(col, row, tag) {
      const mark = { col, row, tag };
      this._marks.push(mark);

      let byTag = this._marksByTag.get(tag);
      if (!byTag) {
        byTag = [];
        this._marksByTag.set(tag, byTag);
      }
      byTag.push(mark);

      const key = this._markCellKey(col, row);
      let atCell = this._markCells.get(key);
      if (!atCell) {
        atCell = [];
        this._markCells.set(key, atCell);
      }
      atCell.push(mark);

      this._ctxMarkCol = col;
      this._ctxMarkRow = row;
      this._ctxMarkTag = tag;
      this._trigger("OnMarkPlaced");
    }

    // Spacing tester for one mark pass, pre-loaded with the same-tag marks
    // that already exist. Candidates are bucketed by the spacing radius so a
    // dense scatter stays near-linear instead of comparing every pair.
    // Distance is Euclidean, in cells.
    _makeSpacer(tag, minSpacing) {
      const min = Math.max(0, toNumber(minSpacing, 0));
      const size = Math.max(1, Math.ceil(min));
      const minSq = min * min;
      const buckets = new Map();

      const add = (col, row) => {
        const key = Math.floor(col / size) + "," + Math.floor(row / size);
        let list = buckets.get(key);
        if (!list) {
          list = [];
          buckets.set(key, list);
        }
        list.push(col, row);
      };

      const existing = this._marksByTag.get(tag);
      if (existing) {
        for (const mark of existing) add(mark.col, mark.row);
      }

      // Bucket size is the spacing radius, so any mark close enough to matter
      // is in one of the 9 buckets around the candidate.
      const accepts = (col, row) => {
        const bc = Math.floor(col / size);
        const br = Math.floor(row / size);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const list = buckets.get(bc + dc + "," + (br + dr));
            if (!list) continue;
            for (let i = 0; i < list.length; i += 2) {
              const ddc = list[i] - col;
              const ddr = list[i + 1] - row;
              // Two same-tag marks never stack, whatever the spacing.
              if (ddc === 0 && ddr === 0) return false;
              if (minSq > 0 && ddc * ddc + ddr * ddr < minSq) return false;
            }
          }
        }
        return true;
      };

      return { add, accepts };
    }

    // Placement filter for Scatter Marks. Interior wants all 8 neighbours
    // matching (open ground), edge wants at least one that does not (a wall
    // or the grid border).
    _placementOk(col, row, cellValue, placement) {
      if (placement === PLACEMENT.ANY) return true;
      const matching = this._countNeighbours(col, row, cellValue);
      if (placement === PLACEMENT.INTERIOR) return matching === 8;
      return matching < 8;
    }

    _clearAllMarks() {
      this._marks.length = 0;
      this._marksByTag.clear();
      this._markCells.clear();
    }

    // ---------------------------------------------------------------------
    // SDK hooks
    // ---------------------------------------------------------------------

    _release() {
      this._grid = new Int32Array(0);
      this._walkers.clear();
      this._clearAllMarks();
      this._cellCache = null;
      this._injectedQueue.length = 0;
      super._release();
    }

    // Read-only inspection values for the debugger panel. Aimed at "why is my
    // map empty": seed set after generation, walkers registered but never run.
    _getDebuggerProperties() {
      const gridProps = [
        { name: "$gridCols", value: this._cols },
        { name: "$gridRows", value: this._rows },
        { name: "$emptyValue", value: this._emptyValue },
        { name: "$seed", value: this._seed },
        {
          name: "$randomSource",
          value:
            this._randomSource === RANDOM_SOURCE.INJECTED
              ? "injected"
              : "internal_seeded",
        },
        {
          name: "$injectedRemaining",
          value: this._injectedQueue.length - this._injectedIndex,
        },
      ];

      // Counts come from an index that already exists - building one every
      // debug frame would stall on a large grid.
      if (this._cellCache && !this._cellCacheDirty) {
        for (const [value, list] of this._cellCache) {
          gridProps.push({ name: "$cells[" + value + "]", value: list.length });
        }
      } else {
        gridProps.push({ name: "$cells", value: "(not indexed yet)" });
      }

      const walkerProps = [{ name: "$count", value: this._walkers.size }];
      for (const walker of this._walkers.values()) {
        walkerProps.push({
          name: "$" + walker.id,
          value:
            "col " +
            walker.col +
            ", row " +
            walker.row +
            ", angle " +
            walker.angle +
            ", steps left " +
            walker.stepsLeft +
            (walker.finished ? ", finished" : ""),
        });
      }

      const markProps = [{ name: "$total", value: this._marks.length }];
      for (const [tag, list] of this._marksByTag) {
        markProps.push({
          name: "$" + (tag === "" ? "(untagged)" : tag),
          value: list.length,
        });
      }

      return [
        { title: "$Grid", properties: gridProps },
        { title: "$Walkers", properties: walkerProps },
        { title: "$Marks", properties: markProps },
      ];
    }

    // _prngState round-trips, so a mid-animation Step Walker sequence survives
    // a save and continues on the same stream. Any random state added later
    // must be saved here too or determinism breaks across save/load.
    _saveToJson() {
      const walkers = [];
      for (const walker of this._walkers.values()) {
        walkers.push({
          id: walker.id,
          tag: walker.tag,
          startCol: walker.startCol,
          startRow: walker.startRow,
          steps: walker.steps,
          directions: walker.directions,
          maxTurn: walker.maxTurn,
          startAngle: walker.startAngle,
          turnChance: walker.turnChance,
          carveValue: walker.carveValue,
          brushSize: walker.brushSize,
          brushWidth: walker.brushWidth,
          brushHeight: walker.brushHeight,
          weights: walker.weights,
          col: walker.col,
          row: walker.row,
          angle: walker.angle,
          stepsLeft: walker.stepsLeft,
          started: walker.started,
          finished: walker.finished,
          path: walker.path,
        });
      }

      return {
        cols: this._cols,
        rows: this._rows,
        emptyValue: this._emptyValue,
        maxGridSize: this._maxGridSize,
        cellSize: this._cellSize,
        originX: this._originX,
        originY: this._originY,
        seed: this._seed,
        prngState: this._prngState,
        randomSource: this._randomSource,
        // Only the unconsumed tail is worth keeping.
        injected: this._injectedQueue.slice(this._injectedIndex),
        debug: this._debug,
        grid: packInt32Array(this._grid),
        walkers,
        // Compact tuples: mark lists get long and this is JSON on disk.
        marks: this._marks.map((mark) => [mark.col, mark.row, mark.tag]),
      };
    }

    _loadFromJson(o) {
      if (!o) return;
      this._cols = Math.max(0, Math.floor(toNumber(o.cols, 0)));
      this._rows = Math.max(0, Math.floor(toNumber(o.rows, 0)));
      this._emptyValue = Math.floor(toNumber(o.emptyValue, 0)) | 0;
      this._maxGridSize = Math.max(
        1,
        Math.floor(toNumber(o.maxGridSize, 2048))
      );
      this._cellSize = toNumber(o.cellSize, 32) || 32;
      this._originX = toNumber(o.originX, 0);
      this._originY = toNumber(o.originY, 0);
      this._seed = o.seed === undefined ? "" : String(o.seed);
      this._prngState = toNumber(o.prngState, 0) >>> 0;
      this._randomSource =
        o.randomSource === RANDOM_SOURCE.INJECTED
          ? RANDOM_SOURCE.INJECTED
          : RANDOM_SOURCE.INTERNAL;
      this._injectedQueue = Array.isArray(o.injected) ? o.injected.slice() : [];
      this._injectedIndex = 0;
      this._debug = !!o.debug;

      this._grid = unpackInt32Array(o.grid, this._cols * this._rows);
      this._cellCache = null;
      this._cellCacheDirty = true;

      this._walkers.clear();
      if (Array.isArray(o.walkers)) {
        for (const saved of o.walkers) this._restoreWalker(saved);
      }

      // Rebuilt through _addMark's index structure by hand, because _addMark
      // would fire On Mark Placed for every restored mark.
      this._clearAllMarks();
      if (Array.isArray(o.marks)) {
        for (const entry of o.marks) {
          const mark = { col: entry[0], row: entry[1], tag: entry[2] };
          this._marks.push(mark);
          let byTag = this._marksByTag.get(mark.tag);
          if (!byTag) {
            byTag = [];
            this._marksByTag.set(mark.tag, byTag);
          }
          byTag.push(mark);
          const key = this._markCellKey(mark.col, mark.row);
          let atCell = this._markCells.get(key);
          if (!atCell) {
            atCell = [];
            this._markCells.set(key, atCell);
          }
          atCell.push(mark);
        }
      }

      this._ctxWalker = null;
      this._ctxTag = "";
    }

    // =====================================================================
    // ACE implementations
    //
    // One method per ACE, named after it. The files under src/aces declare
    // the editor-facing config and do nothing but call in here, so all
    // behaviour lives in this file and can be read and changed in one place.
    // Parameters arrive straight from the event sheet, so each method coerces
    // its own inputs rather than trusting them.
    // =====================================================================

    // --- Grid ------------------------------------------------------------

    // Create Grid. A 0 (or invalid) dimension falls back to the property
    // default; anything over Max Grid Size is clamped rather than allocated.
    _createGrid(width, height) {
      let cols = Math.floor(Number(width));
      let rows = Math.floor(Number(height));

      if (!Number.isFinite(cols) || cols <= 0) {
        if (Number.isFinite(cols) && cols < 0) {
          this._warn("Create Grid got a negative width, using the default");
        }
        cols = this._defaultCols;
      }
      if (!Number.isFinite(rows) || rows <= 0) {
        if (Number.isFinite(rows) && rows < 0) {
          this._warn("Create Grid got a negative height, using the default");
        }
        rows = this._defaultRows;
      }

      if (cols > this._maxGridSize) {
        this._warn("clamping grid width", cols, "to", this._maxGridSize);
        cols = this._maxGridSize;
      }
      if (rows > this._maxGridSize) {
        this._warn("clamping grid height", rows, "to", this._maxGridSize);
        rows = this._maxGridSize;
      }

      this._walkers.clear();
      this._clearAllMarks();
      this._allocGrid(cols, rows);
      this._log("created grid", cols, "x", rows);
    }

    // Clear Grid. Deliberately does not touch walkers, marks or the PRNG.
    _clearGrid(value) {
      this._grid.fill(Math.floor(Number(value)) | 0);
      this._cellCacheDirty = true;
    }

    // Set Cell. A silent write - see the note on _carveCell.
    _setCell(col, row, value) {
      const c = Math.floor(Number(col));
      const r = Math.floor(Number(row));
      if (!this._isInside(c, r)) return;
      this._grid[r * this._cols + c] = Math.floor(Number(value)) | 0;
      this._cellCacheDirty = true;
    }

    // Set Origin. A cell size of 0 means "keep the current one".
    _setOrigin(x, y, cellSize) {
      const px = Number(x);
      const py = Number(y);
      const size = Number(cellSize);
      if (Number.isFinite(px)) this._originX = px;
      if (Number.isFinite(py)) this._originY = py;
      if (Number.isFinite(size) && size > 0) this._cellSize = size;
    }

    // Is Cell Value. Out-of-bounds cells match nothing, not even Empty Value.
    _isCellValue(col, row, value) {
      const c = Math.floor(Number(col));
      const r = Math.floor(Number(row));
      if (!this._isInside(c, r)) return false;
      return this._grid[r * this._cols + c] === (Math.floor(Number(value)) | 0);
    }

    // Is Inside Grid.
    _isInsideGrid(col, row) {
      return this._isInside(Math.floor(Number(col)), Math.floor(Number(row)));
    }

    // CellValue.
    _cellValue(col, row) {
      return this._cellAt(Math.floor(Number(col)), Math.floor(Number(row)));
    }

    // GridCols / GridRows.
    _gridCols() {
      return this._cols;
    }

    _gridRows() {
      return this._rows;
    }

    // NeighbourCount.
    _neighbourCount(col, row, value) {
      return this._countNeighbours(
        Math.floor(Number(col)),
        Math.floor(Number(row)),
        Math.floor(Number(value)) | 0
      );
    }

    // CellToLayoutX / CellToLayoutY - centre of the cell in layout space.
    _cellToLayoutX(col) {
      return this._originX + (Number(col) + 0.5) * this._cellSize;
    }

    _cellToLayoutY(row) {
      return this._originY + (Number(row) + 0.5) * this._cellSize;
    }

    // LayoutToCol / LayoutToRow. May return coordinates outside the grid.
    _layoutToCol(x) {
      return Math.floor((Number(x) - this._originX) / this._cellSize);
    }

    _layoutToRow(y) {
      return Math.floor((Number(y) - this._originY) / this._cellSize);
    }

    // CountCells / GetCellColByIndex / GetCellRowByIndex - the iteration
    // trio, all reading the same stable row-major index.
    _countCells(value) {
      const list = this._cellsWithValue(Math.floor(Number(value)) | 0);
      return list ? list.length : 0;
    }

    _getCellColByIndex(value, index) {
      const list = this._cellsWithValue(Math.floor(Number(value)) | 0);
      const i = Math.floor(Number(index));
      if (!list || i < 0 || i >= list.length) return -1;
      return list[i] % this._cols;
    }

    _getCellRowByIndex(value, index) {
      const list = this._cellsWithValue(Math.floor(Number(value)) | 0);
      const i = Math.floor(Number(index));
      if (!list || i < 0 || i >= list.length) return -1;
      return Math.floor(list[i] / this._cols);
    }

    // --- Randomness ------------------------------------------------------
    // Set Seed maps straight onto _setSeed above, which the constructor and
    // _loadFromJson also use.

    // Set Random Source.
    _setRandomSource(source) {
      this._randomSource =
        source === RANDOM_SOURCE.INJECTED
          ? RANDOM_SOURCE.INJECTED
          : RANDOM_SOURCE.INTERNAL;
      this._log(
        "random source set to",
        this._randomSource === RANDOM_SOURCE.INJECTED
          ? "injected"
          : "internal_seeded"
      );
    }

    // Inject Random. Clamped to 0-1 so a stray value cannot push _randomInt
    // out of range.
    _injectRandom(value) {
      const v = Number(value);
      if (!Number.isFinite(v)) {
        this._warn("Inject Random got a non-numeric value, ignored");
        return;
      }
      this._injectedQueue.push(clamp(v, 0, 1));
    }

    // CurrentSeed.
    _currentSeed() {
      return this._seed;
    }

    // --- Walkers ---------------------------------------------------------

    // Add Walker - the common fields; the rest take WALKER_DEFAULTS.
    _addWalker(walkerId, startCol, startRow, steps, directions, maxTurn, tag) {
      this._registerWalker({
        id: walkerId,
        startCol,
        startRow,
        steps,
        directions,
        maxTurn,
        tag,
      });
    }

    // Define Walker - the full definition as JSON.
    _defineWalker(definition) {
      let parsed;
      try {
        parsed = JSON.parse(definition);
      } catch (e) {
        this._warn("Define Walker got invalid JSON:", definition);
        return;
      }
      if (!parsed || typeof parsed !== "object") {
        this._warn("Define Walker expects a JSON object");
        return;
      }
      this._registerWalker(parsed);
    }

    // Set Walker Direction Weights. Weights are positional: entry i is the
    // walker's direction i, where 0 is startAngle and the rest follow it
    // clockwise. An empty string restores equal weights.
    _setWalkerDirectionWeights(walkerId, weights) {
      const walker = this._walkers.get(String(walkerId));
      if (!walker) {
        this._warn("Set Walker Direction Weights: no walker", walkerId);
        return;
      }
      walker.weights = parseWeights(weights, walker.directions);
      this._log("walker", walker.id, "direction weights", walker.weights);
    }

    // Set Walker Dig Size. Width is measured across the heading, so it is the
    // corridor width, and height along the heading, so it is how far ahead the
    // walker clears. Passing 0 for a dimension falls back to the square brush
    // size for that axis, and 0 for both restores the plain square brush.
    _setWalkerDigSize(walkerId, width, height) {
      const walker = this._walkers.get(String(walkerId));
      if (!walker) {
        this._warn("Set Walker Dig Size: no walker", walkerId);
        return;
      }
      walker.brushWidth = normaliseDigExtent(width);
      walker.brushHeight = normaliseDigExtent(height);
      this._log(
        "walker", walker.id, "dig size",
        walker.brushWidth === null ? "brush" : walker.brushWidth,
        "x",
        walker.brushHeight === null ? "brush" : walker.brushHeight
      );
    }

    // Remove Walker. Cells it already carved are left alone.
    _removeWalker(walkerId) {
      this._walkers.delete(String(walkerId));
    }

    // Run All Walkers. Array.from() because a trigger handler could register
    // or remove a walker while we are iterating.
    _runAllWalkers() {
      for (const walker of Array.from(this._walkers.values())) {
        this._runWalkerToEnd(walker);
      }
      this._ctxWalker = null;
      this._ctxTag = "";
      this._trigger("OnGenerationComplete");
    }

    // Run Walkers By Tag. An empty tag runs only the untagged walkers.
    _runWalkersByTag(tag) {
      const batchTag = String(tag);
      for (const walker of Array.from(this._walkers.values())) {
        if (walker.tag !== batchTag) continue;
        this._runWalkerToEnd(walker);
      }
      // Set before the trigger so WalkerTag reads the batch tag inside it.
      this._ctxWalker = null;
      this._ctxTag = batchTag;
      this._trigger("OnWalkersByTagComplete");
    }

    // Run Walker. Does not fire On Generation Complete.
    _runWalker(walkerId) {
      const walker = this._walkers.get(String(walkerId));
      if (!walker) {
        this._warn("Run Walker: no walker registered with id", walkerId);
        return;
      }
      this._runWalkerToEnd(walker);
    }

    // Step Walker - the animated-generation path.
    _stepWalker(walkerId, steps) {
      const walker = this._walkers.get(String(walkerId));
      if (!walker) {
        this._warn("Step Walker: no walker registered with id", walkerId);
        return;
      }

      const count = Math.floor(Number(steps));
      if (!Number.isFinite(count) || count <= 0) return;

      this._beginWalker(walker);
      for (let i = 0; i < count; i++) {
        if (!this._advanceWalker(walker)) break;
        this._ctxWalker = walker;
        this._ctxTag = walker.tag;
        this._trigger("OnWalkerStepped");
      }
    }

    // Has Walker.
    _hasWalker(walkerId) {
      return this._walkers.has(String(walkerId));
    }

    // Filter for On Walker Stepped and On Walker Finished. Empty matches all.
    _walkerFilterMatches(walkerId) {
      const filter = String(walkerId);
      if (filter === "") return true;
      return !!this._ctxWalker && this._ctxWalker.id === filter;
    }

    // Filter for On Walkers By Tag Complete. Empty matches any batch.
    _batchFilterMatches(tag) {
      const filter = String(tag);
      if (filter === "") return true;
      return this._ctxTag === filter;
    }

    // Walker and carve context expressions. All read as 0 or "" outside their
    // own triggers, by design.
    _walkerCol() {
      return this._ctxWalker ? this._ctxWalker.col : 0;
    }

    _walkerRow() {
      return this._ctxWalker ? this._ctxWalker.row : 0;
    }

    _walkerAngle() {
      return this._ctxWalker ? this._ctxWalker.angle : 0;
    }

    _walkerStepsLeft() {
      return this._ctxWalker ? this._ctxWalker.stepsLeft : 0;
    }

    _walkerId() {
      return this._ctxWalker ? this._ctxWalker.id : "";
    }

    // Falls through to _ctxTag so that On Walkers By Tag Complete, which has
    // no triggering walker, can still report its batch tag.
    _walkerTag() {
      return this._ctxWalker ? this._ctxWalker.tag : this._ctxTag;
    }

    _carvedCol() {
      return this._ctxCarvedCol;
    }

    _carvedRow() {
      return this._ctxCarvedRow;
    }

    _carvedValue() {
      return this._ctxCarvedValue;
    }

    // --- Marks -----------------------------------------------------------

    // Drop Marks Along Walk: a candidate every N steps of a recorded walker
    // path, kept with the given chance, rejected if it crowds a same-tag mark.
    _dropMarksAlongWalk(walkerId, tag, everySteps, chance, minSpacing) {
      const walker = this._walkers.get(String(walkerId));
      if (!walker) {
        this._warn("Drop Marks Along Walk: no walker", walkerId);
        return;
      }

      const markTag = String(tag);
      const stride = Math.max(1, Math.floor(Number(everySteps)) || 1);
      const keepChance = Number(chance);
      const spacer = this._makeSpacer(markTag, minSpacing);

      const path = walker.path;
      const stepCount = path.length / 2;

      // Starts at `stride`, so the start cell is not automatically a
      // candidate - the first mark lands after N steps of walking.
      for (let step = stride; step < stepCount; step += stride) {
        const col = path[step * 2];
        const row = path[step * 2 + 1];
        // Drawn for every candidate whatever the chance, so tuning the
        // number does not shift the rest of the stream.
        if (this._random() >= keepChance) continue;
        if (!spacer.accepts(col, row)) continue;
        spacer.add(col, row);
        this._addMark(col, row, markTag);
      }
    }

    // Scatter Marks: up to `count` marks on cells holding `cellValue` that
    // pass the placement rule and the spacing test.
    _scatterMarks(tag, count, cellValue, placement, minSpacing) {
      const markTag = String(tag);
      const wanted = Math.max(0, Math.floor(Number(count)) || 0);
      if (wanted === 0) return;

      const rule =
        placement === PLACEMENT.INTERIOR || placement === PLACEMENT.EDGE
          ? placement
          : PLACEMENT.ANY;
      const value = Math.floor(Number(cellValue)) | 0;
      const cells = this._cellsWithValue(value);
      if (!cells || cells.length === 0) {
        this._warn("Scatter Marks found no cells holding", value);
        return;
      }

      const cols = this._cols;
      const eligible = [];
      for (let i = 0; i < cells.length; i++) {
        const index = cells[i];
        const col = index % cols;
        const row = Math.floor(index / cols);
        if (this._placementOk(col, row, value, rule)) eligible.push(index);
      }

      const spacer = this._makeSpacer(markTag, minSpacing);
      let placed = 0;

      // Partial Fisher-Yates: one draw per candidate examined, so the cost
      // tracks what is placed rather than the size of the grid.
      for (let i = 0; i < eligible.length && placed < wanted; i++) {
        const j = i + this._randomInt(eligible.length - i);
        const swap = eligible[i];
        eligible[i] = eligible[j];
        eligible[j] = swap;

        const index = eligible[i];
        const col = index % cols;
        const row = Math.floor(index / cols);
        if (!spacer.accepts(col, row)) continue;
        spacer.add(col, row);
        this._addMark(col, row, markTag);
        placed++;
      }

      if (placed < wanted) {
        this._warn(
          "Scatter Marks placed only",
          placed,
          "of",
          wanted,
          markTag,
          "marks - not enough eligible cells for the spacing"
        );
      }
    }

    // Clear Marks. An empty tag clears everything.
    _clearMarks(tag) {
      const markTag = String(tag);
      if (markTag === "") {
        this._clearAllMarks();
        return;
      }
      if (!this._marksByTag.has(markTag)) return;

      // All three structures have to stay in step - see the note on _addMark.
      this._marks = this._marks.filter((mark) => mark.tag !== markTag);
      this._marksByTag.delete(markTag);
      for (const [key, list] of Array.from(this._markCells)) {
        const kept = list.filter((mark) => mark.tag !== markTag);
        if (kept.length === 0) this._markCells.delete(key);
        else this._markCells.set(key, kept);
      }
    }

    // Has Mark At. An empty tag matches any mark.
    _hasMarkAt(col, row, tag) {
      const key = this._markCellKey(
        Math.floor(Number(col)),
        Math.floor(Number(row))
      );
      const list = this._markCells.get(key);
      if (!list || list.length === 0) return false;
      const markTag = String(tag);
      if (markTag === "") return true;
      return list.some((mark) => mark.tag === markTag);
    }

    // Filter for On Mark Placed. Empty matches all tags.
    _markFilterMatches(tag) {
      const filter = String(tag);
      if (filter === "") return true;
      return this._ctxMarkTag === filter;
    }

    // Shared by the two mark index expressions: an empty tag means every
    // mark, in placement order.
    _markListFor(tag) {
      const markTag = String(tag);
      return markTag === "" ? this._marks : this._marksByTag.get(markTag);
    }

    _countMarks(tag) {
      const list = this._markListFor(tag);
      return list ? list.length : 0;
    }

    _getMarkColByIndex(tag, index) {
      const list = this._markListFor(tag);
      const i = Math.floor(Number(index));
      if (!list || i < 0 || i >= list.length) return -1;
      return list[i].col;
    }

    _getMarkRowByIndex(tag, index) {
      const list = this._markListFor(tag);
      const i = Math.floor(Number(index));
      if (!list || i < 0 || i >= list.length) return -1;
      return list[i].row;
    }

    // Mark context expressions, valid inside On Mark Placed.
    _markCol() {
      return this._ctxMarkCol;
    }

    _markRow() {
      return this._ctxMarkRow;
    }

    _markTag() {
      return this._ctxMarkTag;
    }

    // --- Post-processing -------------------------------------------------

    // Dilate Cells. Every cell not already holding `value` but touching one
    // that does is converted, one ring per iteration.
    _dilateCells(value, iterations) {
      const target = Math.floor(Number(value)) | 0;
      const passes = Math.floor(Number(iterations));
      if (!Number.isFinite(passes) || passes <= 0) return;

      const cols = this._cols;
      const rows = this._rows;

      for (let pass = 0; pass < passes; pass++) {
        // Collected from a snapshot first, otherwise one iteration would
        // smear across the grid in the scan direction.
        const pending = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if (this._grid[row * cols + col] === target) continue;
            if (this._hasNeighbour(col, row, target)) pending.push(col, row);
          }
        }
        if (pending.length === 0) break;
        for (let i = 0; i < pending.length; i += 2) {
          this._carveCell(pending[i], pending[i + 1], target, null);
        }
      }
    }

    // Outline Cells - walls around the floor. Only Empty Value cells are
    // overwritten, so it never eats other terrain.
    _outlineCells(value, outlineValue) {
      const target = Math.floor(Number(value)) | 0;
      const outline = Math.floor(Number(outlineValue)) | 0;
      const cols = this._cols;
      const rows = this._rows;

      const pending = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (this._grid[row * cols + col] !== this._emptyValue) continue;
          if (this._hasNeighbour(col, row, target)) pending.push(col, row);
        }
      }

      for (let i = 0; i < pending.length; i += 2) {
        this._carveCell(pending[i], pending[i + 1], outline, null);
      }
    }
  };
}
