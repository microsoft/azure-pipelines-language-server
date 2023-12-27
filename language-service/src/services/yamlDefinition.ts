/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { YAMLDocument } from "../parser/yamlParser";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";
import { TextDocument, Position, Definition, Location } from "vscode-languageserver-types";
import { URI, Utils } from "vscode-uri";

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
        let node = jsonDocument.getNodeFromOffset(offset);
        if (!node || (node.type === 'object' || node.type === 'array') && offset > node.start + 1 && offset < node.end - 1) {
            return this.promise.resolve(void 0);
        }
        
        // can only jump to definition for template declaration
        if (node.location !== 'template') {
            return this.promise.resolve(void 0);
        }

        const [location, resource] = node
            .getValue()
            .split('@');

        // cannot jump to external resources
        if (resource && resource != 'self') {
            return this.promise.resolve(void 0);
        }

        // determine if abs path (from root) or relative path
        let pathToDefinition = '';
        if (location.startsWith('/')) {
            pathToDefinition = Utils.joinPath(workspaceRoot, location).path;
        }
        else {
            pathToDefinition = Utils.resolvePath(
                Utils.dirname(URI.parse(document.uri)),
                location
            ).path;
        }
        
        const definition = Location.create(pathToDefinition, {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
          });

        return this.promise.resolve(definition);
    }
}

