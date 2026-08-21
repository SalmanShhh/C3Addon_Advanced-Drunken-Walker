export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Column containing the layout X coordinate. May fall outside the grid.",
  params: [{ id: "x", name: "X", desc: "Layout X coordinate.", type: "number" }],
};

export const expose = true;

export default function (x) {
  return this._layoutToCol(x);
}
