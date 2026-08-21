export const config = {
  highlight: false,
  isDeprecated: false,
  returnType: "number",
  description:
    "Current heading of the triggering walker in degrees, 0 = right and 90 = down. Reads 0 outside walker triggers.",
  params: [],
};

export const expose = true;

export default function () {
  return this._walkerAngle();
}
