export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is inside grid",
  displayText: "([i]{0}[/i], [i]{1}[/i]) is inside the grid",
  description: "True if the coordinates fall within the current grid.",
  params: [
    {
      id: "col",
      name: "Column",
      desc: "Cell column.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "row",
      name: "Row",
      desc: "Cell row.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (col, row) {
  return this._isInsideGrid(col, row);
}
