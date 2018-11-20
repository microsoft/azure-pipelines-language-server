/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument } from 'vscode-languageserver';
import { LanguageService, getLanguageService, YAMLDocument, Diagnostic } from 'azure-pipelines-language-service'
import { schemaRequestService, workspaceContext }  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service';
import { completionHelper } from 'azure-pipelines-language-service';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);

let dirName = __dirname.replace("\\", "/");
if (!dirName.startsWith("/")) {
	dirName = "/" + dirName;
}
let uri = 'file://' + dirName + '/schemaValidation2.schema.json';
let languageSettings = {
	schemas: [],
	validate: true,
	customTags: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

suite("Non-standard validation Tests", () => {

	function parseSetup(content: string): Thenable<Diagnostic[]> {
		let document: TextDocument = TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
		let yamlDocument: YAMLDocument = parseYAML(document.getText());
		return languageService.doValidation(document, yamlDocument);
	}

	describe('validate matching JSON', function(){

		it('test with firstProperty', (done) => {
			const content: string = `name: type1\naction: type1-value1`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 0);
			}).then(done, done);
		});

		it('test with different value case', (done) => {
			const content: string = `name: type2\naction: Type2-Value1`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 0);
			}).then(done, done);
		});

		it('test with different key case', (done) => {
			const content: string = `name: type3\nAction: type3-value1`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 0);
			}).then(done, done);
		});
	});

	describe('validate failing JSON', function(){

		it('test with wrong property order', (done) => {
			const content: string = `action: type1-value1\nname: type1`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 1);
				assert.equal(result[0].message, "The first property must be name");
			}).then(done, done);
		});

		it('test with duplicate keys (same case)', (done) => {
			const content: string = `name: type1\naction: type1-value1\naction: type1-value2`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 2);
				assert.equal(result[0].message, "duplicate key");
				assert.equal(result[1].message, "duplicate key");
			}).then(done, done);
		});

		it('test with duplicate keys (different case)', (done) => {
			const content: string = `name: type1\naction: type1-value1\nAction: type1-value2`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 2);
				assert.equal(result[0].message, "Multiple properties found matching action");
				assert.equal(result[1].message, "Multiple properties found matching action");
			}).then(done, done);
		});

		it('test with invalid key case', (done) => {
			const content: string = `name: type2\nAction: type2-value2`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 1);
				assert.equal(result[0].message, "Missing property \"action\".");
			}).then(done, done);
		});

		it('test with invalid value case', (done) => {
			const content: string = `name: type3\naction: Type3-vAlue3`;
			const validator = parseSetup(content);
			validator.then(function(result){
				assert.equal(result.length, 1);
				assert.equal(result[0].message, "Value is not accepted. Valid values: \"type3-value1\", \"type3-value2\", \"type3-value3\".");
			}).then(done, done);
		});
	});
});
