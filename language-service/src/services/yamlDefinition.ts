/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { resolve, dirname, join } from "path";
import { YAMLDocument } from "../parser/yamlParser";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";
import { TextDocument, Position, Definition, Location } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

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

        const [value, repo] = node
            .getValue()
            .split('@');

        // cannot jump to external resources
        if (repo && repo != 'self') {
            return this.promise.resolve(void 0);
        }

        // determine if abs path (from root) or relative path
        let pathToDefinition = '';
        if (value.startsWith('/')) {
            const rootDir: string = workspaceRoot.path.toString();
            pathToDefinition = join(rootDir, value);
        }
        else {
            const documentPath: string = new URL(document.uri).pathname;
            pathToDefinition = resolve(dirname(documentPath), value);
        }
        
        const definition = Location.create(pathToDefinition, {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
          });

        return this.promise.resolve(definition);
    }
}

