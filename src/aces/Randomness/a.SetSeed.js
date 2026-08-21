export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Set seed",
  displayText: "{my} set seed to [i]{0}[/i]",
  description:
    "Reset the internal PRNG with this seed. Call it before generation: the same seed with the same action order reproduces identical output. Pass AdvancedRandom.Seed here to share one master seed with the Advanced Random plugin.",
  params: [
    {
      id: "seed",
      name: "Seed",
      desc: "Seed string. Empty derives one from the current time.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (seed) {
  this._setSeed(seed);
}
