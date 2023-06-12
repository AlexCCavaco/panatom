
type ParserState = {
    input: string,
    result: any,
    index: number,
    status: boolean,
    error: string|null,
};
type Parser = {
    run: (input:string)=>ParserState,
    call: (state:ParserState)=>ParserState,
    map: (call:(data:any)=>{})=>Parser,
    result: (value:any)=>Parser,
    or: (parser:Parser)=>Parser,
    then: (parser:Parser)=>Parser,
    between: (beforeParser:Parser,afterParser:Parser)=>Parser,
    not: (parser:Parser)=>Parser,
    seperator: (parser:Parser)=>Parser,
    many: ()=>Parser,
    limit: (min:number,max:number)=>Parser,
    atLeast: (num:number)=>Parser,
    atMost: (num:number)=>Parser,
    trim: (parser:Parser)=>Parser,
    skip: (parser:Parser)=>Parser,
    skipOpt: (parser:Parser)=>Parser,
    opt: ()=>Parser,
    ignore: ()=>Parser,
    followedBy: (parser:Parser)=>Parser,
    notFollowedBy: (parser:Parser)=>Parser,
    as: (message:string)=>Parser,
    log: (prefix?:string)=>Parser,
};

export default function(call:(ParserState)=>ParserState):Parser;

/*/———/ PARSERS /———/*/
export function istring(str:string):Parser;
export function string(str:string):Parser;
export function regexp(regexp:RegExp):Parser;//
export function opt(iparser:Parser):Parser;//
export function coalesce(...parsers:Parser[]):Parser;//
export function chain(parsers:Parser[]):Parser;//
export function chainMap(parsers:Parser[],mapCall:(...data:any[])=>{}):Parser;//
export function seperator(iparser:Parser,seperator:Parser|string):Parser;//
export function many(iparser:Parser):Parser;//
export function manyOne(iparser:Parser):Parser;//
export function atLeast(iparser:Parser,num:number):Parser;//
export function atMost(iparser:Parser,num:number):Parser;//
export function limit(iparser:Parser,min:number,max:number):Parser;//

/*/———/ DEFINITIONS /———/*/
export let eof:Parser;
export let digit:Parser;
export let digits:Parser;
export let letter:Parser;
export let letters:Parser;
export let alphanumeric:Parser;
export let text:Parser;
export let optWhitespace:Parser;
export let whitespace:Parser;
export let cr:Parser;
export let lf:Parser;
export let crlf:Parser;
export let newline:Parser;
export let nullVal:Parser;
export let trueVal:Parser;
export let falseVal:Parser;
export let boolean:Parser;
export let number:Parser;
export let integer:Parser;
export let float:Parser;
