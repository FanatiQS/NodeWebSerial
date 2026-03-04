// @ts-check

import { SerialPort } from "./serialport.js";
import { serial } from "./serial.js";

Object.assign(globalThis, "SerialPort", { value: SerialPort });

if (!("navigator" in globalThis)) {
	Object.assign(globalThis, "navigator", { value: {} });
}

if (!("serial" in navigator)) {
	Object.assign(navigator, "serial", { value: serial });
}
