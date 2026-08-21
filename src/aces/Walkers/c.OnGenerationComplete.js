export const config = {
  highlight: true,
  isDeprecated: false,
  isTrigger: true,
  listName: "On generation complete",
  displayText: "On generation complete",
  description:
    "Fires after Run All Walkers finishes every walker. The idiomatic place to run mark passes and paint your tilemap via the Count and Index expressions.",
  params: [],
};

export const expose = true;

export default function () {
  // Trigger stub - fired from _runAllWalkers in instance.js.
  return true;
}
