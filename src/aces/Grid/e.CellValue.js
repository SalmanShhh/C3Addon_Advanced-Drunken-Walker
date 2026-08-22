export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Value at the cell. Returns the Empty Value for out-of-bounds queries.",
  params: [
    { id: "x", name: "X", desc: "Cell X, 0 at the left edge.", type: "number" },
    { id: "y", name: "Y", desc: "Cell Y, 0 at the top edge.", type: "number" },
  ],
};

export const expose = true;

export default function (x, y) {
  return this._cellValue(x, y);
}
