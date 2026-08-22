export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Layout X of the cell's centre, from Origin X and Cell Size.",
  params: [{ id: "x", name: "X", desc: "Cell X, 0 at the left edge.", type: "number" }],
};

export const expose = true;

export default function (x) {
  return this._cellToLayoutX(x);
}
