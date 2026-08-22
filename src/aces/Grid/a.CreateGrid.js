export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Create grid",
  displayText: "{my} create grid [i]{0}[/i] x [i]{1}[/i]",
  description:
    "Only needed for a size other than the Grid Width and Grid Height properties - the grid those describe already exists when the layout starts. Allocates a fresh grid filled with the Empty Value, clamped to Max Grid Size. Pass a negative for either dimension to fall back to that property. Destroys any previous grid, walkers and marks.",
  params: [
    {
      id: "width",
      name: "Width",
      desc: "Grid width in cells. Negative falls back to the Grid Width property.",
      type: "number",
      initialValue: "-1",
    },
    {
      id: "height",
      name: "Height",
      desc: "Grid height in cells. Negative falls back to the Grid Height property.",
      type: "number",
      initialValue: "-1",
    },
  ],
};

export const expose = true;

export default function (width, height) {
  this._createGrid(width, height);
}
