"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zlib_1 = require("zlib");
const fs_1 = require("fs");
const util_1 = require("util");
async function parse() {
    const buffer = (0, fs_1.readFileSync)('../../bprd/.git/objects/cf/14ccdfe14ae93009b65275f699687a75743e35');
    const unzipPromise = (0, util_1.promisify)(zlib_1.unzip);
    const res = await unzipPromise(buffer);
    console.log(res.toString());
}
parse();
