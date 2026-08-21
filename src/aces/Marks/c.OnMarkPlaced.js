export const config = {
  highlight: true,
  isDeprecated: false,
  isTrigger: true,
  listName: "On mark placed",
  displayText: "On [i]{0}[/i] mark placed",
  description:
    "Fires once per mark from Drop Marks Along Walk and Scatter Marks. Use MarkCol, MarkRow and MarkTag inside. An empty filter matches all tags.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Mark tag to match, or empty for any tag.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (tag) {
  return this._markFilterMatches(tag);
}
