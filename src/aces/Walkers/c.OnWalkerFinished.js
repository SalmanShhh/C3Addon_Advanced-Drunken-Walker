export const config = {
  highlight: true,
  isDeprecated: false,
  isTrigger: true,
  listName: "On walker finished",
  displayText: "On walker [b]{0}[/b] finished",
  description:
    "Fires when a walker exhausts its step budget or runs out of legal moves. WalkerCol and WalkerRow give its final cell, useful for chaining the next walker onto this one's endpoint. An empty filter matches all walkers.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "Walker ID to match, or empty for any walker.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (walkerId) {
  return this._walkerFilterMatches(walkerId);
}
