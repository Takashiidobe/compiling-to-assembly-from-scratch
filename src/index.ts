import * as Parser from './lib/compiler';

const { parser, Environment } = Parser;

const environment = new Environment(new Map(), 0);

const source = `
 function main() {
   var n = 20;
   n += 10;
   n -= 10;
   return n;
 }
 `;

parser.parseStringToCompletion(source).emit(environment);
