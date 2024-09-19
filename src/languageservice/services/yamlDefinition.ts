/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DefinitionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionLink, LocationLink, Range } from 'vscode-languageserver-types';
import { URI, Utils } from 'vscode-uri';
import path from 'path';
import { isAlias, isPair, isScalar } from 'yaml';
import { Telemetry } from '../telemetry';
import { yamlDocumentsCache } from '../parser/yaml-documents';
import { matchOffsetToDocument } from '../utils/arrUtils';
import { convertErrorToTelemetryMsg } from '../utils/objects';
import { TextBuffer } from '../utils/textBuffer';
import { getParent } from '../utils/astUtils';

export class YamlDefinition {
  constructor(private readonly telemetry?: Telemetry) {}

  getDefinition(document: TextDocument, workspaceRoot: URI, params: DefinitionParams): DefinitionLink[] | undefined {
    try {
      const yamlDocument = yamlDocumentsCache.getYamlDocument(document);
      const offset = document.offsetAt(params.position);
      const currentDoc = matchOffsetToDocument(offset, yamlDocument);
      if (currentDoc) {
        const [node] = currentDoc.getNodeFromPosition(offset, new TextBuffer(document));
        if (isScalar<string>(node)) {
          const parent = getParent(currentDoc.internalDocument, node);
          // can only jump to definition for template declaration, which means:
          // * we must be on a scalar node that is acting as a value (vs a key)
          // * the key must be "template"
          //
          // In other words...
          // - template: my_cool_template.yml
          //             ^^^^^^^^^^^^^^^^^^^^ this part
          if (isPair(parent) && parent.key === 'template' && parent.value === node) {
            let [location, resource] = node.value.split('@');

            // We don't support jumping to external resources yet.
            if (resource && resource !== 'self') {
              return undefined;
            }

            // Azure Pipelines accepts both forward and back slashes as path separators,
            // even when running on non-Windows.
            // To make things easier, normalize all path separators into this platform's path separator.
            // That way, vscode-uri will operate on the separators as expected.
            location = location
              .replaceAll(path.posix.sep, path.sep)
              .replaceAll(path.win32.sep, path.sep);

            const definitionUri = location.startsWith(path.sep) ?
              Utils.joinPath(workspaceRoot, location.substring(1)) :
              Utils.resolvePath(Utils.dirname(URI.parse(document.uri, true)), location);

            return [LocationLink.create(definitionUri.toString(true), Range.create(0, 0, 0, 0), Range.create(0, 0, 0, 0))];
          }
        } else if (node && isAlias(node)) {
          const defNode = node.resolve(currentDoc.internalDocument);
          if (defNode && defNode.range) {
            const targetRange = Range.create(document.positionAt(defNode.range[0]), document.positionAt(defNode.range[2]));
            const selectionRange = Range.create(document.positionAt(defNode.range[0]), document.positionAt(defNode.range[1]));
            return [LocationLink.create(document.uri, targetRange, selectionRange)];
          }
        }
      }
    } catch (err) {
      this.telemetry?.sendError('yaml.definition.error', { error: convertErrorToTelemetryMsg(err) });
    }

    return undefined;
  }
}
