export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker steps",
  displayText: "{my} set walker [b]{0}[/b] steps to [i]{1}[/i]",
  description:
    "Set a walker's step budget. The value becomes its remaining steps, and a finished walker given steps is un-finished, so you can top a walker up and run it again to extend its path.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to change.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "steps",
      name: "Steps",
      desc: "The walker's new remaining step budget.",
      type: "number",
      initialValue: "400",
    },
  ],
};

export const expose = true;

export default function (walkerId, steps) {
  this._setWalkerSteps(walkerId, steps);
}
