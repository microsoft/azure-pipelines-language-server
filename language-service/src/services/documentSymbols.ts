/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as Parser from "../parser/jsonParser";
import { YAMLDocument } from "../parser/yamlParser";

import { SymbolInformation, SymbolKind, TextDocument, Range, Location } from 'vscode-languageserver-types';

export class YAMLDocumentSymbols {

    public findDocumentSymbols(document: TextDocument, doc: YAMLDocument): SymbolInformation[] {

        if (!doc || !doc.documents || doc.documents.length === 0) {
            return null;
        }
    
        const collectOutlineEntries = (result: SymbolInformation[], node: Parser.ASTNode, containerName: string): SymbolInformation[] => {
            if (node.type === 'array') {
                (<Parser.ArrayASTNode>node).items.forEach((node: Parser.ASTNode) => {
                    collectOutlineEntries(result, node, containerName);
                });
            } else if (node.type === 'object') {
                const objectNode = <Parser.ObjectASTNode>node;
    
                objectNode.properties.forEach((property: Parser.PropertyASTNode) => {
                    const location = Location.create(document.uri, Range.create(document.positionAt(property.start), document.positionAt(property.end)));
                    const valueNode = property.value;
                    if (valueNode) {
                        const childContainerName = containerName ? containerName + '.' + property.key.value : property.key.value;
                        result.push({ name: property.key.getValue(), kind: this.getSymbolKind(valueNode.type), location: location, containerName: containerName });
                        collectOutlineEntries(result, valueNode, childContainerName);
                    }
                });
            }
            return result;
        };

        const results = [];

        doc.documents.forEach((yamlDocument: Parser.JSONDocument) => {
            if (yamlDocument.root) {
                const result = collectOutlineEntries([], yamlDocument.root, void 0);
                results.push(result);
            }
        });
        
        return results;
    }

    private getSymbolKind(nodeType: string): SymbolKind {
        switch (nodeType) {
            case 'object':
                return SymbolKind.Module;
            case 'string':
                return SymbolKind.String;
            case 'number':
                return SymbolKind.Number;
            case 'array':
                return SymbolKind.Array;
            case 'boolean':
                return SymbolKind.Boolean;
            default: // 'null'
                return SymbolKind.Variable;
        }
    }

}