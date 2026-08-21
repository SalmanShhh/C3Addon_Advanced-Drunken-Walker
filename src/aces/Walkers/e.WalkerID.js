export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description:
    "ID of the triggering walker, inside walker triggers and On Cell Carved. Empty for post-processing passes and outside triggers.",
  params: [],
};

export const expose = true;

export default function () {
  return this._walkerId();
}
