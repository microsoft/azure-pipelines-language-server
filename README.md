## Build status

| Language server | Language service |
|--------|---------|
| [![Server build status](https://dev.azure.com/ms/azure-pipelines-vscode/_apis/build/status/Langserv%20Release%20Server?branchName=master)](https://dev.azure.com/ms/azure-pipelines-vscode/_build/latest?definitionId=34?branchName=master) | [![Service build status](https://dev.azure.com/ms/azure-pipelines-vscode/_apis/build/status/Langserv%20Release%20Service?branchName=master)](https://dev.azure.com/ms/azure-pipelines-vscode/_build/latest?definitionId=33?branchName=master) |

## Features

1. YAML validation:
    * Detects whether the entire file is valid yaml
2. Validation:
    * Detects errors such as:
        * Node is not found
        * Node has an invalid key node type
        * Node has an invalid type
        * Node is not a valid child node
    * Detects warnings such as:
        * Node is an additional property of parent
3. Auto completion:
    * Auto completes on all commands
    * Scalar nodes autocomplete to schema's defaults if they exist
4. Hover support:
    * Hovering over a node shows description *if available*
5. Document outlining:
    * Shows a complete document outline of all nodes in the document

## Developer Support

This repo consists of 2 separate projects/packages:
1. * [azure-pipelines-language-service](https://github.com/Microsoft/azure-pipelines-language-server/tree/master/language-service) - language service implementation for azure-pipelines
2. * [azure-pipelines-language-server](https://github.com/Microsoft/azure-pipelines-language-server/tree/master/language-server) - language server implementation that dependes on azure-pipelines-language-service

In order to tighten the dev loop you can utilize `npm link` that will sync changes to service package without re-installing.
 
 1. First install dependencies for both service and server:
    * `cd language-service`
    * `npm install`
    * `npm run build`
    * `cd ../language-server`
    * `npm install`
    * `npm run build` 
2. Link languageservice/out/src to the global folder and connect it to the language-server's node_modules
    * `cd ../language-service/out/src`
    * `npm link`
    * `npm ls -g` - to check it is added
    * `cd ../language-server`
    * `npm link azure-pipelines-language-service`
3. Now you can make changes to the service compile and your changes will be awailable in the server
    * Run `npm run watch` to auto detect changes and compile

### Connecting to the language server via stdio
There's an option to connect to the language server via [stdio](https://github.com/redhat-developer/yaml-language-server/blob/681985b5a059c2cb55c8171235b07e1651b6c546/src/server.ts#L46-L51) to help with intergrating the language server into different clients.

## Thanks

This project was forked from the [YAML Language Server](https://github.com/redhat-developer/yaml-language-server) by Red Hat.
