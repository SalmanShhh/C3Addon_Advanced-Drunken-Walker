import {
  ADDON_CATEGORY,
  ADDON_TYPE,
  PLUGIN_TYPE,
  PROPERTY_TYPE,
} from "./template/enums.js";
import _version from "./version.js";
export const addonType = ADDON_TYPE.PLUGIN;
export const type = PLUGIN_TYPE.OBJECT;
export const id = "salmanshh_advdrunkenwalkers";
export const name = "Advanced Drunken Walkers";
export const version = _version;
export const minConstructVersion = undefined;
export const author = "SalmanShh";
export const website = "https://www.construct.net";
export const documentation = "https://www.construct.net";
export const description =
  "Seeded drunkard's-walk generation engine. Carves organic maps with configurable walkers and scatters tagged marks - logic only, you draw the result.";
export const category = ADDON_CATEGORY.OTHER;

export const hasDomside = false;
export const files = {
  extensionScript: {
    enabled: false, // set to false to disable the extension script
    watch: true, // set to true to enable live reload on changes during development
    targets: ["x86", "x64"],
    // you don't need to change this, the build step will rename the dll for you. Only change this if you change the name of the dll exported by Visual Studio
    name: "MyExtension",
  },
  fileDependencies: [],
  remoteFileDependencies: [],
  cordovaPluginReferences: [],
  cordovaResourceFiles: [],
};

// categories that are not filled will use the folder name
export const aceCategories = {
  Grid: "Grid",
  Randomness: "Randomness",
  Walkers: "Walkers",
  Marks: "Marks",
  Post_Processing: "Post-Processing",
};

export const info = {
  icon: "icon.svg",
  Set: {
    // COMMON to all
    CanBeBundled: true,
    IsDeprecated: false,
    GooglePlayServicesEnabled: false,

    // BEHAVIOR only
    IsOnlyOneAllowed: false,

    // PLUGIN world only
    IsResizable: false,
    IsRotatable: false,
    Is3D: false,
    HasImage: false,
    IsTiled: false,
    SupportsZElevation: false,
    SupportsColor: false,
    SupportsEffects: false,
    MustPreDraw: false,

    // PLUGIN object only
    // Deliberately false: every instance owns an independent grid, PRNG,
    // walker set and mark list, so a project can run several generators.
    IsSingleGlobal: false,
  },
  // PLUGIN only
  AddCommonACEs: {
    Position: false,
    SceneGraph: false,
    Size: false,
    Angle: false,
    Appearance: false,
    ZOrder: false,
  },
};

// NOTE: property order is the contract - properties are read by index at
// runtime, so never reorder or remove entries, only append.
export const properties = [
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "gridWidth",
    name: "Grid Width",
    desc: "Grid width in cells. The grid is built at this size automatically when the layout starts - Create Grid is only needed for a different size.",
    options: {
      initialValue: 64,
      minValue: 1,
    },
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "gridHeight",
    name: "Grid Height",
    desc: "Grid height in cells. The grid is built at this size automatically when the layout starts - Create Grid is only needed for a different size.",
    options: {
      initialValue: 64,
      minValue: 1,
    },
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "maxGridSize",
    name: "Max Grid Size",
    desc: "Hard cap on both axes. Create Grid clamps to this and warns in debug mode - a safety net against runaway expressions.",
    options: {
      initialValue: 2048,
      minValue: 1,
    },
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "cellSize",
    name: "Cell Size",
    desc: "Pixel size of one cell, used by the cell to layout coordinate expressions.",
    options: {
      initialValue: 32,
      minValue: 1,
    },
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "originX",
    name: "Origin X",
    desc: "Layout X of the grid's top-left corner, for the coordinate expressions.",
    options: {
      initialValue: 0,
    },
  },
  {
    type: PROPERTY_TYPE.FLOAT,
    id: "originY",
    name: "Origin Y",
    desc: "Layout Y of the grid's top-left corner, for the coordinate expressions.",
    options: {
      initialValue: 0,
    },
  },
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "emptyValue",
    name: "Empty Value",
    desc: "The value the grid is filled with on creation and by Clear Grid.",
    options: {
      initialValue: 0,
    },
  },
  {
    type: PROPERTY_TYPE.TEXT,
    id: "seed",
    name: "Seed",
    desc: "Initial seed. Leave empty to derive one from the current time (non-deterministic until Set Seed is called).",
    options: {
      initialValue: "",
    },
  },
  {
    type: PROPERTY_TYPE.COMBO,
    id: "randomSource",
    name: "Random Source",
    desc: "Where random values come from: the built-in seeded PRNG, or the queue filled by Inject Random.",
    options: {
      initialValue: "internal_seeded",
      items: [
        { internal_seeded: "Internal seeded" },
        { injected: "Injected" },
      ],
    },
  },
  {
    type: PROPERTY_TYPE.CHECK,
    id: "debugMode",
    name: "Debug Mode",
    desc: "Log walker lifecycles, re-rolled boundary steps, clamped grid sizes, injected-queue underruns and warnings about common mistakes (running with no walkers, walkers starting outside the grid) to the browser console.",
    options: {
      initialValue: false,
    },
  },
];
