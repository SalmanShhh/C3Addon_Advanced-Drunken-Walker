export const config = {
  highlight: true,
  isDeprecated: false,
  isAsync: false,
  listName: "Add walker from preset",
  displayText:
    "{my} add [i]{1}[/i] walker [b]{0}[/b] at ([i]{2}[/i], [i]{3}[/i]), tag [i]{4}[/i], carving [i]{5}[/i]",
  description:
    "Register a walker from a named shape preset instead of raw numbers: Cave is the classic jittery carver, Corridors digs right-angled passages, River meanders in a wide ribbon, Ore Vein burrows downward, Lightning strikes down in a short jagged line, and Blob hollows out one round chamber. Presets only choose the movement settings - tune the result afterwards with the Set Walker actions, or use Add Walker for full control.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "Unique ID for this walker. Re-using an ID replaces that walker in place.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "preset",
      name: "Preset",
      desc: "The shape to walk. See the Shape Recipes section of the guide for what each one looks like.",
      type: "combo",
      initialValue: "cave",
      // Item order defines the numeric value the runtime receives - it must
      // match WALKER_PRESETS in src/runtime/instance.js.
      items: [
        { cave: "Cave" },
        { corridors: "Corridors" },
        { river: "River" },
        { ore_vein: "Ore Vein" },
        { lightning: "Lightning" },
        { blob: "Blob" },
      ],
    },
    {
      id: "startX",
      name: "Start X",
      desc: "Starting cell X, 0 at the left edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "startY",
      name: "Start Y",
      desc: "Starting cell Y, 0 at the top edge.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "tag",
      name: "Tag",
      desc: "Groups walkers for Run Walkers By Tag. Empty for untagged.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "carveValue",
      name: "Carve Value",
      desc: "The integer this walker writes into every cell it visits.",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (walkerId, preset, startX, startY, tag, carveValue) {
  this._addWalkerFromPreset(walkerId, preset, startX, startY, tag, carveValue);
}
