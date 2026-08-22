export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Total cells currently holding the value. Pairs with GetCellXByIndex and GetCellYByIndex to iterate results.",
  params: [
    {
      id: "value",
      name: "Value",
      desc: "The value to count.",
      type: "number",
    },
  ],
};

export const expose = true;

export default function (value) {
  return this._countCells(value);
}
