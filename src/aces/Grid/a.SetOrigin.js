export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set origin",
  displayText:
    "{my} set grid origin to ([i]{0}[/i], [i]{1}[/i]) with cell size [i]{2}[/i]",
  description:
    "Reposition the grid in layout space for the coordinate expressions. Pass 0 for the cell size to keep the current value.",
  params: [
    {
      id: "x",
      name: "X",
      desc: "Layout X of the grid's top-left corner.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "y",
      name: "Y",
      desc: "Layout Y of the grid's top-left corner.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "cellSize",
      name: "Cell Size",
      desc: "Pixel size of one cell, or 0 to keep the current value.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (x, y, cellSize) {
  this._setOrigin(x, y, cellSize);
}
