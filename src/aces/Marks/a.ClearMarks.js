export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Clear marks",
  displayText: "{my} clear marks tagged [i]{0}[/i]",
  description:
    "Remove all marks with the tag. An empty string removes every mark.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Tag to clear, or empty to clear every mark.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._clearMarks(tag);
}
