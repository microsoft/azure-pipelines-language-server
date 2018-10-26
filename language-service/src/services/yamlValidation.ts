/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { JSONSchemaService } from './jsonSchemaService';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { PromiseConstructor, Thenable, LanguageSettings} from '../yamlLanguageService';

export class YAMLValidation {
	
	private jsonSchemaService: JSONSchemaService;
	private promise: PromiseConstructor;
	private validationEnabled: boolean;

	public constructor(jsonSchemaService, promiseConstructor) {
		this.jsonSchemaService = jsonSchemaService;
		this.promise = promiseConstructor;
		this.validationEnabled = true;
	}

	public configure(shouldValidate: LanguageSettings){
		if(shouldValidate){
			this.validationEnabled = shouldValidate.validate;
		}
	}
	
	public doValidation(textDocument, yamlDocument): Thenable<Diagnostic[]> {

		if(!this.validationEnabled){
			return this.promise.resolve([]);
		}

		return this.jsonSchemaService.getSchemaForResource(textDocument.uri).then(function (schema) {
			var diagnostics: Diagnostic[] = [];
			var added: {[key:string]: boolean} = {};

			if (schema) {
				
				for(let currentYAMLDoc in yamlDocument.documents){
					let currentDoc = yamlDocument.documents[currentYAMLDoc];
					let diagnostics = currentDoc.getValidationProblems(schema.schema);
					for(let diag in diagnostics){
						let curDiagnostic = diagnostics[diag];
						currentDoc.errors.push({ location: { start: curDiagnostic.location.start, end: curDiagnostic.location.end }, message: curDiagnostic.message })
					}
				}

			}
			if(schema && schema.errors.length > 0){
				
				for(let curDiagnostic of schema.errors){
					diagnostics.push({
						severity: DiagnosticSeverity.Error,
						range: {
							start: {
								line: 0,
								character: 0
							},
							end: {
								line: 0,
								character: 1
							}
						},
						message: curDiagnostic
					});
				}

			}
			for(let currentYAMLDoc in yamlDocument.documents){
				let currentDoc = yamlDocument.documents[currentYAMLDoc];
				currentDoc.errors.concat(currentDoc.warnings).forEach(function (error, idx) {
					// remove duplicated messages
					var signature = error.location.start + ' ' + error.location.end + ' ' + error.message;
					if (!added[signature]) {
						added[signature] = true;
						var range = {
							start: textDocument.positionAt(error.location.start),
							end: textDocument.positionAt(error.location.end)
						};
						diagnostics.push({
							severity: idx >= currentDoc.errors.length ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
							range: range,
							message: error.message
						});
					}
				});
			}
			return diagnostics;
		});
	}
}