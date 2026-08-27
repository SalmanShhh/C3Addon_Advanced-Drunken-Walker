export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker brush size",
  displayText: "{my} set walker [b]{0}[/b] brush size to [i]{1}[/i]",
  description:
    "Set the square brush a walker stamps each step: 1 carves a single cell, 3 a 3x3 block. The square brush never rotates; for a corridor that turns with the walker use Set Walker Dig Size instead, which overrides this while set.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to change.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "size",
      name: "Brush Size",
      desc: "Square brush edge in cells, minimum 1.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (walkerId, size) {
  this._setWalkerBrushSize(walkerId, size);
}
