export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "How many of the 8 neighbours hold the given value, handy for autotiling and custom placement rules. Off-grid neighbours never match.",
  params: [
    { id: "col", name: "Column", desc: "Cell column.", type: "number" },
    { id: "row", name: "Row", desc: "Cell row.", type: "number" },
    {
      id: "value",
      name: "Value",
      desc: "The value to look for.",
      type: "number",
    },
  ],
};

export const expose = true;

export default function (col, row, value) {
  return this._neighbourCount(col, row, value);
}
