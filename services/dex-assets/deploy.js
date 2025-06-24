const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_FILE_PATH = path.resolve(__dirname, '../../.env');

const JSTZ_DEPLOY_COMMAND = 'jstz deploy dist/index.js  -n dev';

console.log(`Executing Jstz deploy command: ${JSTZ_DEPLOY_COMMAND}`);


exec(JSTZ_DEPLOY_COMMAND, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing Jstz command: ${error.message}`);
    return;
  }

  if (stderr) {
    console.warn(`Jstz command stderr:\n${stderr}`);
  }

  console.log(`Jstz command stdout:\n${stdout}`);

  const combinedOutput = stdout + '\n' + stderr;
  console.log('Searching for Function ID in combined stdout/stderr output...');

  let functionId = null;

  const jstzRunAddressRegex = /(jstz:\/\/[a-zA-Z0-9]+)\//;
  const runAddressMatch = combinedOutput.match(jstzRunAddressRegex);

  if (runAddressMatch && runAddressMatch[1]) {
    functionId = runAddressMatch[1];
  } else {
    const kt1AddressRegex = /(KT1[a-zA-Z0-9]{33,35})/;
    const kt1Match = combinedOutput.match(kt1AddressRegex);
    if (kt1Match && kt1Match[1]) {
      functionId = kt1Match[1];
    } else {
      console.error('Could not extract Function ID from Jstz command output using expected patterns. Please review the output above.');
      return;
    }
  }

  console.log(`Extracted Function ID: ${functionId}`);

  fs.readFile(ENV_FILE_PATH, 'utf8', (readErr, data) => {
    let fileContent = '';
    if (!readErr) {
      fileContent = data.split('\n').filter(line =>
        !line.startsWith('NEXT_PUBLIC_DEX_BASE_URL=') && !line.startsWith('NEXT_PUBLIC_DEX_BASE_URL =')
      ).join('\n');
    }

    const envEntry = `NEXT_PUBLIC_DEX_BASE_URL="${functionId}"\n`;

    const finalContent = (fileContent.trim() !== '' && !fileContent.endsWith('\n') ? fileContent + '\n' : fileContent) + envEntry;

    fs.writeFile(ENV_FILE_PATH, finalContent, (writeErr) => {
      if (writeErr) {
        console.error(`Failed to write to .env file: ${writeErr.message}`);
        return;
      }
      console.log(`Successfully updated '${ENV_FILE_PATH}' with: ${envEntry.trim()}`);
      console.log('Remember to restart your application/server for the .env changes to take effect!');
    });
  });
});