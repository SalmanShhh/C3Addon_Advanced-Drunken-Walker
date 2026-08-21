export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Layout X of the cell's centre, from Origin X and Cell Size.",
  params: [{ id: "col", name: "Column", desc: "Cell column.", type: "number" }],
};

export const expose = true;

export default function (col) {
  return this._cellToLayoutX(col);
}
