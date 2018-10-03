## Features

1. YAML validation:
    * Detects whether the entire file is valid yaml
2. Validation:
    * Detects errors such as:
        * Node is not found
        * Node has an invalid key node type
        * Node has an invalid type
        * Node is not a valid child node
    * Detects warnings such as:
        * Node is an additional property of parent
3. Auto completion:
    * Auto completes on all commands
    * Scalar nodes autocomplete to schema's defaults if they exist
4. Hover support:
    * Hovering over a node shows description *if available*
5. Document outlining:
    * Shows a complete document outline of all nodes in the document

## Language Server Settings

The following settings are supported:
* `yaml.format.enable`: Enable/disable default YAML formatter
* `yaml.validate`: Enable/disable validation feature
* `yaml.schemas`: Helps you associate schemas with files in a glob pattern
* `yaml.customTags`: Array of custom tags that the parser will validate against. It has two ways to be used. Either an item in the array is a custom tag such as "!Ref" or you can specify the type of the object !Ref should be by doing "!Ref scalar". For example: ["!Ref", "!Some-Tag scalar"]. The type of object can be one of scalar, sequence, mapping, map.

## Language Server Settings

The following settings are supported:
* `yaml.format.enable`: Enable/disable default YAML formatter
* `yaml.validate`: Enable/disable validation feature
* `yaml.schemas`: Helps you associate schemas with files in a glob pattern
* `yaml.customTags`: Array of custom tags that the parser will validate against. It has two ways to be used. Either an item in the array is a custom tag such as "!Ref" or you can specify the type of the object !Ref should be by doing "!Ref scalar". For example: ["!Ref", "!Some-Tag scalar"]. The type of object can be one of scalar, sequence, mapping, map.

##### Associating a schema to a glob pattern via yaml.schemas: 
When associating a schema it should follow the format below
```
yaml.schemas: {
    "url": "globPattern",
    "Kubernetes": "globPattern",
    "kedge": "globPattern"
}
```

e.g.
```
yaml.schemas: {
    "http://json.schemastore.org/composer": "/*"
}
```

e.g.

```
yaml.schemas: {
    "kubernetes": "/myYamlFile.yaml"
}
```
e.g.
```
yaml.schemas: {
    "kedge": "/myKedgeApp.yaml"
}
```

e.g.
```
yaml.schemas: {
    "http://json.schemastore.org/composer": "/*",
    "kubernetes": "/myYamlFile.yaml"
}
```

`yaml.schemas` extension allows you to specify json schemas that you want to validate against the yaml that you write. Kubernetes and kedge are optional fields. They do not require a url as the language server will provide that. You just need the keywords kubernetes/kedge and a glob pattern.

## Dependents/Clients
This repository only contains the server implementation. Here are some known clients consuming this server:

* [azure-pipelines-language-server](https://github.com/Microsoft/azure-pipelines-language-server/tree/master/language-server)

## Thanks

This project was forked from the [YAML Language Server](https://github.com/redhat-developer/yaml-language-server) by Red Hat.