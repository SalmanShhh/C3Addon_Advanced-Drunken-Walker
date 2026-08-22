export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "X of the index-th mark with the tag, 0-based in placement order. Returns -1 when out of range.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Mark tag, or empty for all marks.",
      type: "string",
    },
    { id: "index", name: "Index", desc: "0-based index.", type: "number" },
  ],
};

export const expose = true;

export default function (tag, index) {
  return this._getMarkXByIndex(tag, index);
}
