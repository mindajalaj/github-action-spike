// src/hello-world.ts
import * as core from '@actions/core';

async function run() {
  try {
    const nameToGreet = core.getInput('who-to-greet');
    if (nameToGreet == 'Octocat') {
        // the Octocat doesn't want to be greeted here!
        throw new Error("No Octocat greetings, please.");
    } else {
        console.log(`Hello ${nameToGreet}!`);
        const time = (new Date()).toTimeString();
        core.setOutput("time", time);
    }
    // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();