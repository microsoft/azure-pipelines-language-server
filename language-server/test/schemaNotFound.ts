/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument } from 'vscode-languageserver';
import {getLanguageService} from 'azure-pipelines-language-service/yamlLanguageService'
import {schemaRequestService, workspaceContext}  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service/parser/yamlParser';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);

let uri = 'SchemaDoesNotExist';
let languageSettings = {
	schemas: [],
	validate: true,
	customTags: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

// Defines a Mocha test suite to group tests of similar kind together
suite("Validation Tests", () => {

	// Tests for validator
	describe('Validation', function() {
		
		function setup(content: string){
			return TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
		}

		function parseSetup(content: string){
			let testTextDocument = setup(content);
			let yDoc = parseYAML(testTextDocument.getText(), languageSettings.customTags);
			return languageService.doValidation(testTextDocument, yDoc);
		}

		//Validating basic nodes
		describe('Test that validation throws error when schema is not found', function(){
			
			it('Basic test', (done) => {
				let content = `testing: true`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.NotEqual(result.length, 0);
				}).then(done, done);
			});

        });

    });
});
