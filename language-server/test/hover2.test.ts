/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
	TextDocument} from 'vscode-languageserver';
import {getLanguageService} from 'azure-pipelines-language-service'
import {schemaRequestService, workspaceContext}  from './testHelper';
import {assertHasContents} from './hover.test'
import { parse as parseYAML } from 'azure-pipelines-language-service';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);


let uri = 'http://json.schemastore.org/composer';
let languageSettings = {
	schemas: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

suite("Hover Tests", () => {

	
	describe('Yaml Hover with composer schema', function(){
		
		describe('doComplete', function(){
			
			function setup(content: string){
				return TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
			}

			function parseSetup(content: string, position){
				let testTextDocument = setup(content);
                let jsonDocument = parseYAML(testTextDocument.getText());
                return languageService.doHover(testTextDocument, testTextDocument.positionAt(position), jsonDocument);
			}

            it('Hover works on array nodes', (done) => {
				let content = "authors:\n  - name: Josh";
				let hover = parseSetup(content, 14);
				hover.then(function(result){
					assertHasContents(result);
				}).then(done, done);
            });
            
            it('Hover works on array nodes 2', (done) => {
				let content = "authors:\n  - name: Josh\n  - email: jp";
				let hover = parseSetup(content, 28);
				hover.then(function(result){
					assertHasContents(result);
				}).then(done, done);
            });
		});
	});
});
