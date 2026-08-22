export const config = {
  highlight: true,
  isDeprecated: false,
  isTrigger: true,
  listName: "On cell carved",
  displayText: "On cell carved",
  description:
    "Fires once per cell whose value changes during walker runs, dilation or outlining. Use CarvedX, CarvedY, CarvedValue and WalkerID inside. On big grids prefer iterating results after generation over per-cell spawning here.",
  params: [],
};

export const expose = true;

export default function () {
  // Trigger stub - fired from _carveCell in instance.js.
  return true;
}
