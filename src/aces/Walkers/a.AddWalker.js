export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Add walker",
  displayText:
    "{my} add walker [b]{0}[/b] at ([i]{1}[/i], [i]{2}[/i]), [i]{3}[/i] steps, [i]{4}[/i] directions, max turn [i]{5}[/i], tag [i]{6}[/i], carving [i]{7}[/i]",
  description:
    "Register a walker with the given core settings, including the value it carves. Remaining fields use the Walker Definition defaults. Walkers run in registration order.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "Unique ID for this walker. Re-using an ID replaces that walker in place.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "startX",
      name: "Start X",
      desc: "Starting cell X, 0 at the left edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "startY",
      name: "Start Y",
      desc: "Starting cell Y, 0 at the top edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "steps",
      name: "Steps",
      desc: "Total step budget.",
      type: "number",
      initialValue: "400",
    },
    {
      id: "directions",
      name: "Directions",
      desc: "Allowed headings, 1 to 8, evenly spaced from the start angle. 4 gives cardinal corridors, 8 allows diagonals, 1 walks a straight line.",
      type: "number",
      initialValue: "8",
    },
    {
      id: "maxTurn",
      name: "Max Turn",
      desc: "Largest heading change per step in degrees, 0 to 180. Low values wind smoothly, 180 gives classic jittery caves.",
      type: "number",
      initialValue: "180",
    },
    {
      id: "tag",
      name: "Tag",
      desc: "Groups walkers for Run Walkers By Tag. Empty for untagged.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "carveValue",
      name: "Carve Value",
      desc: "The integer this walker writes into every cell it visits. Give each walker its own value to layer floors, water, ore and decoration in one grid, then read them back per value.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (
  walkerId,
  startX,
  startY,
  steps,
  directions,
  maxTurn,
  tag,
  carveValue
) {
  this._addWalker(
    walkerId,
    startX,
    startY,
    steps,
    directions,
    maxTurn,
    tag,
    carveValue
  );
}
