export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker carve value",
  displayText: "{my} set walker [b]{0}[/b] carve value to [i]{1}[/i]",
  description:
    "Change the integer a walker writes into the cells it visits. It applies from the walker's next step, so cells it has already carved keep their old value. Set it before running the walker to pick that walker's terrain, or change it mid-run from On Walker Stepped to lay down two values along one path.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to change.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "value",
      name: "Carve Value",
      desc: "The integer written into every cell the walker visits from now on.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (walkerId, value) {
  this._setWalkerCarveValue(walkerId, value);
}
