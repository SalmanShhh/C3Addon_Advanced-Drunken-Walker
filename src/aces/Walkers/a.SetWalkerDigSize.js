export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker dig size",
  displayText:
    "{my} set walker [b]{0}[/b] dig size to [i]{1}[/i] wide by [i]{2}[/i] deep",
  description:
    "Make a walker dig out a rectangle that turns with it instead of a fixed square. Width is measured across the direction it faces, so it is the corridor width, and is always centred. Depth is measured along that direction and is signed: a positive digs forward from the walker's own cell, a negative digs behind it, and either way its own cell is included, so 1 and -1 both mean just that cell. A walker facing right digs a corridor width cells tall, and the same walker facing down digs one width cells wide. Pass 0 for a dimension to fall back to the walker's brush size for that axis, and 0 for both to restore the plain square brush.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to resize.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "width",
      name: "Width",
      desc: "Cells across the direction the walker faces, so the corridor width. Always centred. 0 uses the brush size.",
      type: "number",
      initialValue: "3",
    },
    {
      id: "depth",
      name: "Depth",
      desc: "Cells along the direction the walker faces. Positive digs ahead of the walker, negative digs behind it, and its own cell is always included. 0 uses the brush size.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (walkerId, width, depth) {
  this._setWalkerDigSize(walkerId, width, depth);
}
