
let createState = (input,result=null,index=0,status=true)=>({ input, result, index, status, error:null });
let updateState = (state,upData)=>({ ...(state??{}), ...upData });
let updateStateIndex = (state,index)=>({ ...(state??{}), index });
let isEOF = (state)=>(state.index > state.input.length);

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
        let state = createState(input);
        return this.callFunc(state);
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

    seperator(parser){
        return new Parser((state)=>{
            let nextState = state;
            while(true){
                let index = nextState.index;
                let inState = this.callFunc(nextState);
                if(!inState.status) return nextState;
                if(index===inState.index) failure(inState,'Seperator Parser is not progressing, this can lead to infinite loops and was blocked');
                nextState = inState;
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
    skipOpt(parser){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            let inState = parser.call(nextState);
            if(!inState.status) return nextState;
            return updateStateIndex(nextState,inState.index);
        });
    }

    opt(){
        return new Parser(state=>{
            let nextState = this.callFunc(state);
            if(!nextState.status) return success(state,nextState.index,null);
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

}

module.exports = (call)=>(new Parser(call));
module.exports.failure = failure;
module.exports.success = success;
module.exports.createState = createState;
module.exports.updateState = updateState;
module.exports.updateStateIndex = updateStateIndex;
module.exports.isEOF = isEOF;
