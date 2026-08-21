export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Drop marks along walk",
  displayText:
    "{my} drop [i]{1}[/i] marks along walker [b]{0}[/b] every [i]{2}[/i] steps, chance [i]{3}[/i], min spacing [i]{4}[/i]",
  description:
    "Place tagged marks along a walker's recorded path: a candidate every N steps, kept with the given 0-1 chance, discarded when it lands within min spacing cells of a same-tag mark. Fires On Mark Placed per mark.",
  params: [
    {
      id: "walkerId",
      name: "Walker ID",
      desc: "The walker whose path to walk along.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "tag",
      name: "Tag",
      desc: "Tag given to every mark placed by this pass.",
      type: "string",
      initialValue: '"coin"',
    },
    {
      id: "everySteps",
      name: "Every Steps",
      desc: "Consider a candidate every N steps of the walk.",
      type: "number",
      initialValue: "10",
    },
    {
      id: "chance",
      name: "Chance",
      desc: "Probability from 0 to 1 that a candidate is kept.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "minSpacing",
      name: "Min Spacing",
      desc: "Minimum distance in cells between two marks of this tag. 0 still prevents two marks stacking on one cell.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (walkerId, tag, everySteps, chance, minSpacing) {
  this._dropMarksAlongWalk(walkerId, tag, everySteps, chance, minSpacing);
}
