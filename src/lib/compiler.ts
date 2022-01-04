/*
 *
 * Chapter 4
 */
const emit = console.log;

export interface AST {
  emit(env: Environment): void;
  equals(other: AST): boolean;
}

export class Number implements AST {
  constructor(public value: number) {}

  emit(_: Environment) {
    emit(`  ldr r0, =${this.value}`);
  }

  equals(other: AST): boolean {
    return other instanceof Number && this.value === other.value;
  }
}

export class Id implements AST {
  constructor(public value: string) {}
  emit(env: Environment) {
    let offset = env.locals.get(this.value);
    if (offset) {
      emit(` ldr r0, [fp, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${this.value}`);
    }
  }
  equals(other: AST): boolean {
    return other instanceof Id && this.value == other.value;
  }
}

export class Not implements AST {
  constructor(public term: AST) {}
  emit(env: Environment) {
    this.term.emit(env);
    emit(` cmp r0, #0`);
    emit(` moveq r0, #1`);
    emit(` movne r0, #0`);
  }
  equals(other: AST): boolean {
    return other instanceof Not && this.term.equals(other.term);
  }
}

export class Equal implements AST {
  constructor(public left: AST, public right: AST) {}
  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  moveq r0, #1`);
    emit(`  movne r0, #0`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof Equal &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class NotEqual implements AST {
  constructor(public left: AST, public right: AST) {}
  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  cmp r0, r1`);
    emit(`  movne r0, #1`);
    emit(`  moveq r0, #0`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof NotEqual &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class Add implements AST {
  constructor(public left: AST, public right: AST) {}
  emit(env: Environment) {
    this.left.emit(env);
    emit(`push {r0, ip}`);
    this.right.emit(env);
    emit(`pop {r1, ip}`);
    emit(`add r0, r0, r1`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof Add &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class Subtract implements AST {
  constructor(public left: AST, public right: AST) {}

  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  sub r0, r1, r0`);
  }

  equals(other: AST): boolean {
    return (
      other instanceof Subtract &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class Multiply implements AST {
  constructor(public left: AST, public right: AST) {}
  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  mul r0, r1, r0`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof Multiply &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class Divide implements AST {
  constructor(public left: AST, public right: AST) {}
  emit(env: Environment) {
    this.left.emit(env);
    emit(`  push {r0, ip}`);
    this.right.emit(env);
    emit(`  pop {r1, ip}`);
    emit(`  udiv r0, r1, r0`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof Divide &&
      this.left.equals(other.left) &&
      this.right.equals(other.right)
    );
  }
}

export class Call implements AST {
  constructor(public callee: string, public args: Array<AST>) {}
  emit(env: Environment) {
    const count = this.args.length;
    if (count === 0) {
      emit(` bl ${this.callee}`);
    } else if (count === 1) {
      this.args[0].emit(env);
      emit(` bl ${this.callee}`);
    } else if (count >= 2 && count <= 4) {
      emit(` sub sp, sp, #16`);
      this.args.forEach((arg, i) => {
        arg.emit(env);
        emit(` str r0, [sp, #${4 * i}]`);
      });
      emit(` pop {r0, r1, r2, r3}`);
      emit(` bl ${this.callee}`);
    } else {
      throw Error('More than 4 arguments are not supported');
    }
  }

  equals(other: AST): boolean {
    return (
      other instanceof Call &&
      this.callee === other.callee &&
      this.args.length === other.args.length &&
      this.args.every((arg, i) => arg.equals(other.args[i]))
    );
  }
}

export class Return implements AST {
  constructor(public term: AST) {}
  emit(env: Environment) {
    this.term.emit(env);
    emit(` mov sp, fp`);
    emit(` pop {fp, pc}`);
  }
  equals(other: AST): boolean {
    return other instanceof Return && this.term.equals(other.term);
  }
}

export class Block implements AST {
  constructor(public statements: Array<AST>) {}
  emit(env: Environment) {
    this.statements.forEach((statement) => statement.emit(env));
  }
  equals(other: AST): boolean {
    return (
      other instanceof Block &&
      this.statements.length === other.statements.length &&
      this.statements.every((statement, i) =>
        statement.equals(other.statements[i])
      )
    );
  }
}

export class If implements AST {
  constructor(
    public conditional: AST,
    public consequence: AST,
    public alternative: AST
  ) {}
  emit(env: Environment) {
    let ifFalseLabel = new Label();
    let endIfLabel = new Label();
    this.conditional.emit(env);
    emit(` cmp r0, #0`);
    emit(` beq ${ifFalseLabel}`);
    this.consequence.emit(env);
    emit(` b ${endIfLabel}`);
    emit(`${ifFalseLabel}:`);
    this.alternative.emit(env);
    emit(`${endIfLabel}:`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof If &&
      this.conditional.equals(other.conditional) &&
      this.consequence.equals(other.consequence) &&
      this.alternative.equals(other.alternative)
    );
  }
}

export class Function implements AST {
  constructor(
    public name: string,
    public parameters: Array<string>,
    public body: AST
  ) {}

  emit(_: Environment) {
    if (this.parameters.length > 4)
      throw Error('More than 4 params is not supported');
    emit(``);
    emit(`.global ${this.name}`);
    emit(`${this.name}:`);
    this.emitPrologue();
    const env = this.setUpEnvironment();
    this.body.emit(env);
    this.emitEpilogue();
  }
  emitPrologue() {
    emit(` push {fp, lr}`);
    emit(` mov fp, sp`);
    emit(` push {r0, r1, r2, r3}`);
  }
  emitEpilogue() {
    emit(` mov sp, fp`);
    emit(` mov r0, #0`);
    emit(` pop {fp, pc}`);
  }

  setUpEnvironment() {
    const locals = new Map();
    this.parameters.forEach((parameter, i) => {
      locals.set(parameter, 4 * i - 16);
    });
    return new Environment(locals, -20);
  }

  equals(other: AST): boolean {
    return (
      other instanceof Function &&
      this.name === other.name &&
      this.parameters.length === other.parameters.length &&
      this.parameters.every(
        (parameter, i) => parameter === other.parameters[i]
      ) &&
      this.body.equals(other.body)
    );
  }
}

export class Var implements AST {
  constructor(public name: string, public value: AST) {}
  emit(env: Environment) {
    this.value.emit(env);
    emit(` push {r0, ip}`);
    env.locals.set(this.name, env.nextLocalOffset - 4);
    env.nextLocalOffset -= 8;
  }
  equals(other: AST): boolean {
    return (
      other instanceof Var &&
      this.name === other.name &&
      this.value.equals(other.value)
    );
  }
}

export class Assign implements AST {
  constructor(public name: string, public value: AST) {}
  emit(env: Environment) {
    this.value.emit(env);
    const offset = env.locals.get(this.name);
    if (offset) {
      emit(` str r0, [fp, #${offset}]`);
    } else {
      throw Error(`Undefined variable: ${this.name}`);
    }
  }
  equals(other: AST): boolean {
    return (
      other instanceof Assign &&
      this.name === other.name &&
      this.value.equals(other.value)
    );
  }
}

export class While implements AST {
  constructor(public conditional: AST, public body: AST) {}
  emit(env: Environment) {
    let loopStart = new Label();
    let loopEnd = new Label();
    emit(`${loopStart}:`);
    this.conditional.emit(env);
    emit(` cmp r0, #0`);
    emit(` beq ${loopEnd}`);
    this.body.emit(env);
    emit(` b ${loopStart}`);
    emit(`${loopEnd}:`);
  }
  equals(other: AST): boolean {
    return (
      other instanceof While &&
      this.conditional.equals(other.conditional) &&
      this.body.equals(other.body)
    );
  }
}

/* Chapter 5
 *
 */
export interface Parser<T> {
  parse(source: Source): ParseResult<T> | null;
}

export class Source {
  constructor(public string: string, public index: number) {}
  match(regexp: RegExp): ParseResult<string> | null {
    console.assert(regexp.sticky);
    regexp.lastIndex = this.index;
    const match = this.string.match(regexp);
    if (match) {
      const value = match[0];
      const newIndex = this.index + value.length;
      const source = new Source(this.string, newIndex);
      return new ParseResult(value, source);
    }
    return null;
  }
}

export class ParseResult<T> {
  constructor(public value: T, public source: Source) {}
}

export class Parser<T> {
  constructor(public parse: (s: Source) => ParseResult<T> | null) {}
  static regexp(regexp: RegExp): Parser<string> {
    return new Parser((source) => source.match(regexp));
  }
  static constant<U>(value: U): Parser<U> {
    return new Parser((source) => new ParseResult(value, source));
  }
  static error<U>(message: string): Parser<U> {
    return new Parser((_) => {
      throw Error(message);
    });
  }
  or(parser: Parser<T>): Parser<T> {
    return new Parser((source) => {
      const result = this.parse(source);
      if (result) return result;
      else return parser.parse(source);
    });
  }
  static zeroOrMore<U>(parser: Parser<U>): Parser<Array<U>> {
    return new Parser((source) => {
      const results = [];
      let item;
      while ((item = parser.parse(source))) {
        source = item.source;
        results.push(item.value);
      }
      return new ParseResult(results, source);
    });
  }
  bind<U>(callback: (value: T) => Parser<U>): Parser<U> {
    return new Parser((source) => {
      const result = this.parse(source);
      if (result) {
        const value = result.value;
        const source = result.source;
        return callback(value).parse(source);
      } else {
        return null;
      }
    });
  }
  and<U>(parser: Parser<U>): Parser<U> {
    return this.bind((_) => parser);
  }
  map<U>(callback: (t: T) => U): Parser<U> {
    return this.bind((value) => Parser.constant(callback(value)));
  }
  static maybe<U>(parser: Parser<U | null>): Parser<U | null> {
    return parser.or(Parser.constant(null));
  }
  parseStringToCompletion(s: string): T {
    const source = new Source(s, 0);
    const result = this.parse(source);
    if (!result) throw Error('Parse error at index 0');
    const index = result.source.index;
    if (index != result.source.string.length)
      throw Error('Parse error at index ' + index);
    return result.value;
  }
}

// const source = new Source("hello1 bye2", 0);
// const result = Parser.regexp(/hello[0-9]/y).parse(source);
//
// console.assert(result!.value === "hello1");
// console.assert(result!.source.index === 6);

/*
 *
 * Chapter 6
 */
const { regexp, zeroOrMore, constant, bind, maybe } = Parser;

const whitespace = regexp(/[ \n\r\t]+/y);
const comments = regexp(/[/][/].*/y).or(regexp(/[/][*].*[*][/]/sy));
const ignored = zeroOrMore(whitespace.or(comments));

const token = (pattern: RegExp) =>
  regexp(pattern).bind((value) => ignored.and(constant(value)));

const FUNCTION = token(/function\b/y);
const IF = token(/if\b/y);
const ELSE = token(/else\b/y);
const RETURN = token(/return\b/y);
const VAR = token(/var\b/y);
const WHILE = token(/while\b/y);

const COMMA = token(/[,]/y);
const SEMICOLON = token(/;/y);
const LEFT_PAREN = token(/[(]/y);
const RIGHT_PAREN = token(/[)]/y);
const LEFT_BRACE = token(/[{]/y);
const RIGHT_BRACE = token(/[}]/y);

const NUMBER = token(/[0-9]+/y).map((digits) => new Number(parseInt(digits)));

const ID = token(/[a-zA-Z_][a-zA-Z0-9_]*/y);
const id = ID.map((x) => new Id(x));
const NOT = token(/!/y).map((_) => Not);
const EQUAL = token(/==/y).map((_) => Equal);
const NOT_EQUAL = token(/!=/y).map((_) => NotEqual);
const PLUS = token(/[+]/y).map((_) => Add);
const MINUS = token(/[-]/y).map((_) => Subtract);
const STAR = token(/[*]/y).map((_) => Multiply);
const SLASH = token(/[/]/y).map((_) => Divide);
const ASSIGN = token(/=/y).map((_) => Assign);

const expression: Parser<AST> = Parser.error(
  'expression parser used before definition'
);

const args: Parser<Array<AST>> = expression
  .bind((arg) =>
    zeroOrMore(COMMA.and(expression)).bind((args) => constant([arg, ...args]))
  )
  .or(constant([]));

const call: Parser<AST> = ID.bind((callee) =>
  LEFT_PAREN.and(
    args.bind((args) =>
      RIGHT_PAREN.and(
        constant(
          callee === 'assert' ? new Assert(args[0]) : new Call(callee, args)
        )
      )
    )
  )
);

const atom: Parser<AST> = call
  .or(id)
  .or(NUMBER)
  .or(LEFT_PAREN.and(expression).bind((e) => RIGHT_PAREN.and(constant(e))));

const unary: Parser<AST> = maybe(NOT).bind((not) =>
  atom.map((term) => (not ? new Not(term) : term))
);

const infix = function (operatorParser: any, termParser: any) {
  return termParser.bind((term: any) =>
    zeroOrMore(
      operatorParser.bind((operator: any) =>
        termParser.bind((term: any) => constant({ operator, term }))
      )
    ).map((operatorTerms: any) =>
      operatorTerms.reduce(
        (left: any, { operator, term }: any) => new operator(left, term),
        term
      )
    )
  );
};

// product <- unary ((STAR / SLASH) unary)*
const product = infix(STAR.or(SLASH), unary);
// sum <- product ((PLUS / MINUS) product)*
const sum = infix(PLUS.or(MINUS), product);
// comparison <- sum ((EQUAL / NOT_EQUAL) sum)*
const comparison = infix(EQUAL.or(NOT_EQUAL), sum);

expression.parse = comparison.parse;

const statement: Parser<AST> = Parser.error(
  'statement parser used before definition'
);

const returnStatement: Parser<AST> = RETURN.and(expression).bind((term) =>
  SEMICOLON.and(constant(new Return(term)))
);

const expressionStatement: Parser<AST> = expression.bind((term) =>
  SEMICOLON.and(constant(term))
);

const ifStatement: Parser<AST> = IF.and(LEFT_PAREN)
  .and(expression)
  .bind((conditional) =>
    RIGHT_PAREN.and(statement).bind((consequence) =>
      ELSE.and(statement).bind((alternative) =>
        constant(new If(conditional, consequence, alternative))
      )
    )
  );

const whileStatement: Parser<AST> = WHILE.and(LEFT_PAREN)
  .and(expression)
  .bind((conditional) =>
    RIGHT_PAREN.and(statement).bind((body) =>
      constant(new While(conditional, body))
    )
  );

const varStatement: Parser<AST> = VAR.and(ID).bind((name) =>
  ASSIGN.and(expression).bind((value) =>
    SEMICOLON.and(constant(new Var(name, value)))
  )
);

const assignmentStatement: Parser<AST> = ID.bind((name) =>
  ASSIGN.and(expression).bind((value) =>
    SEMICOLON.and(constant(new Assign(name, value)))
  )
);

const blockStatement: Parser<AST> = LEFT_BRACE.and(zeroOrMore(statement)).bind(
  (statements) => RIGHT_BRACE.and(constant(new Block(statements)))
);

const parameters: Parser<Array<string>> = ID.bind((param) =>
  zeroOrMore(COMMA.and(ID)).bind((params) => constant([param, ...params]))
).or(constant([]));

const functionStatement: Parser<AST> = FUNCTION.and(ID).bind((name) =>
  LEFT_PAREN.and(parameters).bind((parameters) =>
    RIGHT_PAREN.and(blockStatement).bind((block) =>
      constant(new Function(name, parameters, block))
    )
  )
);

const statementParser: Parser<AST> = returnStatement
  .or(functionStatement)
  .or(ifStatement)
  .or(whileStatement)
  .or(varStatement)
  .or(assignmentStatement)
  .or(blockStatement)
  .or(expressionStatement);

statement.parse = statementParser.parse;

export const parser: Parser<AST> = ignored
  .and(zeroOrMore(statement))
  .map((statements) => new Block(statements));

/*
 * Chapter 8
 */

export class Main implements AST {
  constructor(public statements: Array<AST>) {}
  emit(env: Environment) {
    emit(`.global main`);
    emit(`main:`);
    emit(` push {fp, lr}`);
    this.statements.forEach((statement) => statement.emit(env));
    emit(` mov r0, #0`);
    emit(` pop {fp, pc}`);
  }

  equals(other: AST): boolean {
    return other instanceof Main && this.statements == other.statements;
  }
}

export class Assert implements AST {
  constructor(public condition: AST) {}
  emit(env: Environment) {
    this.condition.emit(env);
    emit(` cmp r0, #1`);
    emit(` moveq r0, #'.'`);
    emit(` movne r0, #'F'`);
    emit(` bl putchar`);
  }
  equals(other: AST): boolean {
    return other instanceof Assert && this.condition == other.condition;
  }
}

export class Label {
  static counter = 0;
  value: number;
  constructor() {
    this.value = Label.counter++;
  }
  toString() {
    return `.L${this.value}`;
  }
}

export class Environment {
  constructor(
    public locals: Map<string, number>,
    public nextLocalOffset: number
  ) {}
}
