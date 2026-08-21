export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker direction weights",
  displayText: "{my} set walker [b]{0}[/b] direction weights to [i]{1}[/i]",
  description:
    "Bias which way a walker turns. Weights are relative, comma separated, one per direction in direction order: entry 0 is the walker's start angle and the rest follow it clockwise. A weight of 0 rules a direction out, and any entry you leave off counts as 1. Missing directions still apply, so \"3,1,1\" on an 8 direction walker weights the first three and leaves the other five at 1. Leave the string empty to go back to equal weights.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to weight.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "weights",
      name: "Weights",
      desc: 'Comma separated relative weights in direction order, e.g. "4,2,1,0,0,0,1,2". Empty restores equal weights.',
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (walkerId, weights) {
  this._setWalkerDirectionWeights(walkerId, weights);
}
