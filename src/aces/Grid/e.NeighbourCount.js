export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "How many of the 8 neighbours hold the given value, handy for autotiling and custom placement rules. Off-grid neighbours never match.",
  params: [
    { id: "x", name: "X", desc: "Cell X, 0 at the left edge.", type: "number" },
    { id: "y", name: "Y", desc: "Cell Y, 0 at the top edge.", type: "number" },
    {
      id: "value",
      name: "Value",
      desc: "The value to look for.",
      type: "number",
    },
  ],
};

export const expose = true;

export default function (x, y, value) {
  return this._neighbourCount(x, y, value);
}
