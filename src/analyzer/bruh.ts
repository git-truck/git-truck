import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';

interface ObjectWriteStreamOptions {
  objectMode: true;
  filePath: string;
}

class ObjectWriteStream extends stream.Writable {
  private filePath: string;

  constructor(options: ObjectWriteStreamOptions) {
    super({ objectMode: true });
    this.filePath = options.filePath;
  }

  _write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
    const data = JSON.stringify(chunk);
    fs.appendFile(this.filePath, data, (err) => {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  }
}

export function writeObjectToPath(obj: any, writePath: string): Promise<void> {
//   const fullPath = path.resolve(writePath);
  const writeStream = new ObjectWriteStream({ objectMode: true, filePath: writePath });

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', (e) => {
        console.log("error!!!", e)
        reject()  
    });
    writeStream.write(obj);
    writeStream.end();
  });
}

// Example usage:
// const objToWrite = { key: 'value', nested: { num: 42 } };
// const filePath = 'example.json';

// writeObjectToPath(objToWrite, filePath)
//   .then(() => console.log(`Object successfully written to ${filePath}`))
//   .catch((error) => console.error(`Error writing object to ${filePath}: ${error.message}`));
