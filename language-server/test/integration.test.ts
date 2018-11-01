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

let uri = "https://gist.githubusercontent.com/JPinkney/ccaf3909ef811e5657ca2e2e1fa05d76/raw/f85e51bfb67fdb99ab7653c2953b60087cc871ea/openshift_schema_all.json";
let languageSettings = {
	schemas: [],
	validate: true
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

// Defines a Mocha test suite to group tests of similar kind together
suite("Kubernetes Integration Tests", () => {

	// Tests for validator
	describe('Yaml Validation with kubernetes', function() {

		function setup(content: string){
			return TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
		}

		function parseSetup(content: string){
			let testTextDocument = setup(content);
			let yDoc = parseYAML(testTextDocument.getText());
			for(let jsonDoc in yDoc.documents){
				yDoc.documents[jsonDoc].configureSettings({
					isKubernetes: true
				});
			}
			return languageService.doValidation(testTextDocument, yDoc);
		}

		//Validating basic nodes
		describe('Test that validation does not throw errors', function(){

			it('Basic test', (done) => {
				let content = `apiVersion: v1`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Basic test on nodes with children', (done) => {
				let content = `metadata:\n  name: hello`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Advanced test on nodes with children', (done) => {
				let content = `apiVersion: v1\nmetadata:\n  name: test1`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			it('Type string validates under children', (done) => {
				let content = `apiVersion: v1\nkind: Pod\nmetadata:\n  resourceVersion: test`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 0);
				}).then(done, done);
			});

			describe('Type tests', function(){

				it('Type String does not error on valid node', (done) => {
					let content = `apiVersion: v1`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Boolean does not error on valid node', (done) => {
					let content = `readOnlyRootFilesystem: false`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Number does not error on valid node', (done) => {
					let content = `generation: 5`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Object does not error on valid node', (done) => {
					let content = `metadata:\n  clusterName: tes`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

				it('Type Array does not error on valid node', (done) => {
					let content = `items:\n  - apiVersion: v1`;
					let validator = parseSetup(content);
					validator.then(function(result){
						assert.equal(result.length, 0);
					}).then(done, done);
				});

			});

		});

		describe('Test that validation DOES throw errors', function(){
			it('Error when theres no value for a node', (done) => {
				let content = `apiVersion:`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (number)', (done) => {
				let content = `apiVersion: 1000`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (boolean)', (done) => {
				let content = `apiVersion: False`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (string)', (done) => {
				let content = `isNonResourceURL: hello_world`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type (object)', (done) => {
				let content = `apiVersion: v1\nkind: Pod\nmetadata:\n  name: False`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Error on incorrect value type in multiple yaml documents', (done) => {
				let content = `---\napiVersion: v1\n...\n---\napiVersion: False\n...`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.notEqual(result.length, 0);
				}).then(done, done);
			});

			it('Property error message should be \"Unexpected property {$property_name}\" when property is not allowed ', (done) => {
				let content = `unknown_node: test`;
				let validator = parseSetup(content);
				validator.then(function(result){
					assert.equal(result.length, 1);
					assert.equal(result[0].message, "Unexpected property unknown_node");
				}).then(done, done);
			});

		});

	});

	describe('yamlCompletion with kubernetes', function(){

		describe('doComplete', function(){

			function parseSetup(content: string, position){
				let testTextDocument = TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
				let yDoc = parseYAML(testTextDocument.getText());
				for(let jsonDoc in yDoc.documents){
					yDoc.documents[jsonDoc].configureSettings({
						isKubernetes: true
					});
				}
				let completion = completionHelper(testTextDocument, testTextDocument.positionAt(position));
				let jsonDocument = parseYAML(completion.newText);
				return languageService.doComplete(testTextDocument, completion.newPosition, jsonDocument);
			}

			it('Autocomplete on root node without word', (done) => {
				let content = "";
				let completion = parseSetup(content, 0);
				completion.then(function(result){
                    assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on root node with word', (done) => {
				let content = "api";
				let completion = parseSetup(content, 6);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on default value (without value content)', (done) => {
				let content = "apiVersion: ";
				let completion = parseSetup(content, 10);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on default value (with value content)', (done) => {
				let content = "apiVersion: v1\nkind: Bin";
				let completion = parseSetup(content, 19);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete on boolean value (without value content)', (done) => {
				let content = "isNonResourceURL: ";
				let completion = parseSetup(content, 18);
				completion.then(function(result){
					assert.equal(result.items.length, 2);
				}).then(done, done);
			});

			it('Autocomplete on boolean value (with value content)', (done) => {
				let content = "isNonResourceURL: fal";
				let completion = parseSetup(content, 21);
				completion.then(function(result){
					assert.equal(result.items.length, 2);
				}).then(done, done);
			});

			it('Autocomplete key in middle of file', (done) => {
				let content = "metadata:\n  nam";
				let completion = parseSetup(content, 14);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});

			it('Autocomplete key in middle of file 2', (done) => {
				let content = "metadata:\n  name: test\n  cluster";
				let completion = parseSetup(content, 31);
				completion.then(function(result){
					assert.notEqual(result.items.length, 0);
				}).then(done, done);
			});
		});
	});
});
