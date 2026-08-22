export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Has mark at",
  displayText: "Cell ([i]{0}[/i], [i]{1}[/i]) has a [i]{2}[/i] mark",
  description:
    "True if a mark with the tag sits on that cell. An empty tag matches any mark.",
  params: [
    {
      id: "x",
      name: "X",
      desc: "Cell X, 0 at the left edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "y",
      name: "Y",
      desc: "Cell Y, 0 at the top edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "tag",
      name: "Tag",
      desc: "Mark tag to look for, or empty for any mark.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (x, y, tag) {
  return this._hasMarkAt(x, y, tag);
}
