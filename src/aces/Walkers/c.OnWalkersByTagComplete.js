export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  listName: "On walkers by tag complete",
  displayText: "On walkers tagged [i]{0}[/i] complete",
  description:
    "Fires after a Run Walkers By Tag call finishes its whole batch. The batch tag is readable via WalkerTag inside. An empty filter matches any batch.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Batch tag to match, or empty for any batch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (tag) {
  return this._batchFilterMatches(tag);
}
