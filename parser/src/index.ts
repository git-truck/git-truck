import { unzip } from 'zlib';
import { readFileSync } from 'fs'
import { promisify } from 'util';

async function parse() {
    const buffer = readFileSync('../../bprd/.git/objects/cf/14ccdfe14ae93009b65275f699687a75743e35');
    const unzipPromise = promisify(unzip);
    const res = await unzipPromise(buffer);
    console.log(res.toString());
}

parse();
