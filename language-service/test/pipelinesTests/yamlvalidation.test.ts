import fs = require('fs');
import { YAMLValidation } from '../../src/services/yamlValidation';
import * as JSONSchemaService from '../../src/services/jsonSchemaService';
import { JSONSchema } from '../../src/jsonSchema';
import * as URL from 'url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic } from 'vscode-languageserver-types';
import * as yamlparser from '../../src/parser/yamlParser'
import { Thenable } from '../../src/yamlLanguageService';
import * as assert from 'assert';

describe("Yaml Validation Service Tests", function () {
    this.timeout(20000);

    it('validates empty files', async function () {
       const diagnostics = await runValidationTest("");
       assert.equal(diagnostics.length, 0);
    });

    it('rejects multi-document files with only one error', async function () {
        const diagnostics = await runValidationTest(`
---
jobs:
- job: some_job
  invalid_parameter: bad value
  invalid_parameter: duplicate key
  another_invalid_parameter: whatever
===
---
jobs:
- job: some_job
  invalid_parameter: bad value
  invalid_parameter: duplicate key
  another_invalid_parameter: whatever
===
`);
        assert.equal(diagnostics.length, 1);
        assert.ok(diagnostics[0].message.indexOf("single-document") >= 0);
    });

    it('validates pipelines with expressions', async function () {
        const diagnostics = await runValidationTest(`
steps:
- \${{ if succeeded() }}:
  - pwsh: Write-Output "Hello"
`);
        assert.equal(diagnostics.length, 0);
    });
});

const workspaceContext = {
    resolveRelativePath: (relativePath: string, resource: string) => {
        return URL.resolve(resource, relativePath);
    }
};

const requestService = (path: string): Thenable<string> => {
    return new Promise<string>((c, e) => {
        fs.readFile(path, 'UTF-8', (err, result) => {
            err ? e('') : c(result.toString());
        });
    });
};

const schemaResolver = (url: string): Promise<JSONSchema> => {
    return Promise.resolve(JSONSchemaService.ParseSchema(url));
}

// Given a file's content, returns the diagnostics found.
async function runValidationTest(content: string): Promise<Diagnostic[]> {
    const schemaUri: string = "test/pipelinesTests/schema.json";
    const schemaService = new JSONSchemaService.JSONSchemaService(schemaResolver, workspaceContext, requestService);

    const yamlValidation = new YAMLValidation(schemaService, Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const yamlDoc = yamlparser.parse(content);

    return await yamlValidation.doValidation(textDocument, yamlDoc);
}
