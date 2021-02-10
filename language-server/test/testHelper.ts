

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, Connection, TextDocumentSyncKind,
	InitializeResult, RequestType
} from 'vscode-languageserver/node';
import { xhr, XHRResponse, getErrorStatusDescription } from 'request-light';
import Strings = require( 'azure-pipelines-language-service');
import { URI } from 'vscode-uri';
import * as URL from 'url';
import fs = require('fs');
import { JSONSchema } from "azure-pipelines-language-service";
import { ParseSchema } from "azure-pipelines-language-service";

namespace VSCodeContentRequest {
	export const type: RequestType<{}, {}, {}> = new RequestType('vscode/content');
}

// Create a connection for the server.
let connection: Connection = null;
if (process.argv.indexOf('--stdio') == -1) {
	connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
} else {
	connection = createConnection();
}

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: TextDocumentSyncKind.Full,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: false
			}
		}
	}
});

export let workspaceContext = {
	resolveRelativePath: (relativePath: string, resource: string) => {
		return URL.resolve(resource, relativePath);
	}
};

export let schemaRequestService = (uri: string): Thenable<JSONSchema> => {
	if (Strings.startsWith(uri, 'file://')) {
		let fsPath = URI.parse(uri).fsPath;
		return new Promise<JSONSchema>((c, e) => {
			fs.readFile(fsPath, 'UTF-8', (err, result) => {
				err ? e('') : c(ParseSchema(result.toString()));
			});
		});
	} else if (Strings.startsWith(uri, 'vscode://')) {
		return connection.sendRequest(VSCodeContentRequest.type, uri).then(responseText => {
			return responseText;
		}, error => {
			return error.message;
		});
	}
	return xhr({ url: uri, followRedirects: 5 }).then(response => {
		return ParseSchema(response.responseText);
	}, (error: XHRResponse) => {
		return Promise.reject(error.responseText || getErrorStatusDescription(error.status) || error.toString());
	});
};
