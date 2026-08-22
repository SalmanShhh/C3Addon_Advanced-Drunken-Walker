export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is inside grid",
  displayText: "([i]{0}[/i], [i]{1}[/i]) is inside the grid",
  description: "True if the coordinates fall within the current grid.",
  params: [
    {
      id: "x",
      name: "X",
      desc: "Cell X, 0 at the left edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "y",
      name: "Y",
      desc: "Cell Y, 0 at the top edge.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (x, y) {
  return this._isInsideGrid(x, y);
}
