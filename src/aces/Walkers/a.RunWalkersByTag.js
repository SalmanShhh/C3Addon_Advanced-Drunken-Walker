export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Run walkers by tag",
  displayText: "{my} run walkers tagged [i]{0}[/i]",
  description:
    "Execute every registered walker carrying the tag, in registration order, then fire On Walkers By Tag Complete. Lets you stage generation in passes. An empty tag runs only untagged walkers.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Walker tag to run. Empty runs only untagged walkers.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._runWalkersByTag(tag);
}
