
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
import * as util from 'util';
import * as logger from '../src/logger';

const schemaUri: string = "file:///E%3A/ExtensionLearning/azure-pipelines-language-server/unittests/schema.json";

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

suite("Validate matching schemas for document", function() {
    this.timeout(20000);

    test ('When the document has a string final node, we should see matching schemas for tasks', async function() {
        // Arrange
        const jsonDocument: JSONDocument = getJsonDocument('steps:\n- task: npmAuthenticate@0');
        const jsonSchemaService = new JSONSchemaService.JSONSchemaService(null);
        const schema: JSONSchemaService.ResolvedSchema = await jsonSchemaService.resolveSchemaContent(getSchema(), schemaUri);

        // Act
        const matchingSchemas: IApplicableSchema[] = jsonDocument.getMatchingSchemas(schema.schema);

        // Assert
        let matchFound: boolean = false;
        for (var i = 0; i < matchingSchemas.length; i++) {
            const applicableSchema: IApplicableSchema = matchingSchemas[i];

            if (applicableSchema.node.type === 'string' 
                && applicableSchema.schema.enum 
                && applicableSchema.schema.enum.length === 160) {
                matchFound = true;
            }
        }
        
        assert.equal(matchFound, true);
    });

    // This is the one that currently fails downstream. We don't see matching schemas for tasks when we should.
    // We get 4 matches instead of 8, and the match to show the task enum list isn't there.
    test ('When the document has a null final node, we should see matching schemas for tasks', async function() {
        // Arrange
        const jsonDocument: JSONDocument = getJsonDocument('steps:\n- task: ');
        const jsonSchemaService = new JSONSchemaService.JSONSchemaService(null);
        const schema: JSONSchemaService.ResolvedSchema = await jsonSchemaService.resolveSchemaContent(getSchema(), schemaUri);

        // Act
        const matchingSchemas: IApplicableSchema[] = jsonDocument.getMatchingSchemas(schema.schema);

        // Assert
        let matchFound: boolean = false;
        for (var i = 0; i < matchingSchemas.length; i++) {
            const applicableSchema: IApplicableSchema = matchingSchemas[i];

            if (applicableSchema.node.type === 'null' 
                && applicableSchema.schema.enum 
                && applicableSchema.schema.enum.length === 160) {
                matchFound = true;
            }
        }
        
        assert.equal(matchFound, true);
    });
});

/**
 * Helpers.
 */

let workspaceContext = {
	resolveRelativePath: (relativePath: string, resource: string) => {
		return URL.resolve(resource, relativePath);
	}
};

const requestService = (uri: string): Thenable<string> => {
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

function getJsonDocument(content: string): JSONDocument {
    // we are just copying the structure of his code for now, for simplicity
    

    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const yamlDoc: yamlparser.YAMLDocument = yamlparser.parse(content);

    const position: Position = { "line": 1, "character": 7 };
    let offset = textDocument.offsetAt(position);
    let currentDoc: yamlparser.SingleYAMLDocument = arrayutils.matchOffsetToDocument(offset, yamlDoc);

    return currentDoc;
}

function getSchema(): JSONSchemaService.ResolvedSchema {
    const schemaText: string = fs.readFileSync('unittests/schema.json', 'utf8');
    const resolvedSchema: JSONSchemaService.ResolvedSchema = new JSONSchemaService.ResolvedSchema(JSON.parse(schemaText));

    return resolvedSchema;
}

// Given a file and a position, this test expects the task list to show as completion items.
async function runTaskCompletionItemsTest(content: string, line: number, character: number, expectedTaskCount: number) {
    // Arrange
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

    console.log('\n\n\n\n\n');
}
