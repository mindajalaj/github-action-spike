"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const io = __importStar(require("@actions/io"));
const utils_1 = require("./utils");
const bashArg = 'bash --noprofile --norc -eo pipefail';
const run = () => __awaiter(this, void 0, void 0, function* () {
    try {
        if (process.env.RUNNER_OS != 'Linux') {
            core.setFailed('Please use Linux based OS as a runner.');
            return;
        }
        let inlineScript = core.getInput('inlineScript');
        let azcliversion = core.getInput('azcliversion').trim();
        if (!(yield checkIfValidVersion(azcliversion))) {
            core.setFailed('Please enter a valid azure cli version. \nRead more about Azure CLI versions: https://github.com/Azure/azure-cli/releases.');
            return;
        }
        if (!inlineScript.trim()) {
            core.setFailed('Please enter a valid script.');
            return;
        }
        const { fileName, fullPath } = utils_1.getScriptFileName();
        fs.writeFileSync(fullPath, `${inlineScript}`);
        yield utils_1.giveExecutablePermissionsToFile(fullPath);
        let bashCommand = ` ${bashArg} /_temp/${fileName} `;
        /*
        For the docker run command, we are doing the following
        - Set the working directory for docker continer
        - volume mount the GITHUB_WORKSPACE env variable (path where users checkout code is present) to work directory of container
        - voulme mount .azure session token file between host and container,
        - volume mount temp directory between host and container, inline script file is created in temp directory
        */
        let command = `run --workdir /github/workspace -v ${process.env.GITHUB_WORKSPACE}:/github/workspace `;
        command += ` -v /home/runner/.azure:/root/.azure -v ${utils_1.tempDirectory}:/_temp `;
        command += ` mcr.microsoft.com/azure-cli:${azcliversion} ${bashCommand}`;
        yield executeDockerScript(command);
        console.log("az script ran successfully.");
    }
    catch (error) {
        console.log("az CLI action failed.\n\n", error);
        core.setFailed(error.stderr);
    }
});
const checkIfValidVersion = (azcliversion) => __awaiter(this, void 0, void 0, function* () {
    const allVersions = yield getAllAzCliVersions();
    for (let i = allVersions.length - 1; i >= 0; i--) {
        if (allVersions[i].trim() === azcliversion) {
            return true;
        }
    }
    return false;
});
const getAllAzCliVersions = () => __awaiter(this, void 0, void 0, function* () {
    const { outStream, errorStream, errorCaught } = yield utils_1.executeScript(`curl --location -s https://mcr.microsoft.com/v2/azure-cli/tags/list`);
    try {
        if (outStream && JSON.parse(outStream).tags) {
            return JSON.parse(outStream).tags;
        }
    }
    catch (error) {
        throw new Error(`Unable to fetch all az cli versions, please report it as a issue. outputstream contains ${outStream}, error = ${errorStream}\n${errorCaught}`);
    }
    return [];
});
const executeDockerScript = (dockerCommand) => __awaiter(this, void 0, void 0, function* () {
    const dockerPath = yield io.which("docker", true);
    const { outStream, errorStream, errorCaught } = yield utils_1.executeScript(dockerCommand, dockerPath);
    console.log(outStream);
    if (errorCaught) {
        throw new Error(`az CLI script failed, Please check the script.\nPlease refer the script error at the end after docker logs.\n\nDocker logs...\n${errorStream}.`);
    }
});
run();
