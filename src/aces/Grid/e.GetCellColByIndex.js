export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Column of the index-th cell holding the value, 0-based in a stable row-major order. Returns -1 when out of range.",
  params: [
    { id: "value", name: "Value", desc: "The value to look up.", type: "number" },
    { id: "index", name: "Index", desc: "0-based index.", type: "number" },
  ],
};

export const expose = true;

export default function (value, index) {
  return this._getCellColByIndex(value, index);
}
