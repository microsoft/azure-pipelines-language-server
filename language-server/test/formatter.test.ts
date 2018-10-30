/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
    TextDocument} from 'vscode-languageserver';
import { getLanguageService } from 'azure-pipelines-language-service'
import { schemaRequestService, workspaceContext } from './testHelper';
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
languageService.configure(languageSettings);

// Defines a Mocha test suite to group tests of similar kind together
suite("Formatter Tests", () => {

    // Tests for validator
    describe('Formatter', function () {

        function setup(content: string) {
            return TextDocument.create("file://~/Desktop/vscode-k8s/test.yaml", "yaml", 0, content);
        }

        describe('Test that formatter works with custom tags', function () {

            it('Formatting works without custom tags', () => {
                let content = `cwd: test`;
                let testTextDocument = setup(content);
                let edits = languageService.doFormat(testTextDocument, {
                    insertSpaces: true,
                    tabSize: 4
                }, languageSettings.customTags);
                assert.notEqual(edits.length, 0);
                assert.equal(edits[0].newText, "cwd: test\n");
            });

            it('Formatting works without custom tags', () => {
                let content = `cwd:       !Test test`;
                let testTextDocument = setup(content);
                let edits = languageService.doFormat(testTextDocument, {
                    insertSpaces: true,
                    tabSize: 4
                }, languageSettings.customTags);
                assert.notEqual(edits.length, 0);
            });

        });

    });
});
