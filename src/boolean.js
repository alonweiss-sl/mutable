import {generateWithDefaultForSysImmutable} from "./defineTypeUtils"
import PrimitiveBase from "./PrimitiveBase"



export default class _Boolean extends PrimitiveBase{

    static defaults(){ return false; }

    static validate(v){ return typeof v === 'boolean'; }

    static validateType(value) {
        return this.validate(value);
    }

    constructor(value){
        return Boolean(value);
    }

}

_Boolean.type = _Boolean;
_Boolean.create = Boolean;
_Boolean.withDefault = generateWithDefaultForSysImmutable(Boolean);