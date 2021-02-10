/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { ASTNode, BooleanASTNode, NullASTNode, ArrayASTNode, NumberASTNode, ObjectASTNode, PropertyASTNode, StringASTNode, JSONDocument, CompileTimeExpressionASTNode } from './jsonParser';

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import * as Yaml from 'yaml-ast-parser'
import { Schema, Type } from 'js-yaml';

import { getLineStartPositions, getPosition, ILineColumn } from '../utils/documentPositionCalculator'

export interface YAMLError {
	getMessage: () => string;
	start: number;
	end: number;
}

export class SingleYAMLDocument extends JSONDocument {
	private lines : number[];
	public root: ASTNode;
	public errors: YAMLError[];
	public warnings: YAMLError[];

	constructor(lines: number[]) {
		super(null, []);
		this.lines = lines;
		this.root = null;
		this.errors = [];
		this.warnings = [];
	}

	public getNodeFromOffset(offset: number): ASTNode {
		return this.getNodeFromOffsetEndInclusive(offset);
	}

	public getNodeByIndent = (lines: number[], offset: number, node: ASTNode): ASTNode => {

		const offsetPosition: ILineColumn = getPosition(offset, this.lines);

		function findNode(children: ASTNode[]): ASTNode {
			for (var idx: number = 0; idx < children.length; idx++) {
				const child: ASTNode = children[idx];

				const childPosition: ILineColumn = getPosition(child.start, lines);

				if (childPosition.column > offsetPosition.column) {
					return null;
				}

				const foundNode: ASTNode = findNode(child.getChildNodes());

				if (foundNode) {
					return foundNode;
				}

				// We have the right indentation, need to return based on line
				if (childPosition.line == offsetPosition.line) {
					return child;
				}
				if (childPosition.line > offsetPosition.line) {
					// Get previous
					(idx - 1) >= 0 ? children[idx - 1] : child;
				}
				// Else continue loop to try next element
			}

			// Special case, we found the correct
			return children[children.length - 1];
		}

		return findNode(node.getChildNodes()) || node;
	}
}


function recursivelyBuildAst(parent: ASTNode, node: Yaml.YAMLNode): ASTNode {

	if (!node) {
		return;
	}

	switch (node.kind) {
		case Yaml.Kind.MAP: {
			const instance = <Yaml.YamlMap>node;

			const result = new ObjectASTNode(parent, null, node.startPosition, node.endPosition);

			for (const mapping of instance.mappings) {
				result.addProperty(<PropertyASTNode>recursivelyBuildAst(result, mapping));
			}

			return result;
		}
		case Yaml.Kind.MAPPING: {
			const instance = <Yaml.YAMLMapping>node;
			const key = instance.key;

			// Technically, this is an arbitrary node in YAML
			// I doubt we would get a better string representation by parsing it
			const keyNode = new StringASTNode(null, null, true, key.startPosition, key.endPosition);
			keyNode.value = key.value;

			const result = key.value.startsWith("${{") ? new CompileTimeExpressionASTNode(parent, keyNode) : new PropertyASTNode(parent, keyNode);
			result.end = instance.endPosition;

			const valueNode = (instance.value) ? recursivelyBuildAst(result, instance.value) : new NullASTNode(parent, key.value, instance.endPosition, instance.endPosition);
			valueNode.location = key.value;

			result.setValue(valueNode);

			return result;
		}
		case Yaml.Kind.SEQ: {
			const instance = <Yaml.YAMLSequence>node;

			const result = new ArrayASTNode(parent, null, instance.startPosition, instance.endPosition);

			let count = 0;
			for (const item of instance.items) {
				if (item === null && count === instance.items.length - 1) {
					break;
				}

				// Be aware of https://github.com/nodeca/js-yaml/issues/321
				// Cannot simply work around it here because we need to know if we are in Flow or Block
				var itemNode = (item === null) ? new NullASTNode(parent, null, instance.endPosition, instance.endPosition) : recursivelyBuildAst(result, item);

				itemNode.location = count++;
				result.addItem(itemNode);
			}

			return result;
		}
		case Yaml.Kind.SCALAR: {
			const instance = <Yaml.YAMLScalar>node;
			const type = Yaml.determineScalarType(instance)

			// The name is set either by the sequence or the mapping case.
			const name = null;
			const value = instance.value;

			//This is a patch for redirecting values with these strings to be boolean nodes because its not supported in the parser.
			let possibleBooleanValues = ['y', 'Y', 'yes', 'Yes', 'YES', 'n', 'N', 'no', 'No', 'NO', 'on', 'On', 'ON', 'off', 'Off', 'OFF'];
			if (possibleBooleanValues.indexOf(value.toString()) !== -1) {
				return new BooleanASTNode(parent, name, value, node.startPosition, node.endPosition)
			}

			switch (type) {
				case Yaml.ScalarType.null: {
					return new StringASTNode(parent, name, false, instance.startPosition, instance.endPosition);
				}
				case Yaml.ScalarType.bool: {
					return new BooleanASTNode(parent, name, Yaml.parseYamlBoolean(value), node.startPosition, node.endPosition)
				}
				case Yaml.ScalarType.int: {
					const result = new NumberASTNode(parent, name, node.startPosition, node.endPosition);
					result.value = Yaml.parseYamlInteger(value);
					result.isInteger = true;
					return result;
				}
				case Yaml.ScalarType.float: {
					const result = new NumberASTNode(parent, name, node.startPosition, node.endPosition);
					result.value = Yaml.parseYamlFloat(value);
					result.isInteger = false;
					return result;
				}
				case Yaml.ScalarType.string: {
					const result = new StringASTNode(parent, name, false, node.startPosition, node.endPosition);
					result.value = node.value;
					return result;
				}
			}

			break;
		}
		case Yaml.Kind.ANCHOR_REF: {
			const instance = (<Yaml.YAMLAnchorReference>node).value

			return recursivelyBuildAst(parent, instance) ||
				new NullASTNode(parent, null, node.startPosition, node.endPosition);
		}
		case Yaml.Kind.INCLUDE_REF: {
			const result = new StringASTNode(parent, null, false, node.startPosition, node.endPosition);
			result.value = node.value;
			return result;
		}
	}
}

function convertError(e: Yaml.YAMLException): YAMLError {
	return { getMessage: () => e.reason, start: e.mark.position, end: e.mark.position + e.mark.column };
}

function createJSONDocument(yamlNode: Yaml.YAMLNode, startPositions: number[], text: string): SingleYAMLDocument {
	let _doc: SingleYAMLDocument = new SingleYAMLDocument(startPositions);
	_doc.root = recursivelyBuildAst(null, yamlNode);

	if (!_doc.root) {
		// TODO: When this is true, consider not pushing the other errors.
		_doc.errors.push({ getMessage: () => localize('Invalid symbol', 'Expected a YAML object, array or literal'), start: yamlNode.startPosition, end: yamlNode.endPosition } );
	}

	const duplicateKeyReason: string = 'duplicate key';

	//Patch ontop of yaml-ast-parser to disable duplicate key message on merge key
	let isDuplicateAndNotMergeKey = function (error: Yaml.YAMLException, yamlText: string) {
		let errorConverted: YAMLError = convertError(error);
		let errorStart: number = errorConverted.start;
		let errorEnd: number = errorConverted.end;
		if (error.reason === duplicateKeyReason && yamlText.substring(errorStart, errorEnd).startsWith("<<")) {
			return false;
		}
		return true;
	};
	const errors: YAMLError[] = yamlNode.errors.filter(e => e.reason !== duplicateKeyReason && !e.isWarning).map(e => convertError(e));
	const warnings: YAMLError[] = yamlNode.errors.filter(e => (e.reason === duplicateKeyReason && isDuplicateAndNotMergeKey(e, text)) || e.isWarning).map(e => convertError(e));

	errors.forEach(e => _doc.errors.push(e));
	warnings.forEach(e => _doc.warnings.push(e));

	return _doc;
}

export class YAMLDocument {
	public documents: SingleYAMLDocument[]
	public errors: YAMLError[];
	public warnings: YAMLError[];

	constructor(documents: SingleYAMLDocument[]) {
		this.documents = documents;
		this.errors = [];
		this.warnings = [];
	}

}

export function parse(text: string, customTags = []): YAMLDocument {

	const startPositions = getLineStartPositions(text)
	// This is documented to return a YAMLNode even though the
	// typing only returns a YAMLDocument
	const yamlDocs = []

	let schemaWithAdditionalTags = Schema.create(customTags.map((tag) => {
		const typeInfo = tag.split(' ');
		return new Type(typeInfo[0], { kind: typeInfo[1] || 'scalar' });
	}));

	//We need compiledTypeMap to be available from schemaWithAdditionalTags before we add the new custom properties
	customTags.map((tag) => {
		const typeInfo = tag.split(' ');
		schemaWithAdditionalTags.compiledTypeMap[typeInfo[0]] = new Type(typeInfo[0], { kind: typeInfo[1] || 'scalar' });
	});

	let additionalOptions: Yaml.LoadOptions = {
		schema: schemaWithAdditionalTags
	}

	Yaml.loadAll(text, doc => yamlDocs.push(doc), additionalOptions);

	return new YAMLDocument(yamlDocs.map(doc => createJSONDocument(doc, startPositions, text)));
}
