export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Value at the cell. Returns the Empty Value for out-of-bounds queries.",
  params: [
    { id: "col", name: "Column", desc: "Cell column.", type: "number" },
    { id: "row", name: "Row", desc: "Cell row.", type: "number" },
  ],
};

export const expose = true;

export default function (col, row) {
  return this._cellValue(col, row);
}
