export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Has mark at",
  displayText: "Cell ([i]{0}[/i], [i]{1}[/i]) has a [i]{2}[/i] mark",
  description:
    "True if a mark with the tag sits on that cell. An empty tag matches any mark.",
  params: [
    {
      id: "col",
      name: "Column",
      desc: "Cell column.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "row",
      name: "Row",
      desc: "Cell row.",
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

export default function (col, row, tag) {
  return this._hasMarkAt(col, row, tag);
}
