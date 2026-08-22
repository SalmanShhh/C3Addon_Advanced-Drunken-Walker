export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Cell Y containing the layout Y coordinate. May fall outside the grid.",
  params: [{ id: "y", name: "Y", desc: "Layout Y coordinate.", type: "number" }],
};

export const expose = true;

export default function (y) {
  return this._layoutToY(y);
}
