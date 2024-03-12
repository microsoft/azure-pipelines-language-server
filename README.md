## Build status

[![Build Status](https://dev.azure.com/mseng/PipelineTools/_apis/build/status%2Fazure-pipelines-language-server%2FLangserv%20CI?repoName=microsoft%2Fazure-pipelines-language-server&branchName=main)](https://dev.azure.com/mseng/PipelineTools/_build/latest?definitionId=17102&repoName=microsoft%2Fazure-pipelines-language-server&branchName=main)

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
6. Go to definition for Templates
    * Referenced templates can be resolved to a local file (if it exists)

## Developer Support

This repo consists of 2 separate projects/packages:
1. * [azure-pipelines-language-service](https://github.com/Microsoft/azure-pipelines-language-server/tree/main/language-service) - language service implementation for azure-pipelines
2. * [azure-pipelines-language-server](https://github.com/Microsoft/azure-pipelines-language-server/tree/main/language-server) - language server implementation that dependes on azure-pipelines-language-service

In order to tighten the dev loop you can utilize `npm link` that will sync changes to service package without re-installing.

1. First, install dependencies in the language service and start watching for changes:
    * `cd language-service`
    * `npm install`
    * `npm run watch`
2. Next, link the language service to the language server and start watching for changes:
    * `cd ../language-server`
    * `npm install`
    * `npm link ../language-service`
    * `npm run watch`
3. Now, any changes you make in the service will automatically be reflected in the server

### Connecting to the language server via stdio
There's an option to connect to the language server via [stdio](https://github.com/redhat-developer/yaml-language-server/blob/681985b5a059c2cb55c8171235b07e1651b6c546/src/server.ts#L46-L51) to help with intergrating the language server into different clients.

## Thanks

This project was forked from the [YAML Language Server](https://github.com/redhat-developer/yaml-language-server) by Red Hat.
