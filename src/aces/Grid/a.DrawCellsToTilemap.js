export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Draw cells to tilemap",
  displayText: "{my} draw cells valued [i]{0}[/i] to [b]{1}[/b] as tile [i]{2}[/i]",
  description:
    "Set one tile in the tilemap for every cell holding the value, without writing the loop yourself. Cells map straight onto tile coordinates, so cell (4, 2) sets tile (4, 2). Call it once per value to paint layered terrain, and pass tile -1 to erase instead.",
  params: [
    {
      id: "value",
      name: "Value",
      desc: "Cells holding this value are drawn.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "tilemap",
      name: "Tilemap",
      desc: "The Tilemap object to set tiles in.",
      type: "object",
      allowedPluginIds: ["Tilemap"],
    },
    {
      id: "tile",
      name: "Tile",
      desc: "Tile index to set, as shown in the Tilemap bar. -1 erases.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (value, tilemap, tile) {
  this._drawCellsToTilemap(value, tilemap, tile);
}
