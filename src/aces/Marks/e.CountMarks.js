export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Marks with the tag. An empty tag counts every mark. Pairs with GetMarkXByIndex and GetMarkYByIndex to iterate results.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Mark tag, or empty for all marks.",
      type: "string",
    },
  ],
};

export const expose = true;

export default function (tag) {
  return this._countMarks(tag);
}
