export function validateBinValue(
  value: string,
  bitMode: number,
  displayMode: string
) {
  let num: number;
  const isHex = displayMode === "hex";
  if (isHex) {
    num = parseInt(value, 16);
  } else {
    num = parseInt(value);
  }

  if (Number.isNaN(num)) {
    return {
      value: "",
      error: "value not a number",
    };
  }

  if (bitMode === 8 && num > 255) {
    console.log(value, num);
    return {
      value: "",
      error: `max value is ${isHex ? "FF" : "255"}`,
    };
  }

  if (bitMode === 16 && num > 65535) {
    return {
      value: "",
      error: `max value is ${isHex ? "FFFF" : "65535"}`,
    };
  }

  return {
    value: value,
    error: null,
  };
}
