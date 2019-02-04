import fs = require('fs');
import { YAMLValidation } from '../../src/services/yamlValidation';
import * as JSONSchemaService from '../../src/services/jsonSchemaService';
import { JSONSchema } from '../../src/jsonSchema';
import * as URL from 'url';
import { TextDocument, Position, Diagnostic } from 'vscode-languageserver-types';
import * as yamlparser from '../../src/parser/yamlParser'
import { Thenable } from '../../src/yamlLanguageService';
import * as assert from 'assert';

suite("Yaml Validation Service Tests", function () {
    this.timeout(20000);

    test('Given empty file validation should pass', async function () {
       const list = await runValidationTest("", {line: 0, character: 0});
       assert.equal(list.length, 0);
    });

    test('multi-document file should be rejected', async function () {
        const list = await runValidationTest("---\njobs:\n- job: some_job\n  invalid_parameter: bad value\n  invalid_parameter: duplicate key\n  another_invalid_parameter: whatever\n===\n---\njobs:\n- job: some_job\n  invalid_parameter: bad value\n  invalid_parameter: duplicate key\n  another_invalid_parameter: whatever\n===\n", {line: 0, character: 0});
        assert.equal(list.length, 1);
        assert.ok(list[0].message.indexOf("single-document") >= 0);
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


// Given a file and a position, this test expects the task list to show as completion items.
async function runValidationTest(content: string, position: Position): Promise<Diagnostic[]> {
    // Arrange
    const schemaUri: string = "test/pipelinesTests/schema.json";
    const schemaService = new JSONSchemaService.JSONSchemaService(schemaResolver, workspaceContext, requestService);

    const yamlValidation = new YAMLValidation(schemaService, Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const yamlDoc = yamlparser.parse(content);


    return await yamlValidation.doValidation(textDocument, yamlDoc);
}
