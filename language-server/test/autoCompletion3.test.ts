/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LanguageService, getLanguageService } from 'azure-pipelines-language-service'
import { schemaRequestService, workspaceContext }  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service';
import { completionHelper } from 'azure-pipelines-language-service';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);

let dirName = __dirname.replace("\\", "/");
if (!dirName.startsWith("/")) {
	dirName = "/" + dirName;
}
let uri = 'file://' + dirName + '/autoCompletion3.schema.json';
let languageSettings = {
	schemas: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

describe("Auto Completion Tests", () => {

	function parseSetup(content: string, position){
		let document = TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
		let completion = completionHelper(document, document.positionAt(position));
		let jsonDocument = parseYAML(completion.newText);
		return languageService.doComplete(document, completion.newPosition, jsonDocument);
	}

	describe('yamlCompletion with firstProperty', function(){

		describe('doComplete', function(){

			it('single entry firstProperty', (done) => {
				let content = "objectWithSingleFirstProperty:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 1);
				}).then(done, done);
			});

			it('multiple entry firstProperty', (done) => {
				let content = "objectWithMultipleFirstProperty:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					assert.equal(result.items.length, 2);
				}).then(done, done);
			});

			it('empty firstProperty', (done) => {
				let content = "objectWithEmptyFirstProperty:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					assert.equal(result.items.length, 5);
				}).then(done, done);
			});
		});
	});

	describe('yamlCompletion with deprecation', function () {

		describe('doComplete', function () {

			it('object with deprecated message', (done) => {
				let content = "deprecatedObject:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					//the user has already created the object, we should still suggest its properties
					assert.equal(result.items.length, 5);
				}).then(done, done);
			});

			it('object with do not suggest', (done) => {
				let content = "doNotSuggestObject:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					//the user has already created the object, we should still suggest its properties
					assert.equal(result.items.length, 5);
				}).then(done, done);
			});

			it('property with deprecated message', (done) => {
				let content = "objectWithDeprecatedString:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					assert.equal(result.items.length, 4);
				}).then(done, done);
			});

			it('property with do not suggest', (done) => {
				let content = "objectWithDeprecatedSubObject:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					assert.equal(result.items.length, 4);
				}).then(done, done);
			});

			it('object with more than one deprecated property', (done) => {
				let content = "objectWithTwoDeprecatedProperties:\n  ";
				let completion = parseSetup(content, content.length);
				completion.then(function (result) {
					assert.equal(result.items.length, 3);
				}).then(done, done);
			});
		});
	});
});
