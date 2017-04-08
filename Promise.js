const PENDING = 0, FULFILLED = 1, REJECTED = 2;
function isFunction( obj ) {
    return typeof obj === 'function';
}
function isThenable( obj ) {
    return obj && isFunction( obj.then );
}
function checkArray( obj ) {
    if ( !Array.isArray( obj ) ) {
        throw new TypeError( `${obj} is not array` );
    }
}
function resolve( value ) {
    if ( this._status !== PENDING ) { return; }
    this._value  = value;
    this._status = FULFILLED;
    let fn;
    while ( fn = this._resolves.shift() ) {
        fn.call( this, value );
    }
}
function reject( reason ) {
    if ( this._status !== PENDING ) { return; }
    this._value  = reason;
    this._status = REJECTED;
    let fn;
    while ( fn = this._rejects.shift() ) {
        fn.call( this, reason );
    }
}
function Promise( executor ) {
    if ( !isFunction( executor ) ) {
        throw new TypeError( `Promise arguments error: ` + executor.toString() );
    }
    this._status   = PENDING;
    this._resolves = [];
    this._rejects  = [];
    this._value    = undefined;
    executor( resolve.bind( this ), reject.bind( this ) );
}
function resolveWrapper( res, rej, tRes ) {
    return ( value ) => {
        if ( !isFunction( tRes ) ) {
            return res( value );
        }
        try {
            let ret = tRes( value );
            if ( isThenable( ret ) ) {
                ret.then( res, rej );
            } else {
                res( ret );
            }
        } catch ( e ) {
            rej( e );
        }
    };
}
function rejectWrapper( res, rej, tRej ) {
    return ( value ) => {
        if ( !isFunction( tRej ) ) {
            return res( value );
        }
        try {
            let ret = tRej( value );
            if ( isThenable( ret ) ) {
                ret.then( value );
            } else {
                res( value );
            }
        } catch ( e ) {
            rej( e );
        }
    };
}
function thenHandler( res, rej, tRes, tRej, p ) {
    let s = resolveWrapper( res, rej, tRes );
    let j = rejectWrapper( res, rej, tRej );
    switch ( p._status ) {
        case PENDING:
            p._resolves.push( s );
            p._rejects.push( j );
            break;
        case FULFILLED:
            s( p._value );
            break;
        case REJECTED:
            j( p._value );
            break;
        default:
            throw new Error( `Invalid status: ${p._status}` );
    }
}
Promise.prototype.then  = function( tRes, tRej ) {
    let p = this;
    return new Promise( ( res, rej ) => thenHandler( res, rej, tRes, tRej, p ) );
};
Promise.prototype.catch = function( reason ) {
    return this.then( null, reason );
};
Promise.resolve         = ( value ) => new Promise( ( res, _ ) => res( value ) );
Promise.reject          = ( reason ) => new Promise( ( _, rej ) => rej( reason ) );
function handleAll( promises, resolve, reject ) {
    let count  = promises.length;
    let result = [];

    function handle( i ) {
        return function( value ) {
            result[ i ] = value;
            if ( --count == 0 ) {
                resolve( result );
            }
        }
    }

    promises.forEach( ( p, i ) => p.then( handle( i ), reject ) );
}
Promise.all  = function( promises ) {
    checkArray( promises );
    return new Promise( ( res, rej ) => handleAll( promises, res, rej ) );
};
Promise.race = function( promises ) {
    checkArray( promises );
    return new Promise( ( res, rej ) => promises.forEach( ( p ) => p.then( res, rej ) ) );
};