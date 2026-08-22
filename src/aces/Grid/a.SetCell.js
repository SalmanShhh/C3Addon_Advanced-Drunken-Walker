export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set cell",
  displayText: "{my} set cell ([i]{0}[/i], [i]{1}[/i]) to [i]{2}[/i]",
  description:
    "Write one cell directly, useful for pre-placing anchors before walkers run. Does not fire On Cell Carved.",
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
    {
      id: "value",
      name: "Value",
      desc: "The value to write.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (x, y, value) {
  this._setCell(x, y, value);
}
