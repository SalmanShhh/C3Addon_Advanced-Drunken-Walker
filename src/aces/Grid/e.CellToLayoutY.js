export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Layout Y of the cell's centre, from Origin Y and Cell Size.",
  params: [{ id: "row", name: "Row", desc: "Cell row.", type: "number" }],
};

export const expose = true;

export default function (row) {
  return this._cellToLayoutY(row);
}
