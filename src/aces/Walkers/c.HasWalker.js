export const config = {
  highlight: false,
  isDeprecated: false,
  listName: "Has walker",
  displayText: "Walker [b]{0}[/b] is registered",
  description: "True if a walker with the id is currently registered.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "Walker ID to look for.",
      type: "string",
      initialValue: '"main"',
    },
  ],
};

export const expose = true;

export default function (walkerId) {
  return this._hasWalker(walkerId);
}
