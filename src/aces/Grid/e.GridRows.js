export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Current grid height in cells.",
  params: [],
};

export const expose = true;

export default function () {
  return this._gridRows();
}
