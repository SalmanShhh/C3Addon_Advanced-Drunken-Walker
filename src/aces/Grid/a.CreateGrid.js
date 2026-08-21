export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Create grid",
  displayText: "{my} create grid [i]{0}[/i] x [i]{1}[/i]",
  description:
    "Allocate the grid filled with the Empty Value, clamped to Max Grid Size. Pass 0 for either dimension to use the property default. Destroys any previous grid, walkers and marks.",
  params: [
    {
      id: "width",
      name: "Width",
      desc: "Columns, or 0 to use the Grid Width property.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "height",
      name: "Height",
      desc: "Rows, or 0 to use the Grid Height property.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (width, height) {
  this._createGrid(width, height);
}
