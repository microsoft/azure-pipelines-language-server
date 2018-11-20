import fs = require('fs');
import { YAMLCompletion } from '../../src/services/yamlCompletion';
import * as JSONSchemaService from '../../src/services/jsonSchemaService';
import * as URL from 'url';
import { TextDocument, Position, CompletionList } from 'vscode-languageserver-types';
import * as yamlparser from '../../src/parser/yamlParser'
import { Thenable } from '../../src/yamlLanguageService';
import * as assert from 'assert';
import { completionHelper } from '../../src/utils/yamlServiceUtils';

suite("Yaml Completion Service Tests", function () {
    this.timeout(20000);

    test('Given empty file completion should give suggestions', async function () {
       const list = await runTaskCompletionItemsTest("", 0, 0, 11);
       const labels = list.items.map(item => item.label);
       assert.equal(labels.filter(l => l === "name").length, 1);
       assert.equal(labels.filter(l => l === "steps").length, 1);
       assert.equal(labels.filter(l => l === "variables").length, 1);
       assert.equal(labels.filter(l => l === "server").length, 0, "obsolete should not be suggested");
    });

    test('Given steps context completion should give suggestions of possible steps', async function () {
        await runTaskCompletionItemsTest("steps:\n- ", 1, 2, 8);
     });

    test('Given an already valid file with task name, autocomplete should still give all suggestions', async function () {
        await runTaskCompletionItemsTest('steps:\n- task: npmAuthenticate@0', 1, 26, 165);
    });

    test ('Given a new file with steps and task, autocomplete should give suggestions', async function() {
         await runTaskCompletionItemsTest('steps:\n  - task: ', 1, 10, 165);
    });

    test ('All completion text for properties should end with `:`', async function() {
        const list = await runTaskCompletionItemsTest('', 0, 0, 11);
        list.items.forEach(item => {
            assert.equal(item.textEdit.newText.search(":") > 0, true, "new text should contain `:`");
        });
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

const schemaResolver = (url: string): Promise<string> => {
    return Promise.resolve(url);
}


// Given a file and a position, this test expects the task list to show as completion items.
async function runTaskCompletionItemsTest(content: string, line: number, character: number, expectedTaskCount: number): Promise<CompletionList> {
    // Arrange
    const schemaUri: string = "test/completion/schema.json";
    const schemaService = new JSONSchemaService.JSONSchemaService(schemaResolver, workspaceContext, requestService);

    const yamlCompletion = new YAMLCompletion(schemaService, [], Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const position: Position = { line, character };

    const completionFix = completionHelper(textDocument, position);
    const newText = completionFix.newText;
    const yamlDoc = yamlparser.parse(newText);

    // Act
    const completionList = await yamlCompletion.doComplete(textDocument, position, yamlDoc);

    // Assert

    assert.equal(completionList.items.length, expectedTaskCount);

    return completionList;
}
