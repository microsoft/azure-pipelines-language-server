/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument } from 'vscode-languageserver-types';
import { LanguageService, getLanguageService } from 'azure-pipelines-language-service'
import { schemaRequestService, workspaceContext }  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service';
import { completionHelper } from 'azure-pipelines-language-service';
var assert = require('assert');

let languageService: LanguageService = getLanguageService(schemaRequestService, [], null, workspaceContext);


let uri = 'http://json.schemastore.org/bowerrc';
let languageSettings = {
	schemas: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

suite("Auto Completion Tests", () => {


	describe('yamlCompletion with bowerrc', function(){

		describe('doComplete', function(){

			function parseSetup(content: string, position){
				const document = TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
				const completion = completionHelper(document, document.positionAt(position));
				const jsonDocument = parseYAML(completion.newText);
				return languageService.doComplete(document, completion.newPosition, jsonDocument);
			}

			it('Autocomplete on root node without word', (done) => {
				const content: string = "";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
                    assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on root node with word', (done) => {
				const content: string = "analyt";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on default value (without value content)', (done) => {
				const content: string = "directory: ";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on default value (with value content)', (done) => {
				const content: string = "directory: bow";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on boolean value (without value content)', (done) => {
				const content: string = "analytics: ";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 2);
				}).then(done, done);
			});

			it('Autocomplete on boolean value (with value content)', (done) => {
				const content: string = "analytics: fal";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 2);
				}).then(done, done);
			});

			it('Autocomplete on number value (without value content)', (done) => {
				const content: string = "timeout: ";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 1);
				}).then(done, done);
			});

			it('Autocomplete on number value (with value content)', (done) => {
				const content: string = "timeout: 6";
				const completion = parseSetup(content, content.length);
				completion.then(function(result){
					assert.equal(result.items.length, 1);
				}).then(done, done);
			});

			it('Autocomplete key in middle of file', (done) => {
				const preCursorContent: string = "scripts:\n  po";
				const postCursorConent: string = "st";
				const completion = parseSetup(preCursorContent + postCursorConent, preCursorContent.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete key in middle of file 2', (done) => {
				const preCursorContent: string = "scripts:\n  postinstall: /test\n  pr"
				const postCursorContent: string = "einsta";
				const completion = parseSetup(preCursorContent + postCursorContent, preCursorContent.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete does not happen right before :', (done) => {
				const preCursorContent: string = "analytics";
				const postCursorContent: string = ":";
				const completion = parseSetup(preCursorContent + postCursorContent, preCursorContent.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete does not happen right before : under an object', (done) => {
				const preCursorContent: string = "scripts:\n  postinstall";
				const postCursorContent: string = ":";
				const completion = parseSetup(preCursorContent + postCursorContent, preCursorContent.length);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});
		});
	});
});
