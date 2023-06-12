
let createState = (input,result=null,index=0,status=true)=>({ input, result, index, status, error:null });
let updateState = (state,upData)=>({ ...(state??{}), ...upData });
let updateStateIndex = (state,index)=>({ ...(state??{}), index });
let isEOF = (state)=>(state.index > state.input.length);

let createError = (state)=>{
    let strArr = state.input.split(/\n\r|\n|\r/);
    let arrLen = strArr.length;
    let rowPos = state.input.substring(0,state.index).split(/\n\r|\n|\r/).length;
    let errStr = '';
    let forFun = (i)=>(arrLen < 10 ? i : (arrLen < 100 ? (i < 10 ? ' '+i : i) : (i < 10 ? '  '+i : (i < 100 ? ' '+i : i))));
    let totLen = 0;
    for(let i = 0; i < strArr.length; i++){
        let row = strArr[i];
        errStr += forFun(i) + ' | ' + row.replaceAll('\t','  ') + '\n';
        if(rowPos===i+1){
            let rLoc = state.index - totLen - 1;
            let spaced = (row.substring(0,rLoc).split('\t').length-1);
            errStr += (arrLen < 10 ? ' ' : (arrLen < 100 ? '  ' : '   ')) + ' | ' + ' '.repeat(rLoc + spaced) + '^\n';
        }
        totLen+= row.length;
    }
    return new Error(`\n————— PARSING ERROR —————————————————————————\n\n${errStr}\nExpected: ${state.error}\n`);
};

let failure = (state, indexOrError, error='')=>{
    let res = { status:false };
    if(typeof indexOrError === 'string') error = indexOrError;
    else res.index = indexOrError;
    res.error = error;
    return updateState(state,res);
}
let success = (state, indexOrData, data='$uNf_')=>{
    let res = { status:true };
    if(data==='$uNf_') data = indexOrData;
    else res.index = indexOrData;
    res.result = data;
    return updateState(state,res);
}

class Parser {

    callFunc;

    constructor(call){
        this.callFunc = call;
    }

    run(input){
        let state = this.callFunc(createState(input));
        if(state.status) return state.result;
        throw createError(state);
    }

    call(state){
        if(!state.status) return state;
        return this.callFunc(state);
    }

    map(call){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            if(!nextState.status) return nextState;
            return success(nextState,call(nextState.result));
        });
    }
    result(value){
        return this.map(()=>value);
    }

    or(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            if(nextState.status) return nextState;
            return parser.call(state);
        });
    }
    then(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            return parser.call(nextState);
        });
    }
    between(beforeParser,afterParser){
        return beforeParser.then(this).skip(afterParser);
    }

    not(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            if(!nextState.status) return nextState;
            let notState = parser.call(state);
            if(notState.status) return failure(notState,'Parser expected not to match')
            return nextState;
        });
    }

    seperator(parser){
        return new Parser((state)=>{
            let nextState = state;
            while(true){
                let index = nextState.index;
                let inState = this.callFunc(nextState);
                if(!inState.status) return nextState;
                if(index===inState.index) failure(inState,'Seperator Parser is not progressing, this can lead to infinite loops and was blocked');
                nextState = parser.call(inState);
                if(!nextState.status) return nextState;
            }
        });
    }

    many(){
        return new Parser((state)=>{
            let nextState = state;
            while(true){
                let index = nextState.index;
                let inState = this.callFunc(nextState);
                if(!inState.status) return nextState;
                if(index===inState.index) failure(inState,'Many Parser is not progressing, this can lead to infinite loops and was blocked');
                nextState = inState;
            }
        });
    }
    limit(min,max){
        return new Parser((state)=>{
            let nextState = state;
            let i = 0;
            while(i < max){
                let index = nextState.index;
                let inState = this.callFunc(nextState);
                if(!inState.status) return i<min ? failure(inState,'Parser failed before minimum limit of '+min+' was reached') : nextState;
                nextState = inState;
                i++;
            }
        });
    }
    atLeast(num){
        return new Parser((state)=>{
            let nextState = state;
            let i = 0;
            while(true){
                let index = nextState.index;
                let inState = this.callFunc(nextState);
                if(!inState.status) return i<num ? failure(inState,'Parser failed before minimum limit of '+num+' was reached') : nextState;
                if(index===inState.index) failure(inState,'At Least Parser is not progressing, this can lead to infinite loops and was blocked');
                nextState = inState;
                i++;
            }
        });
    }
    atMost(num){
        return new Parser((state)=>{
            let nextState = state;
            let i = 0;
            while(i < num){
                let index = nextState.index;
                let inState = this.callFunc(nextState);
                if(!inState.status) return nextState;
                nextState = inState;
                i++;
            }
        });
    }

    trim(parser){
        return parser.then(this).skip(parser);
    }

    skip(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            let inState = parser.call(nextState);
            if(!inState.status) return inState;
            return updateStateIndex(nextState,inState.index);
        });
    }

    opt(){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            if(!nextState.status) return success(state,null);
            return nextState;
        });
    }
    ignore(){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            if(nextState.status) return success(nextState,undefined);
            return nextState;
        });
    }

    followedBy(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            let followState = parser.call(nextState);
            if(!followState.status) return followState;
            return nextState;
        });
    }
    notFollowedBy(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            let followState = parser.call(nextState);
            if(followState.status) return failure(followState,'Following input is expected to be different');
            return nextState;
        });
    }

    as(message){
        return new Parser((state)=>{
            let nextState = this.callFunc(state);
            if(nextState.status) return nextState;
            return failure(nextState,message);
        });
    }

    log(prefix=null){
        return new Parser((state)=>{
            let nextState = this.callFunc(state);
            if(nextState.status) console.log('\n— ' + (prefix??'') + ' —————\n', nextState.result);
            else console.error('\n— ' + (prefix??'') + ' —————\n', createError(nextState));
            return nextState;
        });
    }

}

module.exports = (call)=>(new Parser(call));
module.exports.failure = failure;
module.exports.success = success;
module.exports.createState = createState;
module.exports.updateState = updateState;
module.exports.updateStateIndex = updateStateIndex;
module.exports.isEOF = isEOF;
