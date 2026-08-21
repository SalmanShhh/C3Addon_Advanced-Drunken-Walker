export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set random source",
  displayText: "{my} set random source to [i]{0}[/i]",
  description:
    "Switch where random values come from. In injected mode generation consumes the queue filled by Inject Random, which routes every decision through another plugin's stream.",
  params: [
    {
      id: "source",
      name: "Source",
      desc: "Which stream drives generation.",
      type: "combo",
      initialValue: "internal_seeded",
      // Item order defines the numeric value the runtime receives - it must
      // match RANDOM_SOURCE in src/runtime/constants.js.
      items: [{ internal_seeded: "Internal seeded" }, { injected: "Injected" }],
    },
  ],
};

export const expose = true;

export default function (source) {
  this._setRandomSource(source);
}
