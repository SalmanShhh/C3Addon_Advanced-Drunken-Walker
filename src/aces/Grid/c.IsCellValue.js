export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is cell value",
  displayText: "Cell ([i]{0}[/i], [i]{1}[/i]) is [i]{2}[/i]",
  description:
    "True if the cell holds exactly the given value. Out-of-bounds cells match nothing.",
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
      desc: "The value to compare against.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (x, y, value) {
  return this._isCellValue(x, y, value);
}
