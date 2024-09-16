import * as fs from 'fs/promises';
import { YAMLCompletion } from '../../src/services/yamlCompletion';
import * as JSONSchemaService from '../../src/services/jsonSchemaService';
import { JSONSchema } from '../../src/jsonSchema';
import * as URL from 'url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, CompletionList, Range } from 'vscode-languageserver-types';
import * as yamlparser from '../../src/parser/yamlParser'
import * as assert from 'assert';
import { completionHelper } from '../../src/utils/yamlServiceUtils';

interface Suggestions {
    expected?: number,
    minimum?: number,
    maximum?: number
}

describe("Yaml Completion Service Tests", function () {
    this.timeout(20000);

    it('Given empty file completion should give suggestions', async function () {
       const list = await runTaskCompletionItemsTest("", {line: 0, character: 0}, {});
       const labels = list.items.map(item => item.label);
       assert.equal(labels.filter(l => l === "name").length, 1);
       assert.equal(labels.filter(l => l === "steps").length, 1);
       assert.equal(labels.filter(l => l === "variables").length, 1);
       assert.equal(labels.filter(l => l === "server").length, 0, "obsolete should not be suggested");
    });

    it('Given steps context completion should give suggestions of possible steps', async function () {
        await runTaskCompletionItemsTest("steps:\n- ", {line: 1, character: 2}, {expected: 7});
     });

    it('Given an already valid file with task name, autocomplete should still give all suggestions', async function () {
        await runTaskCompletionItemsTest('steps:\n- task: npmAuthenticate@0', {line: 1, character: 26}, {minimum: 100});
    });

    it('Given a new file with steps and task, autocomplete should give suggestions', async function() {
         await runTaskCompletionItemsTest('steps:\n  - task: ', {line: 1, character: 10}, {minimum: 100});
    });

    it('All completion text for properties should end with `:`', async function() {
        const list = await runTaskCompletionItemsTest('', {line: 0, character: 0}, {});
        list.items.forEach(item => {
            assert.equal(item.textEdit.newText.search(":") > 0, true, "new text should contain `:`");
        });
    });

    it('String properties replacement range should include colon', async function() {
        const list = await runTaskCompletionItemsTest('steps:\n- scrip: ', {line: 1, character: 5}, {});
        const expectedReplacementLength = "scrip:".length;
        list.items.forEach(item => {
            let actualRange: Range = item.textEdit['range'];
            let actualLength = actualRange.end.character - actualRange.start.character;
            assert.equal(actualLength, expectedReplacementLength);
        });
    });

    it('trailing whitespace does not affect suggestions', async function() {
        await runTaskCompletionItemsTest('strategy:\n   ', {line: 1, character: 2}, {expected: 3});
    });

    it('case insensitive matching keys are not suggested', async function() {
        //first make sure that the azureAppServiceManage is still in the schema and has an Action input
        {
            const list = await runTaskCompletionItemsTest('steps:\n- task: azureAppServiceManage@0\n  inputs:\n    ', {line: 3, character: 4}, {minimum: 6});
            const labels = list.items.map(item => item.label);
            assert.equal(labels.filter(l => l.toUpperCase() === "Action".toUpperCase()).length, 1);
        }

        //now make sure that it isn't suggested if an off-case version is present
        {
            const list = await runTaskCompletionItemsTest('steps:\n- task: azureAppServiceManage@0\n  inputs:\n    ACTION: Restart Azure App Service\n    ', {line: 4, character: 4}, {minimum: 6});
            const labels = list.items.map(item => item.label);
            assert.equal(labels.filter(l => l.toUpperCase() === "Action".toUpperCase()).length, 0);
        }
    });

    it('alias matching keys are not suggested', async function() {
        //first make sure that azureSubscription is still in the schema
        {
            const list = await runTaskCompletionItemsTest('steps:\n- task: azureAppServiceManage@0\n  inputs:\n    ACTION: Restart Azure App Service\n    ', {line: 4, character: 4}, {minimum: 6});
            const labels = list.items.map(item => item.label);
            assert.equal(labels.filter(l => l.toUpperCase() === "azureSubscription".toUpperCase()).length, 1);
        }

        //now make sure it is not suggested when an alias is present
        {
            const list = await runTaskCompletionItemsTest('steps:\n- task: azureAppServiceManage@0\n  inputs:\n    ConnectedServiceName: some_service\n    ', {line: 4, character: 4}, {minimum: 6});
            const labels = list.items.map(item => item.label);
            assert.equal(labels.filter(l => l.toUpperCase() === "azureSubscription".toUpperCase()).length, 0);
        }
    });

    it('suggests tasks under expressions', async function() {
        const list = await runTaskCompletionItemsTest(`
steps:
- \${{ if succeeded() }}:
  - `, {line: 3, character: 4}, {expected: 7});
        const labels = list.items.map(item => item.label);
        assert.ok(labels.includes('task'));
    });

    it('suggests properties under expressions', async function() {
        const list = await runTaskCompletionItemsTest(`
steps:
- task: azureAppServiceManage@0
  inputs:
    \${{ if succeeded() }}:
      a`, {line: 5, character: 7}, {minimum: 1});
        const labels = list.items.map(item => item.label);
        assert.ok(labels.includes('azureSubscription'));
    });
});

const workspaceContext = {
    resolveRelativePath: (relativePath: string, resource: string) => {
        return URL.resolve(resource, relativePath);
    }
};

const requestService = (path: string): Promise<string> => {
    return fs.readFile(path, 'utf-8');
};

const schemaResolver = (url: string): Promise<JSONSchema> => {
    return Promise.resolve(JSONSchemaService.ParseSchema(url));
}


// Given a file and a position, this test expects the task list to show as completion items.
async function runTaskCompletionItemsTest(content: string, position: Position, suggestions: Suggestions): Promise<CompletionList> {
    // Arrange
    const schemaUri: string = "test/pipelinesTests/schema.json";
    const schemaService = new JSONSchemaService.JSONSchemaService(schemaResolver, workspaceContext, requestService);

    const yamlCompletion = new YAMLCompletion(schemaService, [], Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);

    const completionFix = completionHelper(textDocument, position);
    const newText = completionFix.newText;
    const yamlDoc = yamlparser.parse(newText);

    // Act
    const completionList = await yamlCompletion.doComplete(textDocument, position, yamlDoc);

    // Assert

    if (typeof suggestions.expected != 'undefined') {
        assert.equal(completionList.items.length, suggestions.expected);
    }
    else {
        if (typeof suggestions.minimum != 'undefined') {
            assert.ok(completionList.items.length >= suggestions.minimum);
        }

        if (typeof suggestions.maximum != 'undefined') {
            assert.ok(completionList.items.length <= suggestions.maximum);
        }
    }

    return completionList;
}
