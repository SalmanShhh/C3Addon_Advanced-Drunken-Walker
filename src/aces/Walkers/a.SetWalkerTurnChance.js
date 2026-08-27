export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker turn chance",
  displayText: "{my} set walker [b]{0}[/b] turn chance to [i]{1}[/i]",
  description:
    "Set the probability per step, 0 to 1, that a walker considers turning at all. Low values give long straight runs between turns; 1 lets it reconsider its heading every step.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to change.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "chance",
      name: "Turn Chance",
      desc: "Probability from 0 to 1 that the walker considers turning each step.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (walkerId, chance) {
  this._setWalkerTurnChance(walkerId, chance);
}
