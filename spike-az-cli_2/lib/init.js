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
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const bashArg = 'bash --noprofile --norc -eo pipefail';
const pathToTempDirectory = process.env.RUNNER_TEMP || os.tmpdir();
const run = () => __awaiter(this, void 0, void 0, function* () {
    try {
        if (process.env.RUNNER_OS != 'Linux') {
            core.warning('Please use Linux OS as a runner.');
            return;
        }
        const dockerPath = yield io.which("docker", true);
        let inlineScript = core.getInput('inlineScript');
        let scriptPath = core.getInput('scriptPath');
        let azcliversion = core.getInput('azcliversion');
        const allVersions = yield getAllAzCliVersions();
        console.log(allVersions);
        var check = checkIfFileExists(scriptPath, 'sh');
        console.log("does file exist.................", check);
        let bashCommand = '';
        let dockerCommand = `run --workdir /github/workspace -v ${process.env.GITHUB_WORKSPACE}:/github/workspace -v /home/runner/.azure:/root/.azure `;
        if (scriptPath) {
            yield giveExecutablePermissionsToFile(scriptPath);
            bashCommand = ` ${bashArg} /github/workspace/${scriptPath} `;
        }
        else if (inlineScript) {
            const { fileName, fullPath } = getScriptFileName();
            fs.writeFileSync(path.join(fullPath), `${inlineScript}`);
            yield giveExecutablePermissionsToFile(fullPath);
            dockerCommand += ` -v ${pathToTempDirectory}:/_temp `;
            bashCommand = ` ${bashArg} /_temp/${fileName} `;
        }
        dockerCommand += ` mcr.microsoft.com/azure-cli:${azcliversion} ${bashCommand}`;
        yield executeCommand(dockerCommand, dockerPath);
        console.log("az script ran successfully.");
    }
    catch (error) {
        console.log("az script failed, Please check the script.", error);
        core.setFailed(error.stderr);
    }
});
const giveExecutablePermissionsToFile = (filePath) => __awaiter(this, void 0, void 0, function* () { return yield executeCommand(`chmod +x ${filePath}`); });
const getScriptFileName = () => {
    const fileName = `AZ_CLI_GITHUB_ACTION_${getCurrentTime().toString()}.sh`;
    const tempDirectory = pathToTempDirectory;
    const fullPath = path.join(tempDirectory, path.basename(fileName));
    return { fileName, fullPath };
};
const getCurrentTime = () => {
    return new Date().getTime();
};
const executeCommand = (command, toolPath) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (toolPath) {
            command = `"${toolPath}" ${command}`;
        }
        yield exec.exec(command, [], {});
    }
    catch (error) {
        throw new Error(error);
    }
});
const getAllAzCliVersions = () => __awaiter(this, void 0, void 0, function* () {
    var outStream = '';
    var value = yield exec.exec(`curl --location https://mcr.microsoft.com/v2/azure-cli/tags/list`, [], { listeners: { stdout: (data) => { console.log("writing stdout data buffer,", data); outStream += data.toString(); } } });
    console.log("output is == >  ", value);
    console.log("output stream is == >  ", outStream);
    return value;
});
const checkIfFileExists = (filePath, fileExtension) => {
    if (fs.existsSync(filePath) && filePath.toUpperCase().match(new RegExp(`\.${fileExtension.toUpperCase()}$`))) {
        return true;
    }
    return false;
};
run();
