<img src="./src/icon.svg" width="100" /><br>
# Advanced Drunken Walkers
<i>Seeded drunkard's-walk generation engine. Carves organic maps with configurable walkers and scatters tagged marks - logic only, you draw the result.</i> <br>
### Version 1.0.0.0

[<img src="https://placehold.co/200x50/4493f8/FFF?text=Download&font=montserrat" width="200"/>](https://github.com/SalmanShhh/C3Addon_Advanced-Drunken-walker/releases/download/salmanshh_advdrunkenwalkers-1.0.0.0.c3addon/salmanshh_advdrunkenwalkers-1.0.0.0.c3addon)
<br>
<sub> [See all releases](https://github.com/SalmanShhh/C3Addon_Advanced-Drunken-walker/releases) </sub> <br>

#### What's New in 1.0.0.0
- **Added:** initial release

<sub>[View full changelog](#changelog)</sub>

---
<b><u>Author:</u></b> SalmanShh <br>
<sub>Made using [CAW](https://marketplace.visualstudio.com/items?itemName=skymen.caw) </sub><br>

## Table of Contents
- [Usage](#usage)
- [Examples Files](#examples-files)
- [Properties](#properties)
- [Actions](#actions)
- [Conditions](#conditions)
- [Expressions](#expressions)
---
## Usage
To build the addon, run the following commands:

```
npm i
npm run build
```

To run the dev server, run

```
npm i
npm run dev
```

## Examples Files

---
## Properties
| Property Name | Description | Type |
| --- | --- | --- |
| Grid Width | Columns created by Create Grid when it is called with a width of 0. | integer |
| Grid Height | Rows created by Create Grid when it is called with a height of 0. | integer |
| Max Grid Size | Hard cap on both axes. Create Grid clamps to this and warns in debug mode - a safety net against runaway expressions. | integer |
| Cell Size | Pixel size of one cell, used by the cell to layout coordinate expressions. | integer |
| Origin X | Layout X of the grid's top-left corner, for the coordinate expressions. | float |
| Origin Y | Layout Y of the grid's top-left corner, for the coordinate expressions. | float |
| Empty Value | The value the grid is filled with on creation and by Clear Grid. | integer |
| Seed | Initial seed. Leave empty to derive one from the current time (non-deterministic until Set Seed is called). | text |
| Random Source | Where random values come from: the built-in seeded PRNG, or the queue filled by Inject Random. | combo |
| Debug Mode | Log walker lifecycles, re-rolled boundary steps, clamped grid sizes and injected-queue underruns to the browser console. | check |


---
## Actions
| Action | Description | Params
| --- | --- | --- |
| Clear grid | Fill every cell with the given value without touching walkers, marks or the random stream. Does not fire On Cell Carved. | Value             *(number)* <br> |
| Create grid | Allocate the grid filled with the Empty Value, clamped to Max Grid Size. Pass 0 for either dimension to use the property default. Destroys any previous grid, walkers and marks. | Width             *(number)* <br>Height             *(number)* <br> |
| Set cell | Write one cell directly, useful for pre-placing anchors before walkers run. Does not fire On Cell Carved. | Column             *(number)* <br>Row             *(number)* <br>Value             *(number)* <br> |
| Set origin | Reposition the grid in layout space for the coordinate expressions. Pass 0 for the cell size to keep the current value. | X             *(number)* <br>Y             *(number)* <br>Cell Size             *(number)* <br> |
| Clear marks | Remove all marks with the tag. An empty string removes every mark. | Tag             *(string)* <br> |
| Drop marks along walk | Place tagged marks along a walker's recorded path: a candidate every N steps, kept with the given 0-1 chance, discarded when it lands within min spacing cells of a same-tag mark. Fires On Mark Placed per mark. | Walker ID             *(string)* <br>Tag             *(string)* <br>Every Steps             *(number)* <br>Chance             *(number)* <br>Min Spacing             *(number)* <br> |
| Scatter marks | Deterministically scatter up to count tagged marks onto cells holding the value. Interior requires all 8 neighbours to match (open areas), edge requires at least one that does not (against walls). Fires On Mark Placed per mark. | Tag             *(string)* <br>Count             *(number)* <br>Cell Value             *(number)* <br>Placement             *(combo)* <br>Min Spacing             *(number)* <br> |
| Dilate cells | Expand every region of the given value outward by one cell per iteration, widening corridors into chambers. Any cell with an 8-way neighbour holding the value is converted. Fires On Cell Carved for each newly converted cell. | Value             *(number)* <br>Iterations             *(number)* <br> |
| Outline cells | Write the outline value into every Empty Value cell adjacent 8-way to a cell holding the value - the classic put walls around the floor pass. Fires On Cell Carved for each written cell. | Value             *(number)* <br>Outline Value             *(number)* <br> |
| Inject random | Queue one 0-1 value for injected mode, for example AdvancedRandom.Random. A queue underrun during generation falls back to the internal PRNG and warns in debug mode. | Value             *(number)* <br> |
| Set random source | Switch where random values come from. In injected mode generation consumes the queue filled by Inject Random, which routes every decision through another plugin's stream. | Source             *(combo)* <br> |
| Set seed | Reset the internal PRNG with this seed. Call it before generation: the same seed with the same action order reproduces identical output. Pass AdvancedRandom.Seed here to share one master seed with the Advanced Random plugin. | Seed             *(string)* <br> |
| Add walker | Register a walker with the given core settings. Remaining fields use the Walker Definition defaults. Walkers run in registration order. | ID             *(string)* <br>Start Column             *(number)* <br>Start Row             *(number)* <br>Steps             *(number)* <br>Directions             *(number)* <br>Max Turn             *(number)* <br>Tag             *(string)* <br> |
| Define walker | Register a walker from a full Walker Definition JSON string, for example {"id":"cave","startCol":32,"startRow":32,"steps":400,"directions":8,"maxTurn":180,"startAngle":0,"turnChance":1,"carveValue":1,"brushSize":1,"tag":""}. Replaces any existing walker with the same id. | Definition             *(string)* <br> |
| Remove walker | Unregister the walker. Cells it already carved are unaffected. | ID             *(string)* <br> |
| Run all walkers | Execute every registered walker to the end of its step budget, in registration order, firing On Cell Carved per newly carved cell and On Walker Finished per walker, then On Generation Complete. |  |
| Run walker | Execute one walker to completion, firing its carve and finish triggers. Does not fire On Generation Complete. | ID             *(string)* <br> |
| Run walkers by tag | Execute every registered walker carrying the tag, in registration order, then fire On Walkers By Tag Complete. Lets you stage generation in passes. An empty tag runs only untagged walkers. | Tag             *(string)* <br> |
| Set walker dig size | Make a walker dig out a rectangle that turns with it instead of a fixed square. Width is measured across the direction it faces, so it is the corridor width, and is always centred. Depth is measured along that direction and is signed: a positive digs forward from the walker's own cell, a negative digs behind it, and either way its own cell is included, so 1 and -1 both mean just that cell. A walker facing right digs a corridor width cells tall, and the same walker facing down digs one width cells wide. Pass 0 for a dimension to fall back to the walker's brush size for that axis, and 0 for both to restore the plain square brush. | ID             *(string)* <br>Width             *(number)* <br>Depth             *(number)* <br> |
| Set walker direction weights | Bias which way a walker turns. Weights are relative, comma separated, one per direction in direction order: entry 0 is the walker's start angle and the rest follow it clockwise. A weight of 0 rules a direction out, and any entry you leave off counts as 1. Missing directions still apply, so "3,1,1" on an 8 direction walker weights the first three and leaves the other five at 1. Leave the string empty to go back to equal weights. | ID             *(string)* <br>Weights             *(string)* <br> |
| Step walker | Advance one walker by up to N steps, the animated-generation path. Fires On Walker Stepped per step and On Walker Finished when the budget is exhausted. | ID             *(string)* <br>Steps             *(number)* <br> |


---
## Conditions
| Condition | Description | Params
| --- | --- | --- |
| Is cell value | True if the cell holds exactly the given value. Out-of-bounds cells match nothing. | Column *(number)* <br>Row *(number)* <br>Value *(number)* <br> |
| Is inside grid | True if the coordinates fall within the current grid. | Column *(number)* <br>Row *(number)* <br> |
| Has mark at | True if a mark with the tag sits on that cell. An empty tag matches any mark. | Column *(number)* <br>Row *(number)* <br>Tag *(string)* <br> |
| On mark placed | Fires once per mark from Drop Marks Along Walk and Scatter Marks. Use MarkCol, MarkRow and MarkTag inside. An empty filter matches all tags. | Tag *(string)* <br> |
| Has walker | True if a walker with the id is currently registered. | ID *(string)* <br> |
| On cell carved | Fires once per cell whose value changes during walker runs, dilation or outlining. Use CarvedCol, CarvedRow, CarvedValue and WalkerID inside. On big grids prefer iterating results after generation over per-cell spawning here. |  |
| On generation complete | Fires after Run All Walkers finishes every walker. The idiomatic place to run mark passes and paint your tilemap via the Count and Index expressions. |  |
| On walker finished | Fires when a walker exhausts its step budget or runs out of legal moves. WalkerCol and WalkerRow give its final cell, useful for chaining the next walker onto this one's endpoint. An empty filter matches all walkers. | ID *(string)* <br> |
| On walkers by tag complete | Fires after a Run Walkers By Tag call finishes its whole batch. The batch tag is readable via WalkerTag inside. An empty filter matches any batch. | Tag *(string)* <br> |
| On walker stepped | Fires after each step of Step Walker only, batch runs skip it for speed. WalkerCol, WalkerRow, WalkerAngle and WalkerStepsLeft are valid inside. An empty filter matches all walkers. | ID *(string)* <br> |


---
## Expressions
| Expression | Description | Return Type | Params
| --- | --- | --- | --- |
| CellToLayoutX | Layout X of the cell's centre, from Origin X and Cell Size. | number | Column *(number)* <br> | 
| CellToLayoutY | Layout Y of the cell's centre, from Origin Y and Cell Size. | number | Row *(number)* <br> | 
| CellValue | Value at the cell. Returns the Empty Value for out-of-bounds queries. | number | Column *(number)* <br>Row *(number)* <br> | 
| CountCells | Total cells currently holding the value. Pairs with GetCellColByIndex and GetCellRowByIndex to iterate results. | number | Value *(number)* <br> | 
| GetCellColByIndex | Column of the index-th cell holding the value, 0-based in a stable row-major order. Returns -1 when out of range. | number | Value *(number)* <br>Index *(number)* <br> | 
| GetCellRowByIndex | Row of the index-th cell holding the value, 0-based in a stable row-major order. Returns -1 when out of range. | number | Value *(number)* <br>Index *(number)* <br> | 
| GridCols | Current grid width in cells. | number |  | 
| GridRows | Current grid height in cells. | number |  | 
| LayoutToCol | Column containing the layout X coordinate. May fall outside the grid. | number | X *(number)* <br> | 
| LayoutToRow | Row containing the layout Y coordinate. May fall outside the grid. | number | Y *(number)* <br> | 
| NeighbourCount | How many of the 8 neighbours hold the given value, handy for autotiling and custom placement rules. Off-grid neighbours never match. | number | Column *(number)* <br>Row *(number)* <br>Value *(number)* <br> | 
| CountMarks | Marks with the tag. An empty tag counts every mark. Pairs with GetMarkColByIndex and GetMarkRowByIndex to iterate results. | number | Tag *(string)* <br> | 
| GetMarkColByIndex | Column of the index-th mark with the tag, 0-based in placement order. Returns -1 when out of range. | number | Tag *(string)* <br>Index *(number)* <br> | 
| GetMarkRowByIndex | Row of the index-th mark with the tag, 0-based in placement order. Returns -1 when out of range. | number | Tag *(string)* <br>Index *(number)* <br> | 
| MarkCol | Column of the mark just placed, inside On Mark Placed. | number |  | 
| MarkRow | Row of the mark just placed, inside On Mark Placed. | number |  | 
| MarkTag | Tag of the mark just placed, inside On Mark Placed. | string |  | 
| CurrentSeed | The seed the PRNG was last set with. | string |  | 
| CarvedCol | Column of the cell just written, inside On Cell Carved. | number |  | 
| CarvedRow | Row of the cell just written, inside On Cell Carved. | number |  | 
| CarvedValue | Value just written into the cell, inside On Cell Carved. | number |  | 
| WalkerAngle | Current heading of the triggering walker in degrees, 0 = right and 90 = down. Reads 0 outside walker triggers. | number |  | 
| WalkerCol | Current column of the triggering walker. Reads 0 outside walker triggers. | number |  | 
| WalkerID | ID of the triggering walker, inside walker triggers and On Cell Carved. Empty for post-processing passes and outside triggers. | string |  | 
| WalkerRow | Current row of the triggering walker. Reads 0 outside walker triggers. | number |  | 
| WalkerStepsLeft | Remaining step budget of the triggering walker. Reads 0 outside walker triggers. | number |  | 
| WalkerTag | Tag of the triggering walker, inside walker triggers and On Cell Carved, or the batch tag inside On Walkers By Tag Complete. | string |  | 


---
## Changelog

**1.0.0.0**
- **Added:** initial release

**0.0.0.0**
- **Added:** Initial release.
