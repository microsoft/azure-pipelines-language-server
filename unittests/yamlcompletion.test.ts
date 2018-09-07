
import Strings = require( '../src/languageservice/utils/strings');
import URI from 'vscode-uri';
import fs = require('fs');
import { YAMLCompletion } from '../src/languageservice/services/yamlCompletion';
import * as JSONSchemaService from '../src/languageservice/services/jsonSchemaService';
import * as URL from 'url';
import { TextDocument, Position } from 'vscode-languageserver-types';
import * as yamlparser from '../src/languageservice/parser/yamlParser'
import { Thenable } from '../src/languageservice/yamlLanguageService';
import * as assert from 'assert';

let workspaceContext = {
	resolveRelativePath: (relativePath: string, resource: string) => {
		return URL.resolve(resource, relativePath);
	}
};

const requestService = (uri: string): Thenable<string> => {
    console.log('uri: ' + uri);
    if (Strings.startsWith(uri, 'file://')) {
        let fsPath = URI.parse(uri).fsPath;
        
        console.log('fsPath: ' + fsPath);

        return new Promise<string>((c, e) => {
            fs.readFile(fsPath, 'UTF-8', (err, result) => {
                err ? e('') : c(result.toString());
            });
        });
    }
};

suite("Yaml Completion Service Tests", function() {
    this.timeout(20000);

    test ('Given an already valid file with task name, autocomplete should give suggestions', async function() {
        await runTaskCompletionItemsTest('steps:\n- task: npmAuthenticate@0', 1, 7, 160);
    });

    test ('Given a new file with steps and task, autocomplete should give suggestions', async function() {
        // TODO: We actually want expectedTaskCount to be 160, not 0. This is the bug.
        await runTaskCompletionItemsTest('steps:\n- task: ', 1, 7, 160);
    });
});

// Given a file and a position, this test expects the task list to show as completion items.
async function runTaskCompletionItemsTest(content: string, line: number, character: number, expectedTaskCount: number) {
    // Arrange
    const schemaUri: string = "file:///d%3A/ExtensionLearning/azure-pipelines-language-server/unittests/schema.json";

    let schemaService = new JSONSchemaService.JSONSchemaService(requestService, workspaceContext, null);
    schemaService.setSchemaContributions({ schemaAssociations: { '*.*': [schemaUri] } });

    const yamlCompletion = new YAMLCompletion(schemaService, [], Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const position: Position = { "line": line, "character": character };

    // TODO: Why do we pass the content again? It should come from the created file on disk.
    const yamlDoc: yamlparser.YAMLDocument = yamlparser.parse(content);

    // Act
    const completionList = await yamlCompletion.doComplete(textDocument, position, yamlDoc);

    // Assert
    
    assert.equal(completionList.items.length, expectedTaskCount);
}
