// @ts-check

import { select } from '@inquirer/prompts';
import { SerialPort as NodeSerialPort } from "serialport";
import { SerialPort } from "./serialport.js";

class Serial {
	/**
	 * @param {SerialPortRequestOptions} [options]
	 */
	async requestPort(options) {
		const list = await NodeSerialPort.list();
		const info = await select({
			message: "Select a port",
			choices: list.map((info) => ({
				name: info.path,
				value: info,
				description: `${info.manufacturer} -- ${info.serialNumber}`
			}))
		});
		return new SerialPort(info);
	}

	async getPorts() {
		const list = await NodeSerialPort.list();
		return list.map((info) => new SerialPort(info));
	}
}

export const serial = new Serial();

/**
 * @param {string} path
 */
export async function openSerialPort(path) {
	const list = await NodeSerialPort.list();
	const info = list.find((info) => info.path === path);
	if (!info) {
		return null;
	}
	return new SerialPort(info);
}
