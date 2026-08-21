export const config = {
  highlight: false,
  isDeprecated: false,
  isTrigger: true,
  listName: "On walker stepped",
  displayText: "On walker [b]{0}[/b] stepped",
  description:
    "Fires after each step of Step Walker only, batch runs skip it for speed. WalkerCol, WalkerRow, WalkerAngle and WalkerStepsLeft are valid inside. An empty filter matches all walkers.",
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
