export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Step walker",
  displayText: "{my} step walker [b]{0}[/b] by [i]{1}[/i]",
  description:
    "Advance one walker by up to N steps, the animated-generation path. Fires On Walker Stepped per step and On Walker Finished when the budget is exhausted.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to step.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "steps",
      name: "Steps",
      desc: "How many steps to advance at most.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (walkerId, steps) {
  this._stepWalker(walkerId, steps);
}
