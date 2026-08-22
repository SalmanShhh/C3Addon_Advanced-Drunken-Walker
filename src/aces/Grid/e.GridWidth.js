export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description: "Current grid width in cells.",
  params: [],
};

export const expose = true;

export default function () {
  return this._gridWidth();
}
