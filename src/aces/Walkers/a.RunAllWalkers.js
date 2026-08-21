export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Run all walkers",
  displayText: "{my} run all walkers",
  description:
    "Execute every registered walker to the end of its step budget, in registration order, firing On Cell Carved per newly carved cell and On Walker Finished per walker, then On Generation Complete.",
  params: [],
};

export const expose = true;

export default function () {
  this._runAllWalkers();
}
