export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Scatter marks",
  displayText:
    "{my} scatter [i]{1}[/i] [i]{0}[/i] marks on cells valued [i]{2}[/i], placement [i]{3}[/i], min spacing [i]{4}[/i]",
  description:
    "Deterministically scatter up to count tagged marks onto cells holding the value. Interior requires all 8 neighbours to match (open areas), edge requires at least one that does not (against walls). Fires On Mark Placed per mark.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Tag given to every mark placed by this pass.",
      type: "string",
      initialValue: '"enemy"',
    },
    {
      id: "count",
      name: "Count",
      desc: "How many marks to place at most.",
      type: "number",
      initialValue: "10",
    },
    {
      id: "cellValue",
      name: "Cell Value",
      desc: "Only cells holding this value are eligible.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "placement",
      name: "Placement",
      desc: "Which eligible cells to use.",
      type: "combo",
      initialValue: "any",
      // Item order defines the numeric value the runtime receives - it must
      // match PLACEMENT in src/runtime/constants.js.
      items: [{ any: "Any" }, { interior: "Interior" }, { edge: "Edge" }],
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

export default function (tag, count, cellValue, placement, minSpacing) {
  this._scatterMarks(tag, count, cellValue, placement, minSpacing);
}
