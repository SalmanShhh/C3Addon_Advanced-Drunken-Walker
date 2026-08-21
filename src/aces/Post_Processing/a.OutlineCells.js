export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Outline cells",
  displayText: "{my} outline cells valued [i]{0}[/i] with [i]{1}[/i]",
  description:
    "Write the outline value into every Empty Value cell adjacent 8-way to a cell holding the value - the classic put walls around the floor pass. Fires On Cell Carved for each written cell.",
  params: [
    {
      id: "value",
      name: "Value",
      desc: "The value to outline, for example your floor value.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "outlineValue",
      name: "Outline Value",
      desc: "The value written into the surrounding empty cells.",
      type: "number",
      initialValue: "2",
    },
  ],
};

export const expose = true;

export default function (value, outlineValue) {
  this._outlineCells(value, outlineValue);
}
