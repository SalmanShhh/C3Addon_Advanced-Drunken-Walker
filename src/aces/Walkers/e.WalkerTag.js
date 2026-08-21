export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description:
    "Tag of the triggering walker, inside walker triggers and On Cell Carved, or the batch tag inside On Walkers By Tag Complete.",
  params: [],
};

export const expose = true;

export default function () {
  return this._walkerTag();
}
