export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Clear grid",
  displayText: "{my} clear grid to [i]{0}[/i]",
  description:
    "Fill every cell with the given value without touching walkers, marks or the random stream. Does not fire On Cell Carved.",
  params: [
    {
      id: "value",
      name: "Value",
      desc: "The value written into every cell.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (value) {
  this._clearGrid(value);
}
