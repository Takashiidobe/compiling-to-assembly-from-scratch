import * as Parser from './lib/compiler';

const {
  Number,
  Main,
  parser,
  Block,
  Var,
  While,
  NotEqual,
  Assign,
  Return,
  Id,
  Multiply,
  Subtract,
  Function,
  Environment,
} = Parser;

const environment = new Environment(new Map(), 0);

const source = `
 function addAssign(n) {
   n += 10;
   return n;
 }
 `;

parser.parseStringToCompletion(source).emit(environment);
