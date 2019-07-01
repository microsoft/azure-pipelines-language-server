'use strict';

import * as Parser from "../parser/jsonParser";
import { YAMLDocument } from "../parser/yamlParser";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";
import { TextDocument, Position } from "vscode-languageserver-types";

export interface YamlNodeInfo {
    startPosition: Position;
    endPosition: Position;
    key: string;
    value: string;
}

export interface YamlNodePropertyValues {
    values: {[key: string]: string};
}

export class YAMLTraversal {

    private promise: PromiseConstructor;

    constructor(promiseConstructor: PromiseConstructor) {
        this.promise = promiseConstructor || Promise;
    }

    public findNodes(document: TextDocument, yamlDocument: YAMLDocument, key: string): Thenable<YamlNodeInfo[]> {
        if(!document){
            this.promise.resolve([]);
        }

        const jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if(jsonDocument === null){
            return this.promise.resolve([]);
        }

        let nodes: YamlNodeInfo[] = [];
        jsonDocument.visit((node => {
            const propertyNode = node as Parser.PropertyASTNode;
            if (propertyNode.key && propertyNode.key.value === key) {
                nodes.push({
                    startPosition: document.positionAt(node.parent.start),
                    endPosition: document.positionAt(node.parent.end),
                    key: propertyNode.key.value,
                    value: propertyNode.value.getValue()
                });
            }
            return true;
        }));

        return this.promise.resolve(nodes);
    }

    public getNodePropertyValues(document: TextDocument, yamlDocument: YAMLDocument, position: Position, propertyName: string): YamlNodePropertyValues {
        if(!document){
            return { values: null };
        }

        const offset: number = document.offsetAt(position);
        const jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if(jsonDocument === null){
            return { values: null };
        }

        // get the node by position and then walk up until we find an object node with properties
        let node = jsonDocument.getNodeFromOffset(offset);
        while (node !== null && !(node instanceof Parser.ObjectASTNode)) {
            node = node.parent;
        }

        if (!node) {
            return { values: null };
        }

        // see if this object has an inputs property
        const propertiesArray = (node as Parser.ObjectASTNode).properties.filter(p => p.key.value === propertyName);
        if (!propertiesArray || propertiesArray.length !== 1) {
            return { values: null };
        }

        // get the values contained within inputs
        let valueMap: {[key: string]: string} = {};
        const parameterValueArray = (propertiesArray[0].value as Parser.ObjectASTNode).properties;
        parameterValueArray && parameterValueArray.forEach(p => {
            valueMap[p.key.value] = p.value.getValue();
        });

        return {
            values: valueMap
        };
    }
}

