/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { JSONSchemaService, CustomSchemaProvider } from './services/jsonSchemaService'
import { TextDocument, Position, CompletionList, FormattingOptions, Diagnostic,
  CompletionItem, TextEdit, Hover, SymbolInformation
} from 'vscode-languageserver-types';
import { JSONSchema } from './jsonSchema';
import { YAMLDocumentSymbols } from './services/documentSymbols';
import { YAMLCompletion } from "./services/yamlCompletion";
import { YAMLHover } from "./services/yamlHover";
import { YAMLValidation } from "./services/yamlValidation";
import { format } from './services/yamlFormatter';
import { JSONWorkerContribution } from './jsonContributions';
import { YAMLDocument } from './parser/yamlParser';
import { YAMLTraversal, YamlNodeInfo, YamlNodePropertyValues } from './services/yamlTraversal';

export interface LanguageSettings {
  validate?: boolean; //Setting for whether we want to validate the schema
  isKubernetes?: boolean; //If true then its validating against kubernetes
  schemas?: any[]; //List of schemas,
  customTags?: Array<String>; //Array of Custom Tags
}

export interface PromiseConstructor {
    /**
     * Creates a new Promise.
     * @param executor A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    new <T>(executor: (resolve: (value?: T | Thenable<T>) => void, reject: (reason?: any) => void) => void): Thenable<T>;

    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values An array of Promises.
     * @returns A new Promise.
     */
    all<T>(values: Array<T | Thenable<T>>): Thenable<T[]>;
    /**
     * Creates a new rejected promise for the provided reason.
     * @param reason The reason the promise was rejected.
     * @returns A new rejected Promise.
     */
    reject<T>(reason: any): Thenable<T>;

    /**
      * Creates a new resolved promise for the provided value.
      * @param value A promise.
      * @returns A promise whose internal state matches the provided promise.
      */
    resolve<T>(value: T | Thenable<T>): Thenable<T>;

}

export interface Thenable<R> {
    /**
    * Attaches callbacks for the resolution and/or rejection of the Promise.
    * @param onfulfilled The callback to execute when the Promise is resolved.
    * @param onrejected The callback to execute when the Promise is rejected.
    * @returns A Promise for the completion of which ever callback is executed.
    */
    then<TResult>(onfulfilled?: (value: R) => TResult | Thenable<TResult>, onrejected?: (reason: any) => TResult | Thenable<TResult>): Thenable<TResult>;
    then<TResult>(onfulfilled?: (value: R) => TResult | Thenable<TResult>, onrejected?: (reason: any) => void): Thenable<TResult>;
}

export interface WorkspaceContextService {
	resolveRelativePath(relativePath: string, resource: string): string;
}
/**
 * The schema request service is used to fetch schemas. The result should the schema file comment, or,
 * in case of an error, a displayable error string
 */
export interface SchemaRequestService {
	(uri: string): Thenable<JSONSchema>;
}

export interface SchemaConfiguration {
	/**
	 * The URI of the schema, which is also the identifier of the schema.
	 */
	uri: string;
	/**
	 * A list of file names that are associated to the schema. The '*' wildcard can be used. For example '*.schema.json', 'package.json'
	 */
	fileMatch?: string[];
	/**
	 * The schema for the given URI.
	 * If no schema is provided, the schema will be fetched with the schema request service (if available).
	 */
	schema?: JSONSchema;
}

export interface LanguageService {
  configure(settings: LanguageSettings): void;
	doComplete(document: TextDocument, position: Position, yamlDocument: YAMLDocument): Thenable<CompletionList>;
  doValidation(document: TextDocument, yamlDocument: YAMLDocument): Thenable<Diagnostic[]>;
  doHover(document: TextDocument, position: Position, doc: YAMLDocument): Thenable<Hover>;
  findDocumentSymbols(document: TextDocument, doc: YAMLDocument): SymbolInformation[];
  doResolve(completionItem: CompletionItem): Thenable<CompletionItem>;
  resetSchema(uri: string): boolean;
  doFormat(document: TextDocument, options: FormattingOptions, customTags: Array<String>): TextEdit[];
  findNodes(document: TextDocument, doc: YAMLDocument, key: string): Thenable<YamlNodeInfo[]>;
  getNodePropertyValues(document: TextDocument, doc: YAMLDocument, position: Position, propertyName: string): YamlNodePropertyValues;
}

export function getLanguageService(
  schemaRequestService: SchemaRequestService,
  contributions: JSONWorkerContribution[],
  customSchemaProvider: CustomSchemaProvider,
  workspaceContext?: WorkspaceContextService,
  promiseConstructor?: PromiseConstructor): LanguageService {

  let promise = promiseConstructor || Promise;

  let schemaService = new JSONSchemaService(schemaRequestService, workspaceContext, customSchemaProvider);

  let completer = new YAMLCompletion(schemaService, contributions, promise);
  let hover = new YAMLHover(schemaService, contributions, promise);
  let yamlDocumentSymbols = new YAMLDocumentSymbols();
  let yamlValidation = new YAMLValidation(schemaService, promise);
  let yamlTraversal = new YAMLTraversal(promise);

  return {
      configure: (settings) => {
        schemaService.clearExternalSchemas();
        if (settings.schemas) {
          settings.schemas.forEach(schema => {
            schemaService.registerExternalSchema(schema.uri, schema.fileMatch, schema.schema);
          });
        }
        yamlValidation.configure(settings);
        let customTagsSetting = settings && settings["customTags"] ? settings["customTags"] : [];
        completer.configure(customTagsSetting);
      },
      doComplete: completer.doComplete.bind(completer),
      doResolve: completer.doResolve.bind(completer),
      doValidation: yamlValidation.doValidation.bind(yamlValidation),
      doHover: hover.doHover.bind(hover),
      findDocumentSymbols: yamlDocumentSymbols.findDocumentSymbols.bind(yamlDocumentSymbols),
      resetSchema: (uri: string) => schemaService.onResourceChange(uri),
      doFormat: format,
      findNodes: yamlTraversal.findNodes.bind(yamlTraversal),
      getNodePropertyValues: yamlTraversal.getNodePropertyValues.bind(yamlTraversal)
  }
}
