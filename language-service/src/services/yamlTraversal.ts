'use strict';

import * as Parser from "../parser/jsonParser";
import { YAMLDocument } from "../parser/yamlParser";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";
import { TextDocument, Position } from "vscode-languageserver-types";
import { YamlNodeInfo } from "../yamlLanguageService";

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
            if (propertyNode.key && propertyNode.key.value === key && propertyNode.value.start !== propertyNode.value.end) {
                nodes.push({
                    position: document.positionAt(node.start),
                    key: propertyNode.key.value,
                    value: propertyNode.value.getValue()
                });
            }
            return true;
        }));

        return this.promise.resolve(nodes);
    }

    public getNodeInputValues(document: TextDocument, yamlDocument: YAMLDocument, position: Position): {[key: string]: string} {
        if(!document){
            return null;
        }

        const offset: number = document.offsetAt(position);
        const jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if(jsonDocument === null){
            return null;
        }

        // get the node by position and then walk up until we find an object node with properties
        let node = jsonDocument.getNodeFromOffset(offset);
        while (node !== null && !(node instanceof Parser.ObjectASTNode)) {
            node = node.parent;
        }

        if (!node) {
            return null;
        }

        // see if this object has an inputs property
        const propertiesArray = (node as Parser.ObjectASTNode).properties.filter(p => p.key.value === "inputs");
        if (!propertiesArray || propertiesArray.length !== 1) {
            return null;
        }

        // get the values contained within inputs
        let valueMap: {[key: string]: string} = {};
        const parameterValueArray = (propertiesArray[0].value as Parser.ObjectASTNode).properties;
        parameterValueArray.forEach(p => {
            valueMap[p.key.value] = p.value.getValue();
        });

        return valueMap;
    }
}

