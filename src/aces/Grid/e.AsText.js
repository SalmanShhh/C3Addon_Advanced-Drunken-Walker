export const config = {
  highlight: true,
  isDeprecated: false,
  returnType: "string",
  description:
    'The grid as text, one character per cell and one line per row. Character N of Characters stands for value N, so ".#" shows empty cells as dots and value 1 as #; values with no character show as ?. Set a Text object to this to see the whole map at a glance.',
  params: [
    {
      id: "characters",
      name: "Characters",
      desc: 'One character per value, in value order. ".#" maps value 0 to a dot and value 1 to #.',
      type: "string",
    },
  ],
};

export const expose = true;

export default function (characters) {
  return this._asText(characters);
}
