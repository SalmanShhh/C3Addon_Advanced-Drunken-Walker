export const config = {
  highlight: false,
  isDeprecated: false,
  isAsync: false,
  listName: "Set walker start angle",
  displayText: "{my} set walker [b]{0}[/b] start angle to [i]{1}[/i]",
  description:
    "Set the angle a walker's direction set is anchored at, in degrees: 0 is right and 90 is down, matching Construct's angle system. The walker's evenly spaced headings rotate with it, and so do its direction weights, since weight entry 0 always weighs the start angle. A walker that has not started faces the new start angle; one mid-walk snaps to the nearest of its new headings.",
  params: [
    {
      id: "walkerId",
      name: "ID",
      desc: "ID of the walker to change.",
      type: "string",
      initialValue: '"main"',
    },
    {
      id: "angle",
      name: "Start Angle",
      desc: "Angle in degrees the direction set is anchored at. 0 is right, 90 is down.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (walkerId, angle) {
  this._setWalkerStartAngle(walkerId, angle);
}
