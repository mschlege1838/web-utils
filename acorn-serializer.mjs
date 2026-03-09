

export class AcornSerializer {
  
  target;
  
  constructor(target) {
    this.target = target;
  }
  
  async write(node) {
    if (!node.type) {
      throw new TypeError('Invlaid node: ' + node);
    }
    if (!this[node.type]) {
      throw new TypeError('No definition for node type: ' + node.type);
    }
    await this[node.type](node);
  }
  
  async #commaSeparate(nodeList, prefix, suffix) {
    const target = this.target;
    if (prefix) {
      await target.write(prefix);
    }
    let state = 0;
    for (const node of nodeList) {
      if (state === 0) {
        state = 1;
      } else {
        await target.write(',');
      }
      await this.write(node);
    }
    if (suffix) {
      await target.write(suffix);
    }
  }
  
  async #argsList(args) {
    await this.#commaSeparate(args, '(', ')');
  }
  
  async #arrayList(elements) {
    await this.#commaSeparate(elements, '[', ']');
  }
  
  async #bracketList(expressions) {
    await this.#commaSeparate(expressions, '{', '}');
  }
  
  async ArrayExpression(node) {
    await this.#arrayList(node.elements);
  }
  
  async ArrayPattern(node) {
    await this.#arrayList(node.elements);
  }
  
  async ArrowFunctionExpression(node) {
    const target = this.target;
    if (node.async) {
      await target.write('async');
    }
    await this.#argsList(node.params);
    await target.write('=>');
    await this.write(node.body);
  }
  
  async AwaitExpression(node) {
    await this.target.write('await ');
    await this.write(node.argument);
  }
  
  async AssignmentExpression(node) {
    await this.write(node.left);
    await this.target.write(node.operator);
    await this.write(node.right)
  }
  
  async BinaryExpression(node) {
    const target = this.target;
    await this.write(node.left);
    await target.write(` ${node.operator} `);
    await this.write(node.right);
  }
  
  async BlockStatement(node) {
    const target = this.target;
    await target.write('{');
    for (const statement of node.body) {
      await this.write(statement);
    }
    await target.write('}');
  }
  
  async BreakStatement(node) {
    await this.target.write('break;');
  }
  
  async CatchClause(node) {
    const target = this.target;
    await target.write('catch(');
    await this.write(node.param)
    await target.write(')');
    await this.write(node.body);
  }
  
  async CallExpression(node) {
    await this.write(node.callee);
    await this.#argsList(node.arguments)
  }
  
  async ChainExpression(node) {
    await this.write(node.expression);
  }
  
  async ClassBody(node) {
    const target = this.target;
    await target.write('{');
    for (const statement of node.body)  {
      await this.write(statement);
    }
    await target.write('}');
  }
  
  async ClassDeclaration(node) {
    const target = this.target;
    await target.write('class ');
    await this.write(node.id);
    if (node.superClass) {
      await target.write(' extends ');
      await this.write(node.superClass)
    }
    await this.write(node.body);
  }
  
  async ClassExpression(node) {
    const target = this.target;
    await target.write('class');
    if (node.superClass) {
      await target.write(' extends ');
      await this.write(node.superClass)
    }
    await this.write(node.body);
  }
  
  async ConditionalExpression(node) {
    const target = this.target;
    await this.write(node.test);
    await target.write(' ? ');
    await this.write(node.consequent);
    await target.write(' : ');
    await this.write(node.alternate);
  }
  
  async ContinueStatement(node) {
    await this.target.write('continue;');
  }
  
  async ExportNamedDeclaration(node) {
    const target = this.target;
    await target.write('export ');
    if (node.declaration) {
      await this.write(node.declaration);
    } else if (node.specifiers) {
      await this.#bracketList(node.specifiers);
    }
    await target.write(';');
  }
  
  async ExportSpecifier(node) {
    if (node?.exported?.name === node?.local?.name) {
      await this.write(node.exported);
    } else {
      await this.write(node.local);
      await this.target.write(' as ');
      await this.write(node.exported);
    }
  }
  
  async EmptyStatement(node) {
    await this.target.write(';');
  }
  
  async ExpressionStatement(node) {
    await this.write(node.expression);
    await this.target.write(';');
  }
  
  async ForOfStatement(node) {
    const target = this.target;
    await target.write(`for (${node.left.kind} `);
    await this.write(node.left.declarations[0]);
    await target.write(' of ');
    await this.write(node.right);
    await target.write(')');
    await this.write(node.body);
  }
  
  async ForStatement(node) {
    const target = this.target;
    await target.write('for (');
    if (node.init) {
      await target.write(`${node.init.kind} `);
      await this.#commaSeparate(node.init.declarations);
    }
    await target.write(';');
    await this.write(node.test);
    await target.write(';');
    await this.write(node.update);
    await target.write(')');
    await this.write(node.body);
  }
  
  async FunctionDeclaration(node) {
    const target = this.target;
    
    if (node.async) {
      await target.write('async ');
    }
    await target.write('function ');
    if (node.generator) {
      await target.write('*');
    }
    await this.write(node.id);
    await this.#argsList(node.params);
    await this.write(node.body);
  }
  
  async FunctionExpression(node) {
    const target = this.target;
    
    if (node.async) {
      await target.write('async ');
    }
    await target.write('function ');
    if (node.generator) {
      await target.write('*');
    }
    await this.#argsList(node.params);
    await this.write(node.body);
  }
  
  async IfStatement(node) {
    const target = this.target;
    await target.write('if (');
    await this.write(node.test);
    await target.write(')');
    await this.write(node.consequent);
    if (node.alternate) {
      await target.write(' else ');
      await this.write(node.alternate);
    }
  }
  
  async Identifier(node) {
    await this.target.write(node.name);
  }
  
  async ImportAttribute(node) {
    await this.write(node.key);
    await this.target.write(':');
    await this.write(node.value)
  }
  
  async ImportDeclaration(node) {
    const target = this.target;
    target.write('import ');
    
    let state = 0;
    for (const specifier of node.specifiers) {
      switch (specifier.type) {
        case 'ImportSpecifier': {  
          switch (state) {
            case 0:
              await target.write('{');
              state = 1;
              break;
            case 1:
              await target.write(',');
              break;
          }
          this.write(specifier);
          break;
        }
        
        case 'ImportDefaultSpecifier': {
          state = 2;
          await this.write(specifier.local);
          break;
        }
        
      }
    }
    
    if (state === 1) {
      await target.write('}');
    }
    
    await target.write(' from ');
    await this.write(node.source);
    
    if (node.attributes && node.attributes.length) {
      await target.write(' with {');
      await this.#commaSeparate(node.attributes);
      await target.write('}');
    }
    
    await target.write(';');
  }
  
  async ImportDefaultSpecifier(node) {
    await this.target.write(node.name);
  }
  
  async ImportSpecifier(node) {
    if (node?.imported?.name === node?.local?.name) {
      await this.write(node.imported);
    } else {
      await this.write(node.imported);
      await this.target.write(' as ');
      await this.write(node.local);
    }
  }
  
  async Literal(node) {
    await this.target.write(node.raw);
  }
  
  async LogicalExpression(node) {
    const target = this.target;
    await this.write(node.left);
    await target.write(node.operator);
    await this.write(node.right);
  }

  async MemberExpression(node) {
    const target = this.target;
    await this.write(node.object);
    
    if (node.optional) {
      await target.write('?.');
    }
    
    const isComputed = node.computed || typeof node.property?.value === 'number';
    if (isComputed) {
      await target.write('[');
    } else if (!node.optional) {
      await target.write('.');
    }
    await this.write(node.property);
    if (isComputed) {
      await target.write(']');
    }
  }
  
  async MetaProperty(node) {
    await this.write(node.meta);
    await this.target.write('.');
    await this.write(node.property);
  }
  
  async MethodDefinition(node) {
    const target = this.target;
    
    if (node.static) {
      await target.write('static ');
    }
    if (node.value.async) {
      await target.write('async ');
    }
    if (node.kind !== 'method' && node.kind !== 'constructor' && node.kind !== 'init') {
      await target.write(`${node.kind} `);
    }
    if (node.computed) {
      await target.write('[');
    }
    await this.write(node.key);
    if (node.computed) {
      await target.write(']');
    }
    if (node.value.generator) {
      await target.write('*');
    }
    await this.#argsList(node.value.params);
    await this.write(node.value.body);
  }
  
  async NewExpression(node) {
    await this.target.write('new ');
    await this.write(node.callee);
    await this.#argsList(node.arguments);
  }
  
  async ObjectExpression(node) {
    await this.#bracketList(node.properties);
  }
  
  async ObjectPattern(node) {
    const target = this.target;
    await target.write('{');
    await this.#commaSeparate(node.properties);
    await target.write('}');
  }
  
  async ParenthesizedExpression(node) {
    const target = this.target;
    await target.write('(');
    await this.write(node.expression);
    await target.write(')');
  }
  
  async PrivateIdentifier(node) {
    await this.target.write(`#${node.name}`);
  }
  
  async Property(node) {
    if (node.method) {
      await this.MethodDefinition(node);
    } else if (node.shorthand) {
      await this.write(node.key);
    } else {
      const target = this.target;
      if (node.computed) {
        await target.write('[');
      }
      await this.write(node.key);
      if (node.computed) {
        await target.write(']');
      }
      await target.write(':')
      await this.write(node.value);
    }
  }
  
  async Program(node) {
    for (const expr of node.body) {
      await this.write(expr);
    }
  }
  
  async PropertyDefinition(node) {
    const target = this.target;
    
    if (node.static) {
      await target.write('static ');
    }
    if (node.computed) {
      await target.write('[');
    }
    await this.write(node.key);
    if (node.computed) {
      await target.write(']');
    }
    if (node.value) {
      await target.write(' = ');
      await this.write(node.value);
    }
    await target.write(';');
  }
  
  async ReturnStatement(node) {
    const target = this.target;
    await target.write('return ');
    if (node.argument) {
      await this.write(node.argument);
    }
    await target.write(';');
  }
  
  async SpreadElement(node) {
    await this.target.write('...');
    await this.write(node.argument);
  }
  
  async Super(node) {
    await this.target.write('super');
  }
  
  async SwitchCase(node) {
    const target = this.target;
    await target.write('case ');
    await this.write(node.test);
    await target.write(':');
    for (const statement of node.consequent) {
      await this.write(statement);
    }
  }
  
  async SwitchStatement(node) {
    const target = this.target;
    await target.write('switch (');
    await this.write(node.discriminant)
    await target.write(') {');
    for (const caseNode of node.cases) {
      await this.write(caseNode);
    }
    await target.write('}');
  }
  
  async TemplateElement(node) {
    await this.target.write(node.value.raw);
  }
  
  async TemplateLiteral(node) {
    const target = this.target;
    await target.write('`');
    
    const expressions = node.expressions;
    let expressionIndex = 0;
    for (const quasi of node.quasis) {
      await this.write(quasi);
      if (!quasi.tail) {
        await target.write('${');
        await this.write(expressions[expressionIndex++]);
        await target.write('}');
      }
    }
    
    await target.write('`');
  }
  
  
  async ThisExpression(node) {
    await this.target.write('this');
  }
  
  async ThrowStatement(node) {
    const target = this.target;
    await target.write('throw ');
    await this.write(node.argument);
    await target.write(';');
  }
  
  async TryStatement(node) {
    const target = this.target;
    await target.write('try ');
    await this.write(node.block);
    if (node.handler) {
      await this.write(node.handler);
    }
    if (node.finalizer) {
      await target.write(' finally ');
      await this.write(node.finalizer);
    }
  }
  
  async UnaryExpression(node) {
    const target = this.target;
    const prefix = node.prefix;
    if (prefix) {
      await target.write(`${node.operator} `);
    }
    await this.write(node.argument);
    if (!prefix) {
      await target.write(` ${node.operator}`);
    }
  }
  
  async UpdateExpression(node) {
    const target = this.target;
    const prefix = node.prefix;
    if (prefix) {
      await target.write(node.operator);
    }
    await this.write(node.argument);
    if (!prefix) {
      await target.write(node.operator);
    }
  }
  
  async VariableDeclaration(node) {
    const target = this.target;
    await target.write(`${node.kind} `);
    await this.#commaSeparate(node.declarations);
    await target.write(';');
  }
  
  async VariableDeclarator(node) {
    const target = this.target;
    await this.write(node.id);
    if (node.init) {
      await target.write('=');
      await this.write(node.init);
    }
  }
  
  async WhileStatement(node) {
    const target = this.target;
    await target.write('while (');
    await this.write(node.test);
    await target.write(')');
    await this.write(node.body);
  }
  
}