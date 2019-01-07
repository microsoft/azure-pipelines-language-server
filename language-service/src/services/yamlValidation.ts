/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { JSONSchemaService } from './jsonSchemaService';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { PromiseConstructor, Thenable, LanguageSettings} from '../yamlLanguageService';
import { TextDocument } from "vscode-languageserver-types";
import { YAMLDocument, SingleYAMLDocument } from "../parser/yamlParser";
import { IProblem, ProblemSeverity } from '../parser/jsonParser';

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

export class YAMLValidation {
	
	private jsonSchemaService: JSONSchemaService;
	private promise: PromiseConstructor;
	private validationEnabled: boolean;

	public constructor(jsonSchemaService: JSONSchemaService, promiseConstructor: PromiseConstructor) {
		this.jsonSchemaService = jsonSchemaService;
		this.promise = promiseConstructor;
		this.validationEnabled = true;
	}

	public configure(shouldValidate: LanguageSettings): void {
		if(shouldValidate){
			this.validationEnabled = shouldValidate.validate;
		}
	}
	
	public doValidation(textDocument: TextDocument, yamlDocument: YAMLDocument): Thenable<Diagnostic[]> {

		if(!this.validationEnabled){
			return this.promise.resolve([]);
		}

		if (yamlDocument.documents.length === 0) {
			//this is strange...
			return this.promise.resolve([]);
		}

		if (yamlDocument.documents.length > 1) {
			return this.promise.resolve([{
				severity: DiagnosticSeverity.Error,
				range: {
					start: {
						line: 0,
						character: 0
					},
					end: textDocument.positionAt(textDocument.getText().length)
				},
				message: localize('multiDocumentError', 'Only single-document files are supported')
			}])
		}

		const translateSeverity = (problemSeverity: ProblemSeverity): DiagnosticSeverity => {
			if (problemSeverity === ProblemSeverity.Error) {
				return DiagnosticSeverity.Error;
			 }
			 if (problemSeverity == ProblemSeverity.Warning) {
				 return DiagnosticSeverity.Warning;
			 }
	
			 return DiagnosticSeverity.Hint;
		};

		return this.jsonSchemaService.getSchemaForResource(textDocument.uri).then(function (schema) {
			var diagnostics: Diagnostic[] = [];

			let jsonDocument: SingleYAMLDocument = yamlDocument.documents[0];

			jsonDocument.errors.forEach(err => {
				diagnostics.push({
					severity: DiagnosticSeverity.Error,
					range: {
						start: textDocument.positionAt(err.start),
						end: textDocument.positionAt(err.end)
					},
					message: err.message
				});
			});

			jsonDocument.warnings.forEach(warn => {
				diagnostics.push({
					severity: DiagnosticSeverity.Warning,
					range: {
						start: textDocument.positionAt(warn.start),
						end: textDocument.positionAt(warn.end)
					},
					message: warn.message
				});
			});

			if (schema) {
				var added: {[key:string]: boolean} = {};
				const problems: IProblem[] = jsonDocument.getValidationProblems(schema.schema);
				problems.forEach(function (problem: IProblem, index: number) {
					const signature: string = '' + problem.location.start + ' ' + problem.location.end + ' ' + problem.message;
					if (!added[signature]) {
						added[signature] = true;
						diagnostics.push({
							severity: translateSeverity(problem.severity),
							range: {
								start: textDocument.positionAt(problem.location.start),
								end: textDocument.positionAt(problem.location.end)
							},
							message: problem.message
						})
					}
				});

				if(schema.errors.length > 0) {
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
			}

			return diagnostics;
		});
	}
}