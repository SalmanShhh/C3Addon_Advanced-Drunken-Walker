export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Row of the cell just written, inside On Cell Carved.",
  params: [],
};

export const expose = true;

export default function () {
  return this._carvedRow();
}
