export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Add walker",
  displayText:
    "{my} add walker [b]{0}[/b] at ([i]{1}[/i], [i]{2}[/i]), [i]{3}[/i] steps, [i]{4}[/i] directions, max turn [i]{5}[/i], tag [i]{6}[/i]",
  description:
    "Register a walker with the given core settings. Remaining fields use the Walker Definition defaults. Walkers run in registration order.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "Unique ID for this walker. Re-using an ID replaces that walker in place.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "startCol",
      name: "Start Column",
      desc: "Starting cell column.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "startRow",
      name: "Start Row",
      desc: "Starting cell row.",
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
  ],
};

export const expose = true;

export default function (walkerId, startCol, startRow, steps, directions, maxTurn, tag) {
  this._addWalker(
    walkerId,
    startCol,
    startRow,
    steps,
    directions,
    maxTurn,
    tag
  );
}
