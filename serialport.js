// @ts-check

// cspell: ignore rtscts ondisconnect

import { Readable, Writable } from "node:stream";
import { once } from "node:events";
import { SerialPort as NodeSerialPort } from "serialport";

export class SerialPort extends EventTarget {
	/**
	 * @param {object} info
	 * @param {string} info.path
	 * @param {string} [info.vendorId]
	 * @param {string} [info.productId]
	 */
	constructor(info) {
		super();

		/** @type {ReadableStream<Uint8Array> | null} */
		this.readable = null;

		/** @type {WritableStream<Uint8Array> | null} */
		this.writable = null;

		/** @type {NodeSerialPort | null} */
		this._port = null;

		this._info = info;
		this.signalState = { dtr: true, rts: false, brk: false };

		/** @type {((this: this, ev: Event) => void) | null} */
		this.onconnect = null;
		/** @type {((this: this, ev: Event) => void) | null} */
		this.ondisconnect = null;
		this.addEventListener("connect", (event) => {
			if (this.onconnect) {
				this.onconnect(event);
			}
		});
		this.addEventListener("disconnect", (event) => {
			if (this.ondisconnect) {
				this.ondisconnect(event);
			}
		});
	}

	get connected() {
		return this._port !== null;
	}

	/**
	 * @param {SerialOptions} options
	 */
	async open(options) {
		if (!options) {
			throw new TypeError("Failed to execute 'open' on 'SerialPort': Failed to read the 'baudRate' property from 'SerialOptions': Required member is undefined.");
		}
		if (this.port) {
			throw new Error("Failed to execute 'open' on 'SerialPort': The port is already open.");
		}

		const port = new NodeSerialPort({
			path: this._info.path,
			baudRate: options.baudRate,
			highWaterMark: (options.bufferSize !== undefined) ? options.bufferSize : 65536,
			dataBits: options.dataBits,
			rtscts: options.flowControl === "hardware",
			parity: options.parity,
			stopBits: options.stopBits
		});

		const [ err ] = await once(port, "open");
		if (err) throw err;
		this.port = port;

		this.readable = /** @type {ReadableStream<Uint8Array>} */(Readable.toWeb(port));
		this.writable = /** @type {WritableStream<Uint8Array>} */(Writable.toWeb(port));

		await this.setSignals({});
	}

	async close() {
		await new Promise((/** @type {(value?: any) => void} */resolve, reject) => {
			if (!this.port) {
				throw new Error("Failed to execute 'close' on 'SerialPort': The port is already closed.");
			}

			this.port.close((err) => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});

		this.port = null;
		this.readable = null;
		this.writable = null;
	}

	async forget() {
	}

	/**
	 * @return {SerialPortInfo}
	 */
	getInfo() {
		return {
			usbVendorId: (this._info.vendorId != null) ? parseInt(this._info.vendorId, 16) : undefined,
			usbProductId: (this._info.productId != null) ? parseInt(this._info.productId, 16) : undefined
		};
	}

	/**
	 * @param {SerialOutputSignals} options
	 */
	async setSignals(options) {
		return new Promise((/** @type {(value?: any) => void} */resolve, reject) => {
			if (!this.port) {
				throw new Error("Failed to execute 'setSignals' on 'SerialPort': The port is closed.");
			}

			// Maps WebSerial options to NodeSerialPort options
			if (options.dataTerminalReady !== undefined) {
				this.signalState.dtr = !options.dataTerminalReady;
			}
			if (options.requestToSend !== undefined) {
				this.signalState.rts = !options.requestToSend;
			}
			if (options.break !== undefined) {
				this.signalState.brk = options.break;
			}

			this.port.set(this.signalState, (err) => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}

	getSignals() {
		return new Promise((/** @type {(value: SerialInputSignals) => void} */resolve, reject) => {
			if (!this.port) {
				throw new Error("Failed to execute 'getSignals' on 'SerialPort': The port is closed.");
			}

			this.port.get((err, status) => {
				if (err) {
					reject(err);
				}
				else if (!status) {
					reject(new Error("Received no error and no status from 'getSignals'"));
				}
				else {
					resolve({
						clearToSend: status.cts,
						dataCarrierDetect: status.dcd,
						dataSetReady: status.dsr,
						ringIndicator: false
					});
				}
			});
		});
	}
}
