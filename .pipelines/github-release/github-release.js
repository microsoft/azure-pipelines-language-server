const octokit = require('@octokit/rest')({
    headers: {
        'user-agent': 'azure-pipelines/vscode-release-pipeline v1.0'
    }
});
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

const DEBUG_LOGGING = process.env.SYSTEM_DEBUG && process.env.SYSTEM_DEBUG == 'true';
let contentName = process.argv[2] || null;
let changelogName = process.argv[3] || null;
let versionTag = process.argv[4] || null;
let token = process.argv[5] || null
if (token === null) {
    console.log(`Usage:

    github-release.js <content> <changelog> <versiontag> <PAT>

This will create a new release and tag on GitHub at the current HEAD commit.

USE AT YOUR OWN RISK.
This is intended to be run by the release pipeline only.`);
    process.exit(1);
}

async function createRelease() {
    let target_commitish;
    if (process.env.BUILD_SOURCEBRANCH) {
        target_commitish = process.env.BUILD_SOURCEBRANCH;
    } else {
        const { stdout: head_commit } = await exec('git rev-parse --verify HEAD');
        target_commitish = head_commit.trim();
    }

    const { stdout: body } = await exec('cat ' + changelogName);

    octokit.authenticate({
        type: 'token',
        token: token
    });

    console.log('Creating release...');
    let createReleaseResult;
    try {
        createReleaseResult = await octokit.repos.createRelease({
            owner: 'Microsoft',
            repo: 'azure-pipelines-language-server',
            tag_name: `${versionTag}`,
            target_commitish: target_commitish,
            name: `${versionTag}`,
            body: body
        });
    } catch (e) {
        throw e;
    }
    console.log('Created release.');

    if (DEBUG_LOGGING) {
        console.log(createReleaseResult);
    }

    const contentSize = fs.statSync(contentName).size;

    console.log('Uploading Content...');
    let uploadResult;
    try {
        uploadResult = await octokit.repos.uploadAsset({
            url: createReleaseResult.data.upload_url,
            headers: {
                'content-length': contentSize,
                'content-type': 'application/gzip',
            },
            name: path.basename(contentName),
            file: fs.createReadStream(contentName)
        });
    } catch (e) {
        throw e;
    }
    console.log('Uploaded Content.');

    if (DEBUG_LOGGING) {
        console.log(uploadResult);
    }
}

try {
    createRelease();
} catch (err) {
    console.error(err);
    process.exit(1);
}
