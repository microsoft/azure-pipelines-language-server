# Release process

1. Choose your new target version number. For this, we'll use "0.1.2".
2. Make a branch to ship from. `git switch -c ship-0.1.2`
3. Release the service first. `cd language-service`
    1. Bump the language-service version. `npm version --no-git-tag-version 0.1.2`
    2. Ensure there's an entry for this new version in the service `changelog.md`.
    3. Commit and push. `git commit -am "version service" && git push -u origin ship-0.1.2`
    4. **This step creates a GitHub Release** Run the [service release pipeline][release-service], targeting your ship branch. (NB: make sure you're logged into Azure DevOps. It's a public project so you can view it anonymously, and may have to explicitly log in from the upper right.)
    5. Assuming the build works, download the `.tgz` either from **Artifacts** on the build summary page or from the new GitHub release that was created.
    6. Publish this to npm. `npm publish azure-pipelines-language-service-0.1.2.tgz`
4. Bump the dependency in the server.
    1. Get to the right directory. `cd ../language-server`
    2. Update the dependency. `npm i azure-pipelines-language-service@0.1.2 --save-exact`
5. Release the server. (You're already in the right directory if you followed the above steps.)
    1. Bump the language-server version. `npm version --no-git-tag-version 0.1.2`
    2. Ensure there's an entry for this new version in the server `changelog.md`. (TODO/improvement: we should hardlink the server/service changelog files, as there's never a time when they should differ.)
    3. Commit and push. `git commit -am "version server" && git push -u origin ship-0.1.2`
    4. **This step creates a GitHub Release** Run the [server release pipeline][release-server], targeting your ship branch.
    5. Assuming the build works, download the `.tgz` either from **Artifacts** on the build summary page or from the new GitHub release that was created.
    6. Publish this to npm. `npm publish azure-pipelines-language-server-0.1.2.tgz`
6. Create a PR from your ship branch to `main`. Merge it. :tada: you're done!

[release-service]: https://dev.azure.com/mseng/PipelineTools/_build?definitionId=17100 "Language service release pipeline"
[release-server]: https://dev.azure.com/mseng/PipelineTools/_build?definitionId=17139 "Language server release pipeline"
