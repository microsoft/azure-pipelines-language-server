/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LanguageService, getLanguageService } from 'azure-pipelines-language-service'
import { schemaRequestService, workspaceContext }  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service';
import { completionHelper } from 'azure-pipelines-language-service';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);


let uri = 'https://raw.githubusercontent.com/composer/composer/master/res/composer-schema.json';
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

	describe('yamlCompletion with composer', function(){

		describe('doComplete', function(){

			it('Array autocomplete without word', (done) => {
				let content = "authors:\n  - ";
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Array autocomplete with letter', (done) => {
				let content = "authors:\n  - n";
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Array autocomplete without word (second item)', (done) => {
				let content = "authors:\n  - name: test\n    ";
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Array autocomplete with letter (second item)', (done) => {
				let content = "authors:\n  - name: test\n    e";
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocompletion after array', (done) => {
				let content = "authors:\n  - name: test\n"
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocompletion after array with depth', (done) => {
				let content = "archive:\n  exclude:\n  - test\n"
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocompletion after array with depth', (done) => {
				let content = "autoload:\n  classmap:\n  - test\n  exclude-from-classmap:\n  - test\n  "
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

		});

		describe('Failure tests', function(){

			it('Autocompletion has no results on value when they are not available', (done) => {
				let content = "time: "
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocompletion has no results on value when they are not available (with depth)', (done) => {
				let content = "archive:\n  exclude:\n    - test\n    "
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocompletion does not complete on wrong spot in array node', (done) => {
				let content = "authors:\n  - name: test\n  "
				let completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 0);
				}).then(done, done);
			});

		});

	});
});
