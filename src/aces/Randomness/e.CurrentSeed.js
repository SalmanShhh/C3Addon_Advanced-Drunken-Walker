export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "string",
  description: "The seed the PRNG was last set with.",
  params: [],
};

export const expose = true;

export default function () {
  return this._currentSeed();
}
