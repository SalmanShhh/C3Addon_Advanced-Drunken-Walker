export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Is cell value",
  displayText: "Cell ([i]{0}[/i], [i]{1}[/i]) is [i]{2}[/i]",
  description:
    "True if the cell holds exactly the given value. Out-of-bounds cells match nothing.",
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

export default function (col, row, value) {
  return this._isCellValue(col, row, value);
}
