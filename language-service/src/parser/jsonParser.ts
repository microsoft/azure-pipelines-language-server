/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import Json = require('jsonc-parser');
import { JSONSchema } from '../jsonSchema';
import * as objects from '../utils/objects';
import { nodeHolder } from '../utils/yamlServiceUtils';

import * as nls from 'vscode-nls';
import { LanguageSettings } from '../yamlLanguageService';
const localize = nls.loadMessageBundle();

export interface IRange {
	start: number;
	end: number;
}

export enum ErrorCode {
	Undefined = 0,
	EnumValueMismatch = 1,
	CommentsNotAllowed = 2
}

export enum ProblemSeverity {
	Error, Warning, Hint
}

export interface IProblem {
	location: IRange;
	severity: ProblemSeverity;
	code?: ErrorCode;
	getMessage: () => string;
}

export class ASTNode {
	public start: number;
	public end: number;
	public type: string;
	public parent: ASTNode;
	public parserSettings: LanguageSettings;
	public location: Json.Segment;

	constructor(parent: ASTNode, type: string, location: Json.Segment, start: number, end?: number) {
		this.type = type;
		this.location = location;
		this.start = start;
		this.end = end;
		this.parent = parent;
		this.parserSettings = {
			isKubernetes: false
		};
	}

	public setParserSettings(parserSettings: LanguageSettings){
		this.parserSettings = parserSettings;
	}

	public getPath(): Json.JSONPath {
		let path = this.parent ? this.parent.getPath() : [];
		if (this.location !== null) {
			path.push(this.location);
		}
		return path;
	}

	public getChildNodes(): ASTNode[] {
		return [];
	}

	public getLastChild(): ASTNode {
		return null;
	}

	public getValue(): any {
		// override in children
		return;
	}

	public contains(offset: number, includeRightBound: boolean = false): boolean {
		return offset >= this.start && offset < this.end || includeRightBound && offset === this.end;
	}

	public toString(): string {
		return 'type: ' + this.type + ' (' + this.start + '/' + this.end + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
	}

	public visit(visitor: (node: ASTNode) => boolean): boolean {
		return visitor(this);
	}

	public getNodeFromOffset(offset: number): ASTNode {
		let findNode = (node: ASTNode): ASTNode => {
			if (offset >= node.start && offset < node.end) {
				let children = node.getChildNodes();
				for (let i = 0; i < children.length && children[i].start <= offset; i++) {
					let item = findNode(children[i]);
					if (item) {
						return item;
					}
				}
				return node;
			}
			return null;
		};
		return findNode(this);
	}

	public getNodeCollectorCount(): Number {
		let collector = [];
		let findNode = (node: ASTNode): ASTNode => {
			let children = node.getChildNodes();
			for (let i = 0; i < children.length; i++) {
				let item = findNode(children[i]);
				if (item && item.type === "property") {
					collector.push(item);
				}
			}
			return node;
		};
		return collector.length;
	}

	public getNodeFromOffsetEndInclusive(offset: number): ASTNode {
		let collector = [];
		let findNode = (node: ASTNode): ASTNode => {
			if (offset >= node.start && offset <= node.end) {
				let children = node.getChildNodes();
				for (let i = 0; i < children.length && children[i].start <= offset; i++) {
					let item = findNode(children[i]);
					if (item) {
						collector.push(item);
					}
				}
				return node;
			}
			return null;
		};
		const foundNode = findNode(this);
		let currMinDist = Number.MAX_VALUE;
		let currMinNode = null;
		for(let possibleNode in collector){
			const currNode = collector[possibleNode];
			const minDist = (currNode.end - offset) + (offset - currNode.start);
			if(minDist < currMinDist){
				currMinNode = currNode;
				currMinDist = minDist;
			}
		}
		return currMinNode || foundNode;
	}

	public static getIgnoreValueCase(schema: JSONSchema): boolean {
		return schema && (schema.ignoreCase === "value" || schema.ignoreCase === "all");
	}

	public static getIgnoreKeyCase(schema: JSONSchema): boolean {
		return schema && (schema.ignoreCase === "key" || schema.ignoreCase === "all");
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}

		if (Array.isArray(schema.type)) {
			if ((<string[]>schema.type).indexOf(this.type) === -1) {
				//allow numbers to be validated as strings
				let isValid: boolean = false;
				if (this.type === 'number') {
					isValid = (<string[]>schema.type).indexOf('string') >= 0;
				}
				if (!isValid) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => schema.errorMessage || localize('typeArrayMismatchWarning', 'Incorrect type. Expected one of {0}.', (<string[]>schema.type).join(', '))
					});
				}
			}
		}
		else if (schema.type) {
			if (this.type !== schema.type) {
				//count strings that look like numbers as strings
				if (this.type != "number" || schema.type != "string") {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => schema.errorMessage || localize('typeMismatchWarning', 'Incorrect type. Expected "{0}".', schema.type as string)
					});
				}
			}
		}
		if (Array.isArray(schema.allOf)) {
			schema.allOf.forEach((subSchema) => {
				this.validate(subSchema, validationResult, matchingSchemas);
			});
		}
		if (schema.not) {
			let subValidationResult = new ValidationResult();
			let subMatchingSchemas = matchingSchemas.newSub();
			this.validate(schema.not, subValidationResult, subMatchingSchemas);
			if (!subValidationResult.hasProblems()) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					getMessage: () => localize('notSchemaWarning', "Matches a schema that is not allowed.")
				});
			}
			subMatchingSchemas.schemas.forEach((ms) => {
				ms.inverted = !ms.inverted;
				matchingSchemas.add(ms);
			});
		}

		let testAlternatives = (alternatives: JSONSchema[], maxOneMatch: boolean) => {
			const matches: JSONSchema[] = [];

			const firstPropMatches: JSONSchema[] = this.getFirstPropertyMatches(alternatives);

			const possibleMatches: JSONSchema[] = (Array.isArray(firstPropMatches) && firstPropMatches.length > 0) ? firstPropMatches : alternatives;

			// remember the best match that is used for error messages
			let bestMatch: SchemaMatch = null;
			possibleMatches.forEach((subSchema) => {
				let subValidationResult = new ValidationResult();
				let subMatchingSchemas = matchingSchemas.newSub();

				this.validate(subSchema, subValidationResult, subMatchingSchemas);
				if (!subValidationResult.hasProblems()) {
					matches.push(subSchema);
				}
				if (!bestMatch) {
					bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
				} else if(this.parserSettings.isKubernetes) {
					bestMatch = alternativeComparison(subValidationResult, bestMatch, subSchema, subMatchingSchemas);
				} else {
					bestMatch = genericComparison(maxOneMatch, subValidationResult, bestMatch, subSchema, subMatchingSchemas);
				}
			});

			if (matches.length > 1 && maxOneMatch && !this.parserSettings.isKubernetes) {
				validationResult.addProblem({
					location: { start: this.start, end: this.start + 1 },
					severity: ProblemSeverity.Warning,
					getMessage: () => localize('oneOfWarning', "Matches multiple schemas when only one must validate.")
				});
			}

			if (bestMatch !== null) {
				validationResult.mergeSubResult(bestMatch.validationResult);
				validationResult.propertiesMatches += bestMatch.validationResult.propertiesMatches;
				validationResult.propertiesValueMatches += bestMatch.validationResult.propertiesValueMatches;
				matchingSchemas.merge(bestMatch.matchingSchemas);
			}
			return matches.length;
		};
		if (Array.isArray(schema.anyOf)) {
			testAlternatives(schema.anyOf, false);
		}
		if (Array.isArray(schema.oneOf)) {
			testAlternatives(schema.oneOf, true);
		}

		if (Array.isArray(schema.enum)) {
			let val = this.getValue();
			//force number values to strings for the comparison
			if (typeof val === "number") {
				val = val.toString();
			}
			let enumValueMatch: boolean = false;
			if (val) {
				const ignoreCase: boolean = ASTNode.getIgnoreValueCase(schema);
				for (const e of schema.enum) {
					if (objects.equals(val, e) ||
					   (ignoreCase && typeof e === "string" && typeof val === "string" && e.toUpperCase() === val.toUpperCase())) {
						enumValueMatch = true;
						break;
					}
				}
			}
			validationResult.enumValues = schema.enum;
			validationResult.enumValueMatch = enumValueMatch;
			if (!enumValueMatch) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					code: ErrorCode.EnumValueMismatch,
					getMessage: () => schema.errorMessage || localize('enumWarning', 'Value is not accepted. Valid values: {0}.', schema.enum.map(v => JSON.stringify(v)).join(', '))
				});
			}
		}

		if (schema.deprecationMessage && this.parent) {
			validationResult.addProblem({
				location: { start: this.parent.start, end: this.parent.end },
				severity: ProblemSeverity.Hint,
				getMessage: () => schema.deprecationMessage
			});
		}

		matchingSchemas.add({ node: this, schema: schema });
	}

	protected validateStringValue(schema: JSONSchema, value: string, validationResult: ValidationResult): void {
		if (schema.minLength && value.length < schema.minLength) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				getMessage: () => localize('minLengthWarning', 'String is shorter than the minimum length of {0}.', schema.minLength)
			});
		}

		if (schema.maxLength && value.length > schema.maxLength) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				getMessage: () => localize('maxLengthWarning', 'String is longer than the maximum length of {0}.', schema.maxLength)
			});
		}

		if (schema.pattern) {
			const flags: string = ASTNode.getIgnoreValueCase(schema) ? "i" : "";
			const regex: RegExp = new RegExp(schema.pattern, flags);
			if (!regex.test(value)) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					getMessage: () => schema.patternErrorMessage || schema.errorMessage || localize('patternWarning', 'String does not match the pattern of "{0}".', schema.pattern)
				});
			}
		}
	}

	protected getFirstPropertyMatches(subSchemas: JSONSchema[]): JSONSchema[] {
		return [];
	}
}

export class NullASTNode extends ASTNode {

	constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number) {
		super(parent, 'null', name, start, end);
	}

	public getValue(): any {
		return null;
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}

		//allow empty values to validate as strings
		if (schema.type === 'string') {
			this.validateStringValue(schema, '', validationResult);
		}
		else {
			super.validate(schema, validationResult, matchingSchemas);
		}
	}
}

export class BooleanASTNode extends ASTNode {

	private value: boolean | string;

	constructor(parent: ASTNode, name: Json.Segment, value: boolean | string, start: number, end?: number) {
		super(parent, 'boolean', name, start, end);
		this.value = value;
	}

	public getValue(): any {
		return this.value;
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}

		//allow empty values to validate as strings
		if (schema.type === 'string') {
			//The pipeline parser allows expressions that evaulate to booleans and right now
			//the generated schema is not prescise about that and allows any string.  The
			//values 'true' and 'false' get parsed into BooleanASTNode's but we need to
			//allow them to match against 'string' in the schema.
			this.validateStringValue(schema, '' + this.getValue(), validationResult);
		}
		else {
			super.validate(schema, validationResult, matchingSchemas);
		}
	}

}

export class ArrayASTNode extends ASTNode {

	public items: ASTNode[];

	constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number) {
		super(parent, 'array', name, start, end);
		this.items = [];
	}

	public getChildNodes(): ASTNode[] {
		return this.items;
	}

	public getLastChild(): ASTNode {
		return this.items[this.items.length - 1];
	}

	public getValue(): any {
		return this.items.map((v) => v.getValue());
	}

	public addItem(item: ASTNode): boolean {
		if (item) {
			this.items.push(item);
			return true;
		}
		return false;
	}

	public visit(visitor: (node: ASTNode) => boolean): boolean {
		let ctn = visitor(this);
		for (let i = 0; i < this.items.length && ctn; i++) {
			ctn = this.items[i].visit(visitor);
		}
		return ctn;
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}
		super.validate(schema, validationResult, matchingSchemas);

		if (Array.isArray(schema.items)) {
			let subSchemas = <JSONSchema[]>schema.items;
			subSchemas.forEach((subSchema, index) => {
				let itemValidationResult = new ValidationResult();
				let item = this.items[index];
				if (item) {
					item.validate(subSchema, itemValidationResult, matchingSchemas);
					validationResult.mergePropertyMatch(itemValidationResult);
				} else if (this.items.length >= subSchemas.length) {
					validationResult.propertiesValueMatches++;
				}
			});
			if (this.items.length > subSchemas.length) {
				if (typeof schema.additionalItems === 'object') {
					for (let i = subSchemas.length; i < this.items.length; i++) {
						let itemValidationResult = new ValidationResult();
						this.items[i].validate(<any>schema.additionalItems, itemValidationResult, matchingSchemas);
						validationResult.mergePropertyMatch(itemValidationResult);
					}
				} else if (schema.additionalItems === false) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('additionalItemsWarning', 'Array has too many items according to schema. Expected {0} or fewer.', subSchemas.length)
					});
				}
			}
		} else if (schema.items) {
			for (let item of this.items) {
				let itemValidationResult = new ValidationResult();
				item.validate(<JSONSchema>schema.items, itemValidationResult, matchingSchemas);
				validationResult.mergePropertyMatch(itemValidationResult);
			}
		}

		if (schema.minItems && this.items.length < schema.minItems) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				getMessage: () => localize('minItemsWarning', 'Array has too few items. Expected {0} or more.', schema.minItems)
			});
		}

		if (schema.maxItems && this.items.length > schema.maxItems) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				getMessage: () => localize('maxItemsWarning', 'Array has too many items. Expected {0} or fewer.', schema.maxItems)
			});
		}

		if (schema.uniqueItems === true) {
			let values = this.items.map((node) => {
				return node.getValue();
			});
			let duplicates = values.some((value, index) => {
				return index !== values.lastIndexOf(value);
			});
			if (duplicates) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					getMessage: () => localize('uniqueItemsWarning', 'Array has duplicate items.')
				});
			}
		}
	}
}

export class NumberASTNode extends ASTNode {

	public isInteger: boolean;
	public value: number;

	constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number) {
		super(parent, 'number', name, start, end);
		this.isInteger = true;
		this.value = Number.NaN;
	}

	public getValue(): any {
		return this.value;
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}

		if (schema.type === 'string') {
			//In YAML, a value like 123 could be a number but it could also be a string.  It initially gets
			//parsed into a NumberASTNode, but we should also check it against string schema.
			this.validateStringValue(schema, '' + this.getValue(), validationResult);
		}
		else {
			// work around type validation in the base class
			let typeIsInteger = false;
			if (schema.type === 'integer' || (Array.isArray(schema.type) && (<string[]>schema.type).indexOf('integer') !== -1)) {
				typeIsInteger = true;
			}
			if (typeIsInteger && this.isInteger === true) {
				this.type = 'integer';
			}
			super.validate(schema, validationResult, matchingSchemas);
			this.type = 'number';

			const val = this.getValue();

			if (typeof schema.multipleOf === 'number') {
				if (val % schema.multipleOf !== 0) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('multipleOfWarning', 'Value is not divisible by {0}.', schema.multipleOf)
					});
				}
			}

			if (typeof schema.minimum === 'number') {
				if (schema.exclusiveMinimum && val <= schema.minimum) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('exclusiveMinimumWarning', 'Value is below the exclusive minimum of {0}.', schema.minimum)
					});
				}
				if (!schema.exclusiveMinimum && val < schema.minimum) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('minimumWarning', 'Value is below the minimum of {0}.', schema.minimum)
					});
				}
			}

			if (typeof schema.maximum === 'number') {
				if (schema.exclusiveMaximum && val >= schema.maximum) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('exclusiveMaximumWarning', 'Value is above the exclusive maximum of {0}.', schema.maximum)
					});
				}
				if (!schema.exclusiveMaximum && val > schema.maximum) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('maximumWarning', 'Value is above the maximum of {0}.', schema.maximum)
					});
				}
			}
		}
	}
}

export class StringASTNode extends ASTNode {
	public isKey: boolean;
	public value: string;

	constructor(parent: ASTNode, name: Json.Segment, isKey: boolean, start: number, end?: number) {
		super(parent, 'string', name, start, end);
		this.isKey = isKey;
		this.value = '';
	}

	public getValue(): any {
		return this.value;
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}
		super.validate(schema, validationResult, matchingSchemas);

		this.validateStringValue(schema, this.value, validationResult);
	}
}

export class PropertyASTNode extends ASTNode {
	public key: StringASTNode;
	public value: ASTNode;
	public colonOffset: number;

	constructor(parent: ASTNode, key: StringASTNode) {
		super(parent, 'property', null, key.start);
		this.key = key;
		key.parent = this;
		key.location = key.value;
		this.colonOffset = -1;
	}

	public getChildNodes(): ASTNode[] {
		return this.value ? [this.key, this.value] : [this.key];
	}

	public getLastChild(): ASTNode {
		return this.value;
	}

	public setValue(value: ASTNode): boolean {
		this.value = value;
		return value !== null;
	}

	public visit(visitor: (node: ASTNode) => boolean): boolean {
		return visitor(this) && this.key.visit(visitor) && this.value && this.value.visit(visitor);
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}
		if (this.value) {
			this.value.validate(schema, validationResult, matchingSchemas);
		}
	}
}

interface ASTNodeMap
{
	[key: string]: ASTNode
}

export class ObjectASTNode extends ASTNode {
	public properties: PropertyASTNode[];

	constructor(parent: ASTNode, name: Json.Segment, start: number, end?: number) {
		super(parent, 'object', name, start, end);

		this.properties = [];
	}

	public getChildNodes(): ASTNode[] {
		return this.properties;
	}

	public getLastChild(): ASTNode {
		return this.properties[this.properties.length - 1];
	}

	public addProperty(node: PropertyASTNode): boolean {
		if (!node) {
			return false;
		}
		this.properties.push(node);
		return true;
	}

	public getFirstProperty(): PropertyASTNode | undefined {
		if (this.properties.length === 0) {
			return undefined;
		}

		let firstProperty = this.properties[0];
		while (firstProperty instanceof CompileTimeExpressionASTNode) {
			// TODO: Do we need to check to see if properties actually has anything?
			if (firstProperty.value instanceof ObjectASTNode) {
				firstProperty = firstProperty.value.properties[0];
			} else if (firstProperty.value instanceof ArrayASTNode) {
				firstProperty = (firstProperty.value.items[0] as ObjectASTNode).properties[0];
			} else {
				// Unknown case - bail
				return undefined;
			}
		}
		return firstProperty;
	}

	public getValue(): any {
		let value: any = Object.create(null);
		this.properties.forEach((p) => {
			let v = p.value && p.value.getValue();
			if (typeof v !== 'undefined') {
				value[p.key.getValue()] = v;
			}
		});
		return value;
	}

	public visit(visitor: (node: ASTNode) => boolean): boolean {
		let ctn = visitor(this);
		for (let i = 0; i < this.properties.length && ctn; i++) {
			ctn = this.properties[i].visit(visitor);
		}
		return ctn;
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!matchingSchemas.include(this)) {
			return;
		}

		super.validate(schema, validationResult, matchingSchemas);
		let seenKeys: ASTNodeMap = Object.create(null);
		let unprocessedProperties: string[] = [];
		let hasSpecialArrayKey = false;
		this.properties.forEach(node => {
			const key: string = node.key.value;

			// Replace the merge key with the actual values of what the node value points to in seen keys
			// Same thing with CTEs
			if(key === "<<" || node instanceof CompileTimeExpressionASTNode) {
				// Validate the CTE independently
				if (node instanceof CompileTimeExpressionASTNode) {
					node.validate(schema, validationResult, matchingSchemas);
				}

				switch(node.value.type) {
					case "object": {
						node.value["properties"].forEach(propASTNode => {
							const propKey = propASTNode.key.value;
							seenKeys[propKey] = propASTNode.value;
							unprocessedProperties.push(propKey);
						});
						break;
					}
					case "array": {
						// Ignore this property and hoist everything under it as children of the parent array
						node.value["items"].forEach(sequenceNode => {
							(this.parent as ArrayASTNode).items.push(sequenceNode);
						});
						hasSpecialArrayKey = true;
						break;
					}
					default: {
						break;
					}
				}
			} else {
				seenKeys[key] = node.value;
				unprocessedProperties.push(key);
			}
		});

		if (hasSpecialArrayKey) {
			if (this.properties.length > 1) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Error,
					getMessage: () => localize('MultipleSpecialKeysError', 'Expected at most one merge key or compile-time expression, found {0}.', this.properties.length)
				});
			}
			return;
		}

		const findMatchingProperties = (propertyKey: string): ASTNodeMap => {
			let result: ASTNodeMap = Object.create(null);
			const compareKey: string = propertyKey.toUpperCase();

			Object.keys(seenKeys).forEach((propertyName: string) => {
				if (propertyName.toUpperCase() === compareKey) {
					result[propertyName] = seenKeys[propertyName];
				}
			});

			return result;
		}

		const hasProperty = (propertyKey: string): boolean => {
			if (seenKeys[propertyKey]) {
				return true;
			}

			if (schema.properties) {
				const propSchema: JSONSchema = schema.properties[propertyKey];

				if (propSchema) {
					const ignoreKeyCase: boolean = ASTNode.getIgnoreKeyCase(propSchema);

					if (ignoreKeyCase) {
						const matchedKeys: ASTNodeMap = findMatchingProperties(propertyKey);
						if (Object.keys(matchedKeys).length > 0) {
							return true;
						}
					}

					if (Array.isArray(propSchema.aliases)) {
						return propSchema.aliases.some((aliasName: string): boolean => {
							if (seenKeys[aliasName]) {
								return true;
							}

							if (ignoreKeyCase) {
								const matchedKeys: ASTNodeMap = findMatchingProperties(aliasName);
								return Object.keys(matchedKeys).length > 0;
							}

							return false;
						});
					}
				}
			}

			return false;
		}

		if (Array.isArray(schema.required)) {
			schema.required.forEach((propertyName: string) => {
				if (!hasProperty(propertyName)) {
					const key = this.parent && (<PropertyASTNode>this.parent).key;
					const location = key ? { start: key.start, end: key.end } : { start: this.start, end: this.start + 1 };
					validationResult.addProblem({
						location: location,
						severity: ProblemSeverity.Warning,
						getMessage: () => localize('MissingRequiredPropWarning', 'Missing property "{0}".', propertyName)
					});
				}
			});
		}

		const propertyProcessed = (prop: string): void => {
			let index = unprocessedProperties.indexOf(prop);
			while (index >= 0) {
				unprocessedProperties.splice(index, 1);
				index = unprocessedProperties.indexOf(prop);
			}
		};

		if (schema.properties) {
			Object.keys(schema.properties).forEach((schemaPropertyName: string) => {
				const propSchema: JSONSchema = schema.properties[schemaPropertyName];

				let children: ASTNodeMap = {};
				const ignoreKeyCase: boolean = ASTNode.getIgnoreKeyCase(propSchema);

				if (ignoreKeyCase) {
					children = findMatchingProperties(schemaPropertyName);
				}
				else if (seenKeys[schemaPropertyName]) {
					children[schemaPropertyName] = seenKeys[schemaPropertyName];
				}

				if (Array.isArray(propSchema.aliases)) {
					propSchema.aliases.forEach((aliasName: string): void => {
						if (ignoreKeyCase) {
							Object.assign(children, findMatchingProperties(aliasName));
						}
						else if (seenKeys[aliasName]) {
							children[aliasName] = seenKeys[aliasName];
						}
					});
				}

				let child: ASTNode = null;
				const numChildren: number = Object.keys(children).length;
				const generateErrors: boolean = numChildren > 1;

				Object.keys(children).forEach((childKey:string): void => {
					propertyProcessed(childKey);

					if (generateErrors) {
						const childProperty: PropertyASTNode = <PropertyASTNode>(children[childKey].parent);
						validationResult.addProblem({
							location: {start: childProperty.key.start, end: childProperty.key.end},
							severity: ProblemSeverity.Error,
							getMessage: () => localize('DuplicatePropError', 'Multiple properties found matching {0}', schemaPropertyName)
						})
					}
					else {
						child = children[childKey];
					}
				});

				if (child) {
					let propertyValidationResult = new ValidationResult();
					child.validate(propSchema, propertyValidationResult, matchingSchemas);
					validationResult.mergePropertyMatch(propertyValidationResult);
				}
			});
		}

		if (schema.patternProperties) {
			Object.keys(schema.patternProperties).forEach((propertyPattern: string) => {
				const ignoreKeyCase: boolean = ASTNode.getIgnoreKeyCase(schema.patternProperties[propertyPattern]);
				const regex = new RegExp(propertyPattern, ignoreKeyCase ? "i" : "");
				unprocessedProperties.slice(0).forEach((propertyName: string) => {
					if (regex.test(propertyName)) {
						propertyProcessed(propertyName);
						const child = seenKeys[propertyName];
						if (child) {
							let propertyValidationResult = new ValidationResult();
							const childSchema: JSONSchema = schema.patternProperties[propertyPattern];
							child.validate(childSchema, propertyValidationResult, matchingSchemas);
							validationResult.mergePropertyMatch(propertyValidationResult);
						}
					}
				});
			});
		}

		if (typeof schema.additionalProperties === 'object') {
			unprocessedProperties.forEach((propertyName: string) => {
				const child = seenKeys[propertyName];
				if (child) {
					let propertyValidationResult = new ValidationResult();
					child.validate(<any>schema.additionalProperties, propertyValidationResult, matchingSchemas);
					validationResult.mergePropertyMatch(propertyValidationResult);
				}
			});
		} else if (schema.additionalProperties === false) {
			if (unprocessedProperties.length > 0) {
				unprocessedProperties.forEach((propertyName: string) => {
					//Auto-complete can insert a "holder" node when parsing, do not count it as an error
					//against additionalProperties
					if (propertyName !== nodeHolder) {
						const child: ASTNode = seenKeys[propertyName];
						if (child) {
							let errorLocation: IRange = null;
							let errorNode: ASTNode = child;

							if (errorNode.type !== "property" && errorNode.parent) {
								if (errorNode.parent.type === "property") {
									//This works for StringASTNode
									errorNode = errorNode.parent;
								} else if (errorNode.parent.type === "object") {
									//The tree structure and parent links can be weird
									//NullASTNode's parent will be the object and not the property
									const parentObject: ObjectASTNode = <ObjectASTNode>errorNode.parent;
									parentObject.properties.some((propNode: PropertyASTNode) => {
										if (propNode.value == child) {
											errorNode = propNode;
											return true;
										}
										return false;
									});
								}
							}

							if (errorNode.type === "property") {
								const propertyNode: PropertyASTNode = <PropertyASTNode>errorNode;
								errorLocation = {
									start: propertyNode.key.start,
									end: propertyNode.key.end
								};
							} else {
								errorLocation = {
									start: errorNode.start,
									end: errorNode.end
								};
							}

							validationResult.addProblem({
								location: errorLocation,
								severity: ProblemSeverity.Warning,
								getMessage: () => schema.errorMessage || localize('DisallowedExtraPropWarning', 'Unexpected property {0}', propertyName)
							});
						}
					}
				});
			}
		}

		if (schema.maxProperties) {
			if (this.properties.length > schema.maxProperties) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					getMessage: () => localize('MaxPropWarning', 'Object has more properties than limit of {0}.', schema.maxProperties)
				});
			}
		}

		if (schema.minProperties) {
			if (this.properties.length < schema.minProperties) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					getMessage: () => localize('MinPropWarning', 'Object has fewer properties than the required number of {0}', schema.minProperties)
				});
			}
		}

		if (schema.dependencies) {
			Object.keys(schema.dependencies).forEach((key: string) => {
				if (hasProperty(key)) {
					const propertyDep = schema.dependencies[key]
					if (Array.isArray(propertyDep)) {
						propertyDep.forEach((requiredProp: string) => {
							if (!hasProperty(requiredProp)) {
								validationResult.addProblem({
									location: { start: this.start, end: this.end },
									severity: ProblemSeverity.Warning,
									getMessage: () => localize('RequiredDependentPropWarning', 'Object is missing property {0} required by property {1}.', requiredProp, key)
								});
							} else {
								validationResult.propertiesValueMatches++;
							}
						});
					} else if (propertyDep) {
						let propertyvalidationResult = new ValidationResult();
						this.validate(propertyDep, propertyvalidationResult, matchingSchemas);
						validationResult.mergePropertyMatch(propertyvalidationResult);
					}
				}
			});
		}

		if (schema.firstProperty?.length) {
			const firstProperty = this.getFirstProperty();
			if (firstProperty?.key?.value) {
				let firstPropKey: string = firstProperty.key.value;

				if (!schema.firstProperty.some((listProperty: string) => {
					if (listProperty === firstPropKey) {
						return true;
					}

					if (schema.properties) {
						const propertySchema: JSONSchema = schema.properties[listProperty];
						if (propertySchema) {
							const ignoreCase: boolean = ASTNode.getIgnoreKeyCase(propertySchema);
							if (ignoreCase && listProperty.toUpperCase() === firstPropKey.toUpperCase()) {
								return true;
							}

							if (Array.isArray(propertySchema.aliases)) {
								return propertySchema.aliases.some((aliasName: string): boolean => {
									if (aliasName === firstPropKey) {
										return true;
									}

									return ignoreCase && aliasName.toUpperCase() === firstPropKey.toUpperCase();
								});
							}
						}
					}

					return false;
				})) {
					if (schema.firstProperty.length == 1) {
						validationResult.addProblem({
							location: { start: firstProperty.start, end: firstProperty.end },
							severity: ProblemSeverity.Error,
							getMessage: () => localize('firstPropertyError', "The first property must be {0}", schema.firstProperty[0])
						});
					}
					else {
						validationResult.addProblem({
							location: { start: firstProperty.start, end: firstProperty.end },
							severity: ProblemSeverity.Error,
							getMessage: () => {
								const separator: string = localize('listSeparator', ", ");
								return localize('firstPropertyErrorList', "The first property must be one of: {0}", schema.firstProperty.join(separator));
							}
						});
					}
				}
			}
		}
	}

	protected getFirstPropertyMatches(subSchemas: JSONSchema[]): JSONSchema[] {
		const firstProperty = this.getFirstProperty();
		if (!(firstProperty?.key?.value)) {
			return [];
		}

		const firstPropKey: string = firstProperty.key.value;

		const matches: JSONSchema[] = [];

		subSchemas.forEach((schema:JSONSchema) => {
			if (schema.firstProperty && schema.firstProperty.length) {
				let firstPropSchemaName: string = null;
				if (schema.firstProperty.indexOf(firstPropKey) >= 0) {
					firstPropSchemaName = firstPropKey;
				}
				else if (ASTNode.getIgnoreKeyCase(schema)) {
					const firstPropCompareKey: string = firstPropKey.toUpperCase();

					schema.firstProperty.some( (schemaProp: string) => {
						if (schemaProp.toUpperCase() === firstPropCompareKey) {
							firstPropSchemaName = schemaProp;
							return true;
						}
						return false;
					});
				}

				if (firstPropSchemaName != null) {
					if (!schema.properties) {
						matches.push(schema);
					}
					else {
						const propertySchema: JSONSchema = schema.properties[firstPropSchemaName];
						if (!propertySchema) {
							matches.push(schema);
						}
						else {
							let propertyValidationResult = new ValidationResult();
							firstProperty.validate(propertySchema, propertyValidationResult, new SchemaCollector(-1, null));
							if (!propertyValidationResult.hasProblems()) {
								matches.push(schema);
							}
						}
					}
				}
			}
		});

		return matches;
	}
}

export class CompileTimeExpressionASTNode extends PropertyASTNode {
	constructor(parent: ASTNode, key: StringASTNode) {
		super(parent, key);
		this.type = "cte";
	}

	public validate(schema: JSONSchema, validationResult: ValidationResult, matchingSchemas: ISchemaCollector): void {
		if (!this.key.value.endsWith("}}")) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Error,
				getMessage: () => localize('cteInvalidEndingError', "Compile-time expressions must end in }}")
			});
			return;
		}

		// Slice the beginning ${{ and ending }}
		const expression = this.key.value.slice(3, -2).trim();
		if (!expression.length) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Error,
				getMessage: () => localize('cteNoExpressionError', "Compile-time expressions must contain an expression")
			});
			return;
		}

		// TODO: Locations from here on out can be improved
		const keyword = /^(if|each)\b/.exec(expression)?.[1];
		if (keyword === undefined) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Error,
				getMessage: () => localize('cteNoKeywordError', "Compile-time expressions must begin with an 'if' or 'each' keyword")
			});
			return;
		}

		const condition = expression.substring(expression.indexOf(keyword) + keyword.length).trim();
		if (!condition.length) {
			validationResult.addProblem({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Error,
				getMessage: () => localize('cteNoConditionError', "Missing condition after {0}", keyword)
			});
			return;
		}

		if (keyword === "each") {
			const conditionParts = condition.split(" ");
			if (conditionParts.length !== 3) {
				validationResult.addProblem({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Error,
					getMessage: () => localize('cteMalformedEachError', "Each condition must be in the format '<value> in <array>'")
				});
			} else {
				if (!/^[a-z_][\w_]*$/i.test(conditionParts?.[0])) {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Error,
						getMessage: () => localize('cteMissingVariableError', "Each condition must start with a variable")
					});
				}

				if (conditionParts?.[1] !== "in") {
					validationResult.addProblem({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Error,
						getMessage: () => localize('cteMissingInError', "Each condition is missing the 'in' keyword")
					});
				}

				// TODO: Validation for the third part
			}
		} else {
			// TODO: Validation for if
		}
	}
}

export interface IApplicableSchema {
	node: ASTNode;
	inverted?: boolean;
	schema: JSONSchema;
}

export enum EnumMatch {
	Key, Enum
}

export interface ISchemaCollector {
	schemas: IApplicableSchema[];
	add(schema: IApplicableSchema): void;
	merge(other: ISchemaCollector): void;
	include(node: ASTNode): boolean;
	newSub(): ISchemaCollector;
}

interface SchemaMatch {
	schema: JSONSchema;
	validationResult: ValidationResult;
	matchingSchemas: ISchemaCollector;
}

class SchemaCollector implements ISchemaCollector {
	schemas: IApplicableSchema[] = [];
	constructor(private focusOffset = -1, private exclude: ASTNode = null) {
	}
	add(schema: IApplicableSchema): void {
		this.schemas.push(schema);
	}
	merge(other: ISchemaCollector): void {
		this.schemas.push(...other.schemas);
	}
	include(node: ASTNode): boolean {
		return (this.focusOffset === -1 || node.contains(this.focusOffset)) && (node !== this.exclude);
	}
	newSub(): ISchemaCollector {
		return new SchemaCollector(-1, this.exclude);
	}
}

class NoOpSchemaCollector implements ISchemaCollector {
	get schemas(): IApplicableSchema[] { return []; }
	add(schema: IApplicableSchema): void { }
	merge(other: ISchemaCollector): void { }
	include(node: ASTNode): boolean { return true; }
	newSub(): ISchemaCollector { return this; }
}

export class ValidationResult {
	public problems: IProblem[];
	public problemDepths: number[];  //count of problems found at each level of the parse tree.  problemDepths[0] is the root, problemDepths[1] is one level down, etc.

	public propertiesMatches: number;
	public propertiesValueMatches: number;
	public primaryValueMatches: number;
	public enumValueMatch: boolean;
	public enumValues: any[];

	constructor() {
		this.problems = [];
		this.problemDepths = [0];
		this.propertiesMatches = 0;
		this.propertiesValueMatches = 0;
		this.primaryValueMatches = 0;
		this.enumValueMatch = false;
		this.enumValues = null;
	}

	public hasProblems(): boolean {
		return !!this.problems.length;
	}

	public addProblem(problem: IProblem): void {
		this.problems.push(problem);
		this.problemDepths[0]++;
	}

	public mergeSubResult(validationResult: ValidationResult): void {
		this.problems = this.problems.concat(validationResult.problems);

		//overlay the problem count array one level down

		//first make sure the array is long enough
		const subDepth: number = validationResult.problemDepths.length;
		while (this.problemDepths.length <= subDepth) {
			this.problemDepths.push(0);
		}

		//then add the problem counts shifted lower in the parse tree
		validationResult.problemDepths.forEach((problemCount: number, depth: number) => {
			this.problemDepths[depth + 1] += problemCount;
		});
	}

	public mergeEnumValues(validationResult: ValidationResult): void {
		if (!this.enumValueMatch && !validationResult.enumValueMatch && this.enumValues && validationResult.enumValues) {
			this.enumValues = this.enumValues.concat(validationResult.enumValues);
			for (let error of this.problems) {
				if (error.code === ErrorCode.EnumValueMismatch) {
					error.getMessage = () => localize('enumWarning', 'Value is not accepted. Valid values: {0}.', this.enumValues.map(v => JSON.stringify(v)).join(', '));
				}
			}
		}
	}

	public mergePropertyMatch(propertyValidationResult: ValidationResult): void {
		this.mergeSubResult(propertyValidationResult);
		this.propertiesMatches++;
		if (propertyValidationResult.enumValueMatch || !this.hasProblems() && propertyValidationResult.propertiesMatches) {
			this.propertiesValueMatches++;
		}
		if (propertyValidationResult.enumValueMatch && propertyValidationResult.enumValues && propertyValidationResult.enumValues.length === 1) {
			this.primaryValueMatches++;
		}
	}

	public compareGeneric(other: ValidationResult): number {
		let hasProblems = this.hasProblems();
		if (hasProblems !== other.hasProblems()) {
			return hasProblems ? -1 : 1;
		}
		if (hasProblems) {
			const depthOfFirstProblem: number = this.problemDepths.findIndex((value: number, index: number) => value > 0);
			const depthOfOtherFirstProblem: number = other.problemDepths.findIndex((value: number, index: number) => value > 0);
			if (depthOfFirstProblem != depthOfOtherFirstProblem) {
				return depthOfFirstProblem - depthOfOtherFirstProblem;
			}
		}
		if (this.enumValueMatch !== other.enumValueMatch) {
			return other.enumValueMatch ? -1 : 1;
		}
		if (this.propertiesValueMatches !== other.propertiesValueMatches) {
			return this.propertiesValueMatches - other.propertiesValueMatches;
		}
		if (this.primaryValueMatches !== other.primaryValueMatches) {
			return this.primaryValueMatches - other.primaryValueMatches;
		}
		return this.propertiesMatches - other.propertiesMatches;
	}

	public compareKubernetes(other: ValidationResult): number {
		let hasProblems = this.hasProblems();
		if(this.propertiesMatches !== other.propertiesMatches){
			return this.propertiesMatches - other.propertiesMatches;
		}
		if (this.enumValueMatch !== other.enumValueMatch) {
			return other.enumValueMatch ? -1 : 1;
		}
		if (this.primaryValueMatches !== other.primaryValueMatches) {
			return this.primaryValueMatches - other.primaryValueMatches;
		}
		if (this.propertiesValueMatches !== other.propertiesValueMatches) {
			return this.propertiesValueMatches - other.propertiesValueMatches;
		}
		if (hasProblems !== other.hasProblems()) {
			return hasProblems ? -1 : 1;
		}
		return this.propertiesMatches - other.propertiesMatches;
	}
}

export class JSONDocument {

	constructor(public readonly root: ASTNode, public readonly syntaxErrors: IProblem[]) {
	}

	public getNodeFromOffset(offset: number): ASTNode {
		return this.root && this.root.getNodeFromOffset(offset);
	}

	public getNodeFromOffsetEndInclusive(offset: number): ASTNode {
		return this.root && this.root.getNodeFromOffsetEndInclusive(offset);
	}

	public visit(visitor: (node: ASTNode) => boolean): void {
		if (this.root) {
			this.root.visit(visitor);
		}
	}

	public configureSettings(parserSettings: LanguageSettings){
		if(this.root) {
			this.root.setParserSettings(parserSettings);
		}
	}

	public validate(schema: JSONSchema): IProblem[] {
		if (this.root && schema) {
			let validationResult = new ValidationResult();
			this.root.validate(schema, validationResult, new NoOpSchemaCollector());
			return validationResult.problems;
		}
		return null;
	}

	public getMatchingSchemas(schema: JSONSchema, focusOffset: number = -1, exclude: ASTNode = null): IApplicableSchema[] {
		let matchingSchemas = new SchemaCollector(focusOffset, exclude);
		let validationResult = new ValidationResult();
		if (this.root && schema) {
			this.root.validate(schema, validationResult, matchingSchemas);
		}
		return matchingSchemas.schemas;
	}

	public getValidationProblems(schema: JSONSchema, focusOffset: number = -1, exclude: ASTNode = null): IProblem[] {
		let matchingSchemas = new SchemaCollector(focusOffset, exclude);
		let validationResult = new ValidationResult();
		if (this.root && schema) {
			this.root.validate(schema, validationResult, matchingSchemas);
		}
		return validationResult.problems;
	}
}

//Alternative comparison is specifically used by the kubernetes/openshift schema but may lead to better results then genericComparison depending on the schema
function alternativeComparison(subValidationResult: ValidationResult, bestMatch: SchemaMatch, subSchema: JSONSchema, subMatchingSchemas: ISchemaCollector): SchemaMatch {
	let compareResult = subValidationResult.compareKubernetes(bestMatch.validationResult);
	if (compareResult > 0) {
		// our node is the best matching so far
		bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
	} else if (compareResult === 0) {
		// there's already a best matching but we are as good
		bestMatch.matchingSchemas.merge(subMatchingSchemas);
		bestMatch.validationResult.mergeEnumValues(subValidationResult);
	}
	return bestMatch;
}

//genericComparison tries to find the best matching schema using a generic comparison
function genericComparison(maxOneMatch: boolean, subValidationResult: ValidationResult, bestMatch: SchemaMatch, subSchema: JSONSchema, subMatchingSchemas: ISchemaCollector): SchemaMatch {
	if (!maxOneMatch && !subValidationResult.hasProblems() && !bestMatch.validationResult.hasProblems()) {
		// no errors, both are equally good matches
		bestMatch.matchingSchemas.merge(subMatchingSchemas);
		bestMatch.validationResult.propertiesMatches += subValidationResult.propertiesMatches;
		bestMatch.validationResult.propertiesValueMatches += subValidationResult.propertiesValueMatches;
	} else {
		let compareResult = subValidationResult.compareGeneric(bestMatch.validationResult);
		if (compareResult > 0) {
			// our node is the best matching so far
			bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
		} else if (compareResult === 0) {
			// there's already a best matching but we are as good
			bestMatch.matchingSchemas.merge(subMatchingSchemas);
			bestMatch.validationResult.mergeEnumValues(subValidationResult);
		}
	}
	return bestMatch;
}
