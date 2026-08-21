export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Remove walker",
  displayText: "{my} remove walker [b]{0}[/b]",
  description:
    "Unregister the walker. Cells it already carved are unaffected.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to remove.",
      type: "string",
      initialValue: '"main"',
    },
  ],
};

export const expose = true;

export default function (walkerId) {
  this._removeWalker(walkerId);
}
