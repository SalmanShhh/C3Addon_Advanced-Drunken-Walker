export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Run walker",
  displayText: "{my} run walker [b]{0}[/b]",
  description:
    "Execute one walker to completion, firing its carve and finish triggers. Does not fire On Generation Complete.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to run.",
      type: "string",
      initialValue: '"main"',
    },
  ],
};

export const expose = true;

export default function (walkerId) {
  this._runWalker(walkerId);
}
