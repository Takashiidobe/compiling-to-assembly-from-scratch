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
} = Parser;

const source = `
 function factorial(n) {
 var result = 1;
 while (n != 1) {
 result = result * n;
 n = n - 1;
 }
 return result;
 }
 `;

const expected = new Block([
  new Function(
    'factorial',
    ['n'],
    new Block([
      new Var('result', new Number(1)),
      new While(
        new NotEqual(new Id('n'), new Number(1)),
        new Block([
          new Assign('result', new Multiply(new Id('result'), new Id('n'))),
          new Assign('n', new Subtract(new Id('n'), new Number(1))),
        ])
      ),
      new Return(new Id('result')),
    ])
  ),
]);
const result = parser.parseStringToCompletion(source);
result.emit();

// parser
//   .parseStringToCompletion(
//     `
// function main() {
//   return 10;
// }
// `
//   )
//   .emit();
