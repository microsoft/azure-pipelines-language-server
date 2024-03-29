/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDocument } from 'vscode-languageserver-textdocument';
import {getLanguageService} from 'azure-pipelines-language-service'
import {schemaRequestService, workspaceContext}  from './testHelper';
import { parse as parseYAML } from 'azure-pipelines-language-service';
var assert = require('assert');

let languageService = getLanguageService(schemaRequestService, [], null, workspaceContext);

let uri = 'http://json.schemastore.org/bowerrc';
let languageSettings = {
	schemas: [],
	validate: true,
	customTags: []
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageSettings.customTags.push("!Test");
languageSettings.customTags.push("!Ref sequence");
languageService.configure(languageSettings);

// Defines a Mocha test suite to group tests of similar kind together
describe("Validation Tests", () => {

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
		describe('Test that validation does not throw errors', function(){

			it('Basic test', (done) => {
				let content = `analytics: true`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Basic test on nodes with children', (done) => {
				let content = `scripts:\n  preinstall: test1\n  postinstall: test2`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Advanced test on nodes with children', (done) => {
				let content = `analytics: true\ncwd: this\nscripts:\n  preinstall: test1\n  postinstall: test2`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Type string validates under children', (done) => {
				let content = `registry:\n  register: test_url`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

            it('Include with value should not error', (done) => {
				let content = `customize: !include customize.yaml`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Null scalar value should be treated as string', (done) => {
				let content = `cwd: Null`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Anchor should not not error', (done) => {
				let content = `default: &DEFAULT\n  name: Anchor\nanchor_test:\n  <<: *DEFAULT`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Emojis should not error', (done) => {
				let content = `#comment\nkey: 🔨`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Anchor with multiple references should not not error', (done) => {
				let content = `default: &DEFAULT\n  name: Anchor\nanchor_test:\n  <<: *DEFAULT\nanchor_test2:\n  <<: *DEFAULT`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Multiple Anchor in array of references should not not error', (done) => {
				let content = `default: &DEFAULT\n  name: Anchor\ncustomname: &CUSTOMNAME\n  custom_name: Anchor\nanchor_test:\n  <<: [*DEFAULT, *CUSTOMNAME]`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Multiple Anchors being referenced in same level at same time', (done) => {
				let content = `default: &DEFAULT\n  name: Anchor\ncustomname: &CUSTOMNAME\n  custom_name: Anchor\nanchor_test:\n  <<: *DEFAULT\n  <<: *CUSTOMNAME\n`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Custom Tags without type', (done) => {
				let content = `analytics: !Test false`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Custom Tags with type', (done) => {
				let content = `resolvers: !Ref\n  - test`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			describe('Type tests', function(){

				it('Type String does not error on valid node', (done) => {
					let content = `cwd: this`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Boolean does not error on valid node', (done) => {
					let content = `analytics: true`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Number does not error on valid node', (done) => {
					let content = `timeout: 60000`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Object does not error on valid node', (done) => {
					let content = `registry:\n  search: test_url`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Array does not error on valid node', (done) => {
					let content = `resolvers:\n  - test\n  - test\n  - test`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Do not error when there are multiple types in schema and theyre valid', (done) => {
					let content = `license: MIT`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					});
					done();
				});

			});

		});

		describe('Test that validation DOES throw errors', function(){
			it('Error when theres a finished untyped item', (done) => {
				let content = `cwd: hello\nan`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error when theres no value for a node', (done) => {
				let content = `storage:`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (string)', (done) => {
				let content = `analytics: hello`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (object)', (done) => {
				let content = `scripts: test`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (array)', (done) => {
				let content = `resolvers: test`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Include without value should error', (done) => {
				let content = `customize: !include`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 1);
				}).then(done, done);
			});

		});

	});
});
