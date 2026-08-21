export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Inject random",
  displayText: "{my} inject random value [i]{0}[/i]",
  description:
    "Queue one 0-1 value for injected mode, for example AdvancedRandom.Random. A queue underrun during generation falls back to the internal PRNG and warns in debug mode.",
  params: [
    {
      id: "value",
      name: "Value",
      desc: "A value between 0 and 1.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (value) {
  this._injectRandom(value);
}
