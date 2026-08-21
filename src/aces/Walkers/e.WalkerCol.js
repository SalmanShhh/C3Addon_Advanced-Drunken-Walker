export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Current column of the triggering walker. Reads 0 outside walker triggers.",
  params: [],
};

export const expose = true;

export default function () {
  return this._walkerCol();
}
