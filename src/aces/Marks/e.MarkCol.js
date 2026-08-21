export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Column of the mark just placed, inside On Mark Placed.",
  params: [],
};

export const expose = true;

export default function () {
  return this._markCol();
}
