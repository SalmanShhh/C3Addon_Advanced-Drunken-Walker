export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Dilate cells",
  displayText: "{my} dilate cells valued [i]{0}[/i] by [i]{1}[/i] iterations",
  description:
    "Expand every region of the given value outward by one cell per iteration, widening corridors into chambers. Any cell with an 8-way neighbour holding the value is converted. Fires On Cell Carved for each newly converted cell.",
  params: [
    {
      id: "value",
      name: "Value",
      desc: "The value whose regions grow.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "iterations",
      name: "Iterations",
      desc: "How many times to expand by one cell.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (value, iterations) {
  this._dilateCells(value, iterations);
}
