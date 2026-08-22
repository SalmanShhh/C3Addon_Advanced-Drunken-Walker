export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Define walker",
  displayText: "{my} define walker from [i]{0}[/i]",
  description:
    'Register a walker from a full Walker Definition JSON string, for example {"id":"cave","startX":32,"startY":32,"steps":400,"directions":8,"maxTurn":180,"startAngle":0,"turnChance":1,"carveValue":1,"brushSize":1,"tag":""}. Replaces any existing walker with the same id.',
  params: [
    {
      id: "definition",
      name: "Definition",
      desc: "Walker Definition as a JSON string. Only id, startX and startY are required.",
      type: "string",
      initialValue: '"{\\"id\\":\\"main\\",\\"startX\\":0,\\"startY\\":0}"',
    },
  ],
};

export const expose = true;

export default function (definition) {
  this._defineWalker(definition);
}
