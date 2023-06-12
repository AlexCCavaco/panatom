const _parser = require('./parser');
const {updateStateIndex, updateState} = require("./parser");
const { isEOF } = _parser;
let { failure,success } = _parser;

let string = str=>{
    let length = str.length;
    return _parser((state)=>{
        let nextState = updateStateIndex(state,state.index+length);
        let testStr = state.input.substring(state.index,nextState.index);
        if(isEOF(nextState)) return failure(state,str);
        if(testStr!==str) return failure(state,str);
        return success(nextState, testStr);
    });
}

let istring = str=>{
    let length = str.length;
    return _parser((state)=>{
        let nextState = updateStateIndex(state,state.index+length);
        let testStr = state.input.substring(state.index,nextState.index);
        if(isEOF(nextState)) return failure(state,str);
        if(testStr.toLowerCase()!==str.toLowerCase()) return failure(state,str);
        return success(nextState, testStr);
    });
}

let regexp = (regexp,returnAll=false)=>{
    let nRegexp = RegExp("^(?:" + regexp.source + ")", regexp.flags);
    return _parser((state)=>{
        let testStr = state.input.substring(state.index);
        let matches = testStr.match(nRegexp);
        let nextState = updateStateIndex(state,state.index+(matches?matches[0].length:0));
        if(isEOF(nextState)) return failure(state,regexp.toString());
        if(!matches) return failure(state,regexp.toString());
        matches = Array.from(matches);
        if(!matches) return failure(state,regexp.toString());
        let full = matches[0];
        matches.shift();
        let res = returnAll ? matches : full;
        return success(nextState, res);
    });
}

let coalesce = (...parsers)=>{
    return _parser((state)=>{
        let errors = [];
        for(let iparcel of parsers){
            let lastState = iparcel.call(state);
            if(lastState.status) return lastState;
            errors.push(lastState.error);
        }
        return failure(state,errors.join(', '));
    });
};

let opt = (iparser)=>{
    return _parser((state)=>{
        let lastState = iparser.call(state);
        if(lastState.status) return lastState;
        return success(state,null);
    });
};

let chain = (parsers)=>{
    return _parser((state)=>{
        let lastState = state;
        let results = [];
        for(let iparcel of parsers){
            lastState = iparcel.call(lastState);
            if(!lastState.status) return lastState;
            if(lastState.result!==undefined) results.push(lastState.result);
        }
        return success(lastState,results);
    });
};
let chainMap = (parsers,call)=>{
    return _parser(state=>{
        let nextState = chain(parsers).call(state);
        if(!nextState.status) return nextState;
        return success(nextState,call(...nextState.result));
    });
}

let seperator = (parser,separator)=>{
    if(typeof seperator==='string') separator = string(separator);
    return _parser((state)=>{
        let nextState = state;
        while(true){
            let index = nextState.index;
            nextState = parser.callFunc(nextState);
            if(!nextState.status) return nextState;
            if(index===nextState.index) failure(nextState,'Seperator Parser is not progressing, this can lead to infinite loops and was blocked');
            let sepState = separator.callFunc(nextState);
            if(!sepState.status) break;
            nextState = sepState;
        }
    });
};

let many = (parser)=>limit(parser,0,Number.MAX_SAFE_INTEGER);
let manyOne = (parser)=>atLeast(parser,1);
let atLeast = (parser,num)=>limit(parser,num,Number.MAX_SAFE_INTEGER);
let atMost = (parser,num)=>limit(parser,0,num);
let limit = (parser,min,max)=>{
    return _parser((state)=>{
        let nextState = state;
        let results = [];
        for(let i = 0; i < max; i++){
            let index = nextState.index;
            let inState = parser.callFunc(nextState);
            if(!inState.status) return i<min ? failure(inState,'Parser failed before minimum limit of '+min+' was reached') : nextState;
            if(index===inState.index) failure(inState,'Limited Parser is not progressing, this can lead to infinite loops and was blocked');
            results.push(inState.result);
            nextState = inState;
        }
        return success(nextState,results);
    });
};

let eof = _parser((state)=>{
    if(isEOF(state)) return success(state, null);
    return failure(state, "EOF");
});

let digit = regexp(/[0-9]/).as('Digit');
let digits = regexp(/[0-9]*/).as("Digits");
let letter = regexp(/[a-z]/i).as("Letter");
let letters = regexp(/[a-z]*/i).as("Letters");
let alphanumeric = regexp(/[0-9a-z]*/i).as("Alphanumeric");
let text = regexp(/\w*/iu).as("Text");
let optWhitespace = regexp(/\s*/).as("Optional Whitespace");
let whitespace = regexp(/\s+/).as("Whitespace");
let cr = string("\r");
let lf = string("\n");
let crlf = string("\r\n");
let newline = coalesce(crlf, lf, cr).as("Newline");
let end = coalesce(newline, eof);

let nullVal = string("null").result(null).as("Null");
let trueVal = string("true").result(true).as("True");
let falseVal = string("false").result(false).as("False");
let boolean = coalesce(trueVal,falseVal).as("Boolean");

let integer = digits.map(parseInt).as("Integer");
let float = integer.or(chainMap(integer.skip(string('.')),integer,(i1,i2)=>`${i1}.${i2}`)).map(parseFloat).as("Float Number");
let number = chainMap(opt(string('-')),coalesce(integer,float)).map(Number).as("Number");

panatom = _parser;
// parsers
panatom.istring = istring;
panatom.string = string;
panatom.regexp = regexp;
panatom.opt = opt;
panatom.coalesce = coalesce;
panatom.chain = chain;
panatom.chainMap = chainMap;
panatom.seperator = seperator;
panatom.many = many;
panatom.manyOne = manyOne;
panatom.atLeast = atLeast;
panatom.atMost = atMost;
panatom.limit = limit;
// definitions
panatom.eof = eof;
panatom.digit = digit;
panatom.digits = digits;
panatom.letter = letter;
panatom.letters = letters;
panatom.alphanumeric = alphanumeric;
panatom.text = text;
panatom.optWhitespace = optWhitespace;
panatom.whitespace = whitespace;
panatom.cr = cr;
panatom.lf = lf;
panatom.crlf = crlf;
panatom.newline = newline;
panatom.nullVal = nullVal;
panatom.trueVal = trueVal;
panatom.falseVal = falseVal;
panatom.boolean = boolean;
panatom.number = number;
panatom.integer = integer;
panatom.float = float;

module.exports = panatom;
