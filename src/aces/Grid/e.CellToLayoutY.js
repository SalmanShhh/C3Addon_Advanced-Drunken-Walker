export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Layout Y of the cell's centre, from Origin Y and Cell Size.",
  params: [{ id: "y", name: "Y", desc: "Cell Y, 0 at the top edge.", type: "number" }],
};

export const expose = true;

export default function (y) {
  return this._cellToLayoutY(y);
}
