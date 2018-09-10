
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
import { JSONDocument, IApplicableSchema } from '../src/languageservice/parser/jsonParser';
import * as arrayutils from '../src/languageservice/utils/arrUtils';

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
        await runTaskCompletionItemsTest('steps:\n- task: ', 1, 7, 0);
    });
});



function getJsonDocument(content: string): JSONDocument {
    // we are just copying the structure of his code for now, for simplicity
    const schemaUri: string = "file:///d%3A/ExtensionLearning/azure-pipelines-language-server/unittests/schema.json";
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const yamlDoc: yamlparser.YAMLDocument = yamlparser.parse(content);

    const position: Position = { "line": 1, "character": 7 };
    let offset = textDocument.offsetAt(position);
    let currentDoc: yamlparser.SingleYAMLDocument = arrayutils.matchOffsetToDocument(offset, yamlDoc);

    return currentDoc;
}

suite("Validate matching schemas for document", function() {
    this.timeout(20000);

    test ('When the document has a string final node, we should see matching schemas for tasks', async function() {
        // // Arrange
        // const jsonDocument: JSONDocument = getJsonDocument('steps:\n- task: npmAuthenticate@0');
        // const schema: JSONSchemaService.ResolvedSchema = getSchema();

        // // Act
        // const matchingSchemas: IApplicableSchema[] = jsonDocument.getMatchingSchemas(schema.schema);

        // // Assert
        // assert.equal(matchingSchemas.length, 8);
    });

    test ('When the document has a null final node, we should see matching schemas for tasks', async function() {
        // TODO: This is the one that currently fails downstream. We don't see matching schemas for tasks when we should.



        
    });

    test ('', async function() {
        
    });
});

function getSchema(): JSONSchemaService.ResolvedSchema {
    const schemaText: string = fs.readFileSync('unittests/schema.json', 'utf8');
    const resolvedSchema: JSONSchemaService.ResolvedSchema = JSON.parse(schemaText);

    return resolvedSchema;
}

// Given a file and a position, this test expects the task list to show as completion items.
async function runTaskCompletionItemsTest(content: string, line: number, character: number, expectedTaskCount: number) {
    // Arrange
    const schemaUri: string = "file:///E%3A/ExtensionLearning/azure-pipelines-language-server/unittests/schema.json";

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
