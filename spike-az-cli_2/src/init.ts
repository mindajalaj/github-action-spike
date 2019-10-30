import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const bashArg = 'bash --noprofile --norc -eo pipefail';
const pathToTempDirectory: string = process.env.RUNNER_TEMP || os.tmpdir();

const run = async () => {

    try {
        if (process.env.RUNNER_OS != 'Linux') {
            core.warning('Please use Linux OS as a runner.');
            return;
        }
        const dockerPath: string = await io.which("docker", true);

        let inlineScript: string = core.getInput('inlineScript');
        let scriptPath: string = core.getInput('scriptPath');
        let azcliversion: string = core.getInput('azcliversion');

        const allVersions:any = await getAllAzCliVersions();
        console.log(allVersions);
        console.log("type of it is...", typeof(allVersions));
        if (!(azcliversion in allVersions.tags)){
            core.warning('Please enter a valid azure cli version.');
            return;
        }
        var check = checkIfFileExists(scriptPath, 'sh');
        console.log("does file exist.................", check);

        let bashCommand: string = '';
        let dockerCommand: string = `run --workdir /github/workspace -v ${process.env.GITHUB_WORKSPACE}:/github/workspace -v /home/runner/.azure:/root/.azure `;
        if (scriptPath) {

            await giveExecutablePermissionsToFile(scriptPath);
            bashCommand = ` ${bashArg} /github/workspace/${scriptPath} `;
        } else if (inlineScript) {
            const { fileName, fullPath } = getScriptFileName();
            fs.writeFileSync(path.join(fullPath), `${inlineScript}`);
            await giveExecutablePermissionsToFile(fullPath);
            dockerCommand += ` -v ${pathToTempDirectory}:/_temp `;
            bashCommand = ` ${bashArg} /_temp/${fileName} `;
        }
        dockerCommand += ` mcr.microsoft.com/azure-cli:${azcliversion} ${bashCommand}`;
        await executeCommand(dockerCommand, dockerPath);
        console.log("az script ran successfully.");
    } catch (error) {
        console.log("az script failed, Please check the script.", error);
        core.setFailed(error.stderr);
    }
};

const giveExecutablePermissionsToFile = async (filePath: string) => await executeCommand(`chmod +x ${filePath}`)

const getScriptFileName = () => {
    const fileName: string = `AZ_CLI_GITHUB_ACTION_${getCurrentTime().toString()}.sh`;
    const tempDirectory = pathToTempDirectory;
    const fullPath = path.join(tempDirectory, path.basename(fileName));
    return { fileName, fullPath };
}

const getCurrentTime = (): number => {
    return new Date().getTime();
}

const executeCommand = async (command: string, toolPath?: string) => {
    try {
        if (toolPath) {
            command = `"${toolPath}" ${command}`;
        }
        await exec.exec(command, [], {});
    }
    catch (error) {
        throw new Error(error);
    }
}

const getAllAzCliVersions = async () => {
    var outStream:string = '';
    var value = await exec.exec(`curl --location https://mcr.microsoft.com/v2/azure-cli/tags/list`, [], {listeners:{stdout: (data: Buffer) => outStream += data.toString()}});
    console.log("output stream is == >  ",outStream);
    return JSON.parse(outStream);
}

const checkIfFileExists = (filePath: string, fileExtension: string): boolean => {
    if (fs.existsSync(filePath) && filePath.toUpperCase().match(new RegExp(`\.${fileExtension.toUpperCase()}$`))) {
        return true;
    }
    return false;
}

run();