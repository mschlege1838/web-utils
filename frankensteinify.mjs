import * as fs from 'node:fs/promises';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';

import * as acorn from 'acorn';
import { minify as jsMinify } from 'terser';
import { minify as htmlMinify } from 'html-minifier-next';
import { transform } from 'lightningcss';

import { AcornSerializer } from './acorn-serializer.mjs';
import { replaceImportImg } from './replace-import-img.mjs';

function isImportedCSS(node) {
  return node.attributes ? node.attributes.find(e => e.key?.name === 'type' && e.value?.value === 'css') : false;
}

function isFetchedHTMLTemplate(node) {
  if (!node.kind === 'const') {
    return false;
  }
  const declarations = node.declarations;
  if (declarations.length !== 1) {
    return false;
  }
  
  const init = declarations[0].init;
  if (init.type !== 'AwaitExpression') {
    return false;
  }
  
  
  if (init.argument.callee?.name !== 'loadTemplate') {
    return false;
  }
  
  const args = init.argument?.arguments;
  if (!args || args.length !== 1) {
    return false;
  }
  
  return args[0]?.callee?.object.type === 'MetaProperty' && args[0].callee.object.meta?.name === 'import';
}

class Frankensteiner {
  
  decoder = new StringDecoder('utf-8');
  processedSources = new Map();
  identifiers = new Set();
  target;
  serializer;
  
  constructor(target, serializer) {
    this.target = target;
    this.serializer = serializer;
  }
  
  async processJS(fname) {
    const processedSources = this.processedSources;
    if (processedSources.has(fname)) {
      return;
    }
    processedSources.set(fname, true);
    
    const ast = acorn.parse(await fs.readFile(fname, { encoding: 'utf-8' }), {
      ecmaVersion: 'latest',
      sourceType: 'module',
      preserveParens: true
    });
    
    const body = ast.body;
    for (let i = 0; i < body.length; ++i) {
      const node = body[i];
      switch (node.type) {
        case 'ImportDeclaration':
          if (isImportedCSS(node)) {
            body.splice(i, 1, ...await this.translateCSS(fname, node));
          } else {
            await this.translateJS(fname, node);
            body.splice(i--, 1);
          }
          break;
        case 'VariableDeclaration':
          if (isFetchedHTMLTemplate(node)) {
            body[i] = await this.translateHTML(fname, node);
          }
          break;
      }
    }
    
    await this.serializer.write(ast);
  }
  
  async translateJS(parentFname, node) {
    const source = path.resolve(path.dirname(parentFname), node.source.value);
    const processedSources = this.processedSources;
    if (processedSources.has(source)) {
      return;
    }
    
    await this.processJS(source);
  }
  
  async translateHTML(parentFname, node) {
    const source = path.resolve(path.dirname(parentFname), node.declarations[0].init.argument.arguments[0].arguments[0].value);
    const identifier = node.declarations[0].id.name;
    
    const identifiers = this.identifiers;
    const processedSources = this.processedSources;
    
    let result;
    if (processedSources.has(source)) {
      const currentIdentifier = processedSources.get(source);
      result = currentIdentifier === identifier ? { type: 'EmptyStatement' } : {
        type: 'VariableDeclaration',
        declarations: [{
          type: 'VariableDeclarator',
          id: {
            type: 'Identifier',
            name: identifier
          },
          init: {
            type: 'Identifier',
            name: currentIdentifier
          }
        }],
        kind: 'const'
      };
    } else {
      const htmlSource = await htmlMinify(await replaceImportImg(source), {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true,
        useShortDoctype: true
      });
      
      processedSources.set(source, identifier);
      if (identifiers.has(identifier)) {
        throw new TypeError(`Duplicate identifier: ${identifier}; from: ${parentFname}`);
      }
      
      result = {
        "type": "VariableDeclaration",
        "declarations": [
          {
            "type": "VariableDeclarator",
            "id": {
              "type": "Identifier",
              "name": identifier
            },
            "init": {
              "type": "CallExpression",
              "callee": {
                "type": "MemberExpression",
                "object": {
                  "type": "CallExpression",
                  "callee": {
                    "type": "MemberExpression",
                    "object": {
                      "type": "Identifier",
                      "name": "Document"
                    },
                    "property": {
                      "type": "Identifier",
                      "name": "parseHTMLUnsafe"
                    },
                    "computed": false,
                    "optional": false
                  },
                  "arguments": [
                    {
                      "type": "TemplateLiteral",
                      "expressions": [],
                      "quasis": [
                        {
                          "type": "TemplateElement",
                          "value": {
                            "raw": htmlSource,
                            "cooked": htmlSource
                          },
                          "tail": true
                        }
                      ]
                    }
                  ],
                  "optional": false
                },
                "property": {
                  "type": "Identifier",
                  "name": "querySelector"
                },
                "computed": false,
                "optional": false
              },
              "arguments": [
                {
                  "type": "Literal",
                  "value": "template",
                  "raw": "'template'"
                }
              ],
              "optional": false
            }
          }
        ],
        "kind": "const"
      };
    }
    
    identifiers.add(identifier);
    return result;
  }
  
  async translateCSS(parentFname, node) {
    const source = path.resolve(path.dirname(parentFname), node.source.value)
    const identifier = node.specifiers[0].local.name;
    
    const processedSources = this.processedSources;
    
    if (processedSources.has(source)) {
      const currentIdentifier = processedSources.get(source);
      return [currentIdentifier === identifier ? { type: 'EmptyStatement' } : {
        type: 'VariableDeclaration',
        declarations: [{
          type: 'VariableDeclarator',
          id: {
            type: 'Identifier',
            name: identifier
          },
          init: {
            type: 'Identifier',
            name: currentIdentifier
          }
        }],
        kind: 'const'
      }];
    } else {
      const cssSource = this.decoder.write(transform({
        code: await fs.readFile(source),
        minify: true
      }).code);
      
      processedSources.set(source, identifier);
      
      return [{
        "type": "VariableDeclaration",
        "declarations": [
          {
            "type": "VariableDeclarator",
            "id": {
              "type": "Identifier",
              "name": identifier
            },
            "init": {
              "type": "NewExpression",
              "callee": {
                "type": "Identifier",
                "name": "CSSStyleSheet"
              },
              "arguments": []
            }
          }
        ],
        "kind": "const"
      }, {
        "type": "ExpressionStatement",
        "expression": {
          "type": "AwaitExpression",
          "argument": {
            "type": "CallExpression",
            "callee": {
              "type": "MemberExpression",
              "object": {
                "type": "Identifier",
                "name": identifier
              },
              "property": {
                "type": "Identifier",
                "name": "replace"
              },
              "computed": false,
              "optional": false
            },
            "arguments": [
              {
                "type": "TemplateLiteral",
                "expressions": [],
                "quasis": [
                  {
                    "type": "TemplateElement",
                    "value": {
                      "raw": cssSource,
                      "cooked": cssSource
                    },
                    "tail": true
                  }
                ]
              }
            ],
            "optional": false
          }
        }
      }];
    }
  }
}


await fs.rm('./assets', {
  recursive: true,
  force: true
});


const outFile = './web-utils.mjs';
const minFile = './web-utils.min.mjs';

let handle = await fs.open('./web-utils.mjs', 'w');
try {
  const serializer = new AcornSerializer(handle);
  const stitches = new Frankensteiner(handle, serializer);
  for (let i = 2; i < process.argv.length; ++i) {
    await stitches.processJS(process.argv[i]);
  }
} finally {
  await handle.close();
}

const minifiedSource = (await jsMinify(await fs.readFile(outFile, { encoding: 'utf-8' }), {
  ecma: 'latest',
  module: true,
  mangle: {}
})).code;
await fs.writeFile(minFile, minifiedSource, { encoding: 'utf-8' });