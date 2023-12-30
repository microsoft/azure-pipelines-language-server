/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from "path";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";
import { TextDocument, Position, Definition, Location, Range } from "vscode-languageserver-types";
import { URI, Utils } from "vscode-uri";

import { StringASTNode } from "../parser/jsonParser";
import { YAMLDocument } from "../parser/yamlParser";

export class YAMLDefinition {

    private promise: PromiseConstructor;

    constructor(promiseConstructor: PromiseConstructor) {
        this.promise = promiseConstructor || Promise;
    }

    public doDefinition(document: TextDocument, position: Position, yamlDocument: YAMLDocument, workspaceRoot: URI): Thenable<Definition> {
        const offset = document.offsetAt(position);

        const jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if(jsonDocument === null){
            return this.promise.resolve(void 0);
        }

        const node = jsonDocument.getNodeFromOffset(offset);

        // can only jump to definition for template declaration, which means:
        // * we must be on a string node (key: value)
        // * the key (location) must be "template"
        // * we must be on the _value_ of the node
        //
        // In other words...
        // - template: my_cool_template.yml
        //             ^^^^^^^^^^^^^^^^^^^^ this part
        if (!(node instanceof StringASTNode) || node.location !== 'template' || node.isKey) {
            return this.promise.resolve(void 0);
        }

        let [location, resource] = node
            .value
            .split('@');

        // cannot jump to external resources
        if (resource && resource !== 'self') {
            return this.promise.resolve(void 0);
        }

        // Azure Pipelines accepts both forward and back slashes as path separators,
        // even when running on non-Windows.
        // To make things easier, normalize all path separators into this platform's path separator.
        // That way, vscode-uri will operate on the separators as expected.
        location = location
            .replaceAll(path.posix.sep, path.sep)
            .replaceAll(path.win32.sep, path.sep);

        // determine if abs path (from root) or relative path
        // NOTE: Location.create takes in a string, even though the parameter is called 'uri'.
        // So create an actual URI, then .toString() it and skip the unnecessary encoding.
        let definitionUri = '';
        if (location.startsWith(path.sep)) {
            // Substring to strip the leading separator.
            definitionUri = Utils.joinPath(workspaceRoot, location.substring(1)).toString(true);
        }
        else {
            definitionUri = Utils.resolvePath(
                Utils.dirname(URI.parse(document.uri, true)),
                location
            ).toString(true);
        }

        const definition = Location.create(definitionUri, Range.create(0, 0, 0, 0));

        return this.promise.resolve(definition);
    }
}
