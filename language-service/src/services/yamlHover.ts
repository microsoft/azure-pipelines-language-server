/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { JSONWorkerContribution } from "../jsonContributions";
import * as Parser from "../parser/jsonParser";
import { YAMLDocument } from "../parser/yamlParser";
import * as SchemaService from "./jsonSchemaService";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";
import { Hover, TextDocument, Position, Range, MarkedString } from "vscode-languageserver-types";
import { toMarkdown } from "../utils/strings";

export class YAMLHover {

    private schemaService: SchemaService.IJSONSchemaService;
    private contributions: JSONWorkerContribution[];
    private promise: PromiseConstructor;

    constructor(schemaService: SchemaService.IJSONSchemaService, contributions: JSONWorkerContribution[] = [], promiseConstructor: PromiseConstructor) {
        this.schemaService = schemaService;
        this.contributions = contributions;
        this.promise = promiseConstructor || Promise;
    }

    public doHover(document: TextDocument, position: Position, yamlDocument: YAMLDocument): Thenable<Hover> {

        if(!document){
            this.promise.resolve(void 0);
        }

        const offset: number = document.offsetAt(position);
        const jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if(jsonDocument === null){
            return this.promise.resolve(void 0);
        }
        let node = jsonDocument.getNodeFromOffset(offset);
        if (!node || (node.type === 'object' || node.type === 'array') && offset > node.start + 1 && offset < node.end - 1) {
            return this.promise.resolve(void 0);
        }
        let hoverRangeNode = node;

        // use the property description when hovering over an object key
        if (node.type === 'string') {
            let stringNode = <Parser.StringASTNode>node;
            if (stringNode.isKey) {
                let propertyNode = <Parser.PropertyASTNode>node.parent;
                node = propertyNode.value;
                if (!node) {
                    return this.promise.resolve(void 0);
                }    
            }
        }

        let hoverRange = Range.create(document.positionAt(hoverRangeNode.start), document.positionAt(hoverRangeNode.end));

        var createHover = (contents: MarkedString[]) => {
            let result: Hover = {
                contents: contents,
                range: hoverRange
            };
            return result;
        };

        let location = node.getPath();
        for (let i = this.contributions.length - 1; i >= 0; i--) {
            let contribution = this.contributions[i];
            let promise = contribution.getInfoContribution(document.uri, location);
            if (promise) {
                return promise.then(htmlContent => createHover(htmlContent));
            }
        }

        return this.schemaService.getSchemaForResource(document.uri).then((schema) => {
            if (schema) {

                let matchingSchemas = jsonDocument.getMatchingSchemas(schema.schema, node.start);

                let title: string = null;
                let markdownDescription: string = null;
                let markdownEnumValueDescription: string = null;
                let enumValue: string = null;
                let deprecatedDescription: string = null;
                matchingSchemas.every((s) => {
                    if (s.node === node && !s.inverted && s.schema) {
                        title = title || s.schema.title;
                        markdownDescription = markdownDescription || s.schema["markdownDescription"] || toMarkdown(s.schema.description);
                        deprecatedDescription = deprecatedDescription || s.schema["deprecationMessage"];
                        if (s.schema.enum)  {
                            let idx = s.schema.enum.indexOf(node.getValue());
                            if (s.schema["markdownEnumDescriptions"]) {
                                markdownEnumValueDescription = s.schema["markdownEnumDescriptions"][idx];
                            } else if (s.schema.enumDescriptions) {
                                markdownEnumValueDescription = toMarkdown(s.schema.enumDescriptions[idx]);
                            }
                            if (markdownEnumValueDescription) {
                                enumValue = s.schema.enum[idx];
                                if (typeof enumValue !== 'string') {
                                    enumValue = JSON.stringify(enumValue);
                                }
                            }
                        }
                    }
                    return true;
                });

                let result = '';
                if (deprecatedDescription) {
                    result = toMarkdown(deprecatedDescription);
                }

                if (title) {
                    if (result.length > 0) {
                        result += "\n\n";
                    }
                    result = toMarkdown(title);
                }

                if (markdownDescription) {
                    if (result.length > 0) {
                        result += "\n\n";
                    }
                    result += markdownDescription;
                }

                if (markdownEnumValueDescription) {
                    if (result.length > 0) {
                        result += "\n\n";
                    }
                    result += `\`${toMarkdown(enumValue)}\`: ${markdownEnumValueDescription}`;
                }

                return createHover([result]);
            }
            return void 0;
        });
    }
}

