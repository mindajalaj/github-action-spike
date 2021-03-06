import stream = require('stream');
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export const TEMP_DIRECTORY: string = process.env.RUNNER_TEMP || os.tmpdir();

export const createScriptFile = async (inlineScript: string): Promise<string> => {
    const fileName: string = `AZ_CLI_GITHUB_ACTION_${getCurrentTime().toString()}.sh`;
    const filePath: string = path.join(TEMP_DIRECTORY, fileName);
    fs.writeFileSync(filePath, `${inlineScript}`);
    await giveExecutablePermissionsToFile(filePath);
    return fileName;
}


export const deleteFile = async (filePath: string) => {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        }
        catch (err) {
            core.warning(err.toString());
        }
    }
}

export const giveExecutablePermissionsToFile = async (filePath: string): Promise<number> => await exec.exec(`chmod +x ${filePath}`, [], { silent: true })

export const getCurrentTime = (): number => {
    return new Date().getTime();
}

export class NullOutstreamStringWritable extends stream.Writable {

    constructor(options: any) {
        super(options);
    }

    _write(data: any, encoding: string, callback: Function): void {
        if (callback) {
            callback();
        }
    }
};