/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument, Hover, MarkupContent, MarkedString} from 'vscode-languageserver';
import {getLanguageService} from 'azure-pipelines-language-service/yamlLanguageService'
import {schemaRequestService, workspaceContext}  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service/parser/yamlParser';
import { type } from 'os';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);


let uri = 'http://json.schemastore.org/bowerrc';
let languageSettings = {
	schemas: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

export function assertHasContents(result: Hover): void {
	assert.true(result.contents);
	if (typeof(result.contents) == "string") {
		assert.true(result.contents.length > 0);
	}
	else if (result.contents.hasOwnProperty('value')) {
		let resultValue: any = result.contents['value'];
		if (typeof(resultValue) == "string") {
			assert.true(resultValue.length > 0)
		}
		else {
			assert.true(false);
		}
	}
	else {
		let hasAnyContent: boolean = false;
		let contentArray: MarkedString[] = <MarkedString[]>(result.contents);
		for (let contentLine in contentArray) {
			if (typeof(contentLine) == "string") {
				hasAnyContent = contentLine.length > 0
			}
			else {
				let contentLineValue: any = contentLine['value'];
				if (typeof(contentLineValue) == "string") {
					hasAnyContent = contentLineValue.length > 0;
				}
				else {
					assert.true(false);
				}
			}
		}

		assert.true(hasAnyContent);
	}
}

suite("Hover Tests", () => {

	
	describe('Yaml Hover with bowerrc', function(){
		
		describe('doComplete', function(){
			
			function setup(content: string): TextDocument{
				return TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
			}

			function parseSetup(content: string, position): Thenable<Hover> {
				let testTextDocument = setup(content);
                let jsonDocument = parseYAML(testTextDocument.getText());
                return languageService.doHover(testTextDocument, testTextDocument.positionAt(position), jsonDocument);
			}

			it('Hover on key on root', (done) => {
				let content: string = "cwd: test";
				let hover: Thenable<Hover> = parseSetup(content, 1);
				hover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
            });
            
            it('Hover on value on root', (done) => {
				let content: string = "cwd: test";
				let hover: Thenable<Hover> = parseSetup(content, 6);
				hover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
            });

            it('Hover on key with depth', (done) => {
				let content: string = "scripts:\n  postinstall: test";
				let hover: Thenable<Hover> = parseSetup(content, 15);
				hover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
            });

            it('Hover on value with depth', (done) => {
				let content: string = "scripts:\n  postinstall: test";
				let hover: Thenable<Hover> = parseSetup(content, 26);
				hover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
            });

            it('Hover works on both root node and child nodes works', (done) => {
				let content: string = "scripts:\n  postinstall: test";
                
                let firstHover: Thenable<Hover> = parseSetup(content, 3);
                firstHover.then(function(result: Hover){
					assertHasContents(result);
                });
                
                let secondHover: Thenable<Hover> = parseSetup(content, 15);
				secondHover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
            });

            it('Hover does not show results when there isnt description field', (done) => {
				let content: string = "analytics: true";
				let hover: Thenable<Hover> = parseSetup(content, 3);
				hover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
			});
			
			it('Hover on multi document', (done) => {
				let content: string = '---\nanalytics: true\n...\n---\njson: test\n...';
				let hover: Thenable<Hover> = parseSetup(content, 30);
				hover.then(function(result: Hover){
					assertHasContents(result);
				}).then(done, done);
            });
		});
	});
});