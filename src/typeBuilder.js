import _ from 'lodash';

var clonedMembers = [
    'validate', 'validateType', 'allowPlainVal', 'isAssignableFrom',
    'withDefault', 'wrapValue', 'create', 'defaults', 'options', '_spec'
];

function cloneType(Type) {
    function ClonedType(value, options) {
        return new ClonedType.type(value, ClonedType.options || options);
    }
    clonedMembers.forEach(member => ClonedType[member] = Type[member]);
    ClonedType.type = Type;
    return ClonedType;
}

export function withDefault(defaults, validate, options) {
    var NewType = cloneType(this.type || this);
    if(validate) {
        NewType.validate = validate;
    }
    NewType.options = options || this.options;
    if(defaults !== undefined) {
        if(defaults === null) {
            var isNullable = NewType.options && NewType.options.nullable;
            if(isNullable) {
                NewType.defaults = () => null;
            } else {
                throw 'Cannot assign null value to a type which is not defined as nullable.';
            }
        } else if(_.isFunction(defaults)) {
            NewType.defaults = () => defaults;
        } else {
            NewType.defaults = () => _.cloneDeep(defaults);
        }
    }
    return NewType;
}

export function nullable() {
    var NullableType = cloneType(this.type || this);
    NullableType.options = NullableType.options || {};
    NullableType.options.nullable = true;
    return NullableType;
}