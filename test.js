/*
  test.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ./LICENSE

  Contact: glat@glat.info
*/

/*global test async_test*/


function create_pseudo_random_arr( /*?integer?*/n )
{
    n != null  ||  (n  = 10000)

    var arr  = new Array(n)
    ,   drop = 0.1 // Proportion of numbers to drop
    ;
    
    // Deterministic pseudo-random numbers to make sure
    // arr is always generated the same way.
    // http://stackoverflow.com/questions/521295/javascript-random-seeds
    var seed = 1;
    
    for (var i = n; i--;)
        arr[i] = { p: random() < drop ? null : i };
    
    return arr;

    function random()
    {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
} 

function test()
{
    console.time( 'transfun:test' );
    
    var sum_local = tfun.reduce( '+' )
    ,  mean = sum_local.next( '/n' ) // after an array loop that conserves the length (e.g. no filtering), the value of `n` is available
    ,  prod = tfun.reduce( '*' )
    , geommean = tfun.map( 'Math.log(v)' ).next( sum_local ).next( 'Math.exp(current/n)' )  // Only for positive numbers
    ;

    10 === sum_local( [ 1, 2, 3, 4 ] )  ||  null.bug;
    3*5*7 === prod( [ 1, 3, 5, 7 ] )  ||  null.bug;
    
    (1+3+10+20)/4 === mean( [ 1, 3, 10, 20 ] )  ||  null.bug;
    1e-10 > Math.abs( Math.pow(1*3*5*11*17,1/5) - geommean( [ 1, 3, 5, 11, 17 ] ))  ||  null.bug;


    // Using the publicly declared `sum`. Note the *transfun* `sum`
    // has arity 0, so in the *appfun* is in global namespace.
    
    10 === tfun.sum( [ 1, 2, 3, 4 ] )  ||  null.bug;
    
    var geommean2 = tfun.map( 'Math.log(v)' ).sum().next( 'Math.exp(current/n)' )  // Only for positive numbers

    1e-10 > Math.abs( Math.pow(1*3*5*11*17,1/5) - geommean( [ 1, 3, 5, 11, 17 ] ))  ||  null.bug;



    [ 1, 3, 4, 7 ].map( function (x) { return x*2; } ).join( '#' )
        === tfun.map( '*2' ).join( '"#"' )( [ 1, 3, 4, 7 ] )  ||  null.bug
    ;
    
    [ 1, 3, 4, 7 ].map( function (x) { return x*2; } ).join( '#' )
        === tval( [ 1, 3, 4, 7 ] )( tfun.map( '*2' ).join( '"#"' ) )  ||  null.bug
    ;
    
    

    var corrupt_arr = [ { age : 12 }, { age: 91 }, null, { age : 43 }, undefined, { age : 23 }, { age : 32 }, undefined ]

    ,   age_clean = corrupt_arr
        .filter( function ( o ) { return o != null; } )
        .map( function ( o ) { return o.age; } )

    ,   age_sum   = age_clean.reduce( function ( a, b ) { return a+b; } )

    ,   age_mean  = age_sum / age_clean.length
    ;
    (age_mean  ||  null).toPrecision.call.a;

    oEquals( age_clean, tfun.filter( '!=null' ).map( '.age' )( corrupt_arr ) )  ||  null.bug;

    age_mean === tval(
        corrupt_arr
    )(
        // filter( '!=null' ) may change the length of the array so we need to _count.
        tfun.decl( '_count', '0' ).filter( '!=null' ).map( '.age' ).redinit( '0', '_count++, out+v' ).next( '/_count' )
    )  ||  null.bug;


    var mapsafe = tfun.filter( '!=null' ).map();  // Partial transformation: needs one more argument to be complete

    oEquals( age_clean, tval( corrupt_arr )( mapsafe( '.age' ) ) )  ||  null.bug;

    var age_mean_appfun = tfun.decl( '_count', '0' )
        .next( mapsafe( '.age' ) )  // needs .next call because `mapsafe` has not been published
        .redinit( '0', '_count++, out+v' )
        .next( '/_count' )
    ;
    
    age_mean === tval( corrupt_arr )( age_mean_appfun )  ||  null.bug;

    0 === age_mean_appfun._tf_chainspec.extern_arr.length  ||  null.bug;


    console.log( age_mean_appfun._tf_dbg.code_body );
    

    var mapsafe_not_called = tfun.filter( '!=null' ).map;  // Partial transformation: needs one more argument to be complete

    oEquals( age_clean, tval( corrupt_arr )( mapsafe_not_called( '.age' ) ) )  ||  null.bug;

    var age_mean_appfun_2 = tfun.decl( '_count', '0' )
        .next( mapsafe_not_called( '.age' ) )  // needs .next call because `mapsafe_not_called` has not been published
        .redinit( '0', '_count++, out+v' )
        .next( '/_count' )
    ;
    
    age_mean === tval( corrupt_arr )( age_mean_appfun_2 )  ||  null.bug;
    age_mean === age_mean_appfun_2( corrupt_arr )  ||  null.bug;

    0 === age_mean_appfun_2._tf_chainspec.extern_arr.length  ||  null.bug;

    

    // shortcut variant

    var join = tfun( '#c', '.join(#c)' );
    age_clean.join( '$a$' ) === tval( age_clean )( join( '"$a$"' ) )
        ||  null.bug
    ;

    // object equivalent to the shortcut variant

    var join2 = tfun( {
        arity : 1
        , specgen : function ( c ) {
            return { stepadd : { set : [ 'current', 'current.join(' + c + ')' ] } };
        }
    });

    age_clean.join( '$a$' ) === tval( age_clean )( join2( '"$a$"' ) )
        ||  null.bug
    ;

    // without tval

    age_clean.join( '$a$' ) === join( '"$a$"' )( age_clean )
        ||  null.bug
    ;

    age_clean.join( '$a$' ) === join2( '"$a$"' )( age_clean )
        ||  null.bug
    ;

    // externs
    
    oEquals( age_clean, tfun.filter( function ( v ) { return v!=null; } ).map( '.age' )( corrupt_arr ) )  ||  null.bug;
    oEquals( age_clean, tfun.filter( '!=null' ).map( function ( v ) { return v.age; } )( corrupt_arr ) )  ||  null.bug;
    oEquals( age_clean, tval(
        corrupt_arr
    )(
        tfun.filter( function ( v ) { return v!=null; } )
            .map( function ( v ) { return v.age; } )
    ))
        ||  null.bug
    ;

    console.log( geommean._tf_dbg.code_body );

    var tmp = tfun.filter( '!=null' ).map( function ( v ) { return v.age; } );
    tmp( corrupt_arr );
    console.log( tmp._tf_dbg.code_body );        
    
    // other

    var    arr = [ 1, 4, 7, 10, 13, 16, 18 ]
    , obtained = tfun.filterRight( '%2' )( arr )
    , expected = [ 13, 7, 1 ]
    ;
    oEquals( expected, obtained )  ||  null.bug;

    //
    
    var    obj = { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 }
    , obtained = tfun.filterIn( '%2' )( obj )
    , expected = { a : 1, c : 7, e : 13 }
    ;
    JSON.stringify( expected ) === JSON.stringify( obtained )  ||  null.bug;

    //

    var    arr = [ 1, 4, 7, 10, 13, 16, 18 ]
    , obtained = tfun.reduceRight( '/' )( arr )
    , expected = 18 / 16 / 13 / 10 / 7 / 4 / 1
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //
    
    var    obj = { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 }
    , obtained = tfun.reduceIn( '+' )( obj )
    , expected = 1+4+7+10+13+16+18
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //

    var    arr = [ 1, 4, 7, 10, 13, 16, 18 ]
    , obtained = tfun.redinitRight( '1', '/' )( arr )
    , expected = 1 / 18 / 16 / 13 / 10 / 7 / 4 / 1
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //
    
    var    obj = { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 }
    , obtained = tfun.redinitIn( '-100', '+' )( obj )
    , expected = -100+1+4+7+10+13+16+18
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //

    true  === and( [] )  ||  null.bug;
    false === or( [] )   ||  null.bug;

    //

    'great' === tfun.and( [ 1, true, 2, 'great' ] )  ||  null.bug;
    1 === tfun.andRight( [ 1, true, 2, 'great' ] )  ||  null.bug;
    true  === !!tfun.andIn( { a: 1, b : 'great', c : true })  ||  null.bug;
    null  === tfun.andIn( { a: 1, b : 'great', d : null, c : true })  ||  null.bug;
    
    null === tfun.and( [ 1, true, 2, null, 'great' ] )  ||  null.bug;
    null === tfun.and( [ 1, true, 2, null, 'great', 0, 3, 'bcd' ] )  ||  null.bug;
    0 === tfun.andRight( [ 1, true, 2, null, 'great', 0, 3, 'bcd' ] )  ||  null.bug;
    
    true  === tval( [ 1, 4, 7, 10, 13, 16, 18 ] )( tfun.map( '>0' ).and() )  ||  null.bug;
    false === tval( [ 1, 4, -7, 10, 13, -16, 18 ] )( tfun.map( '>0' ).and() )  ||  null.bug;

    true  === tval( [ 1, 4, 7, 10, 13, 16, 18 ] )( tfun.map( '>0' ).andRight() )  ||  null.bug;
    false === tval( [ 1, 4, -7, 10, 13, -16, 18 ] )( tfun.map( '>0' ).andRight() )  ||  null.bug;

    true  === tval( { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 } )( tfun.mapIn( '>0' ).andIn() )  ||  null.bug;
    false === tval( { a: 1, b : 4, c : -7, d : 10, e : -13, f : 16, g : 18 })( tfun.mapIn( '>0' ).andIn() )  ||  null.bug;
    
    //

    'great' === tfun.or( [ 0, false, 'great', true, 2, null, 0 ] )  ||  null.bug;
    2 === tfun.orRight( [ 0, false, 'great', true, 2, null, 0 ] )  ||  null.bug;
    111   === tfun.orIn( { a: null, b : false, c : 111 })  ||  null.bug;
    false === !!tfun.orIn( { a: null, b : false, c : 0 })  ||  null.bug;
    null  === tfun.orIn( { a: null, b : null, d : null, c : null })  ||  null.bug;
    

    // Conversions

    oEquals( [ 1, 'xyz', null ], tfun.o2values({ a:1, b:'xyz', c:null }) )  ||  null.bug;
    
    oEquals( [ 'a', 'b', 'c'  ],         tfun.o2keys({ a:1, b:'xyz', c:null }) )  ||  null.bug;
    oEquals( { a:true, b:true, c:true }, tfun.keys2o([ 'a', 'b', 'c' ]) )  ||  null.bug;

    oEquals( [ ['c', null], ['a', 1], ['b', 'xyz'] ].sort(), tfun.o2kv({ a:1, b:'xyz', c:null }).sort() )  ||  null.bug
    oEquals( { a:1, b:'xyz', c:null }, tfun.kv2o([ ['b', 'xyz'], ['a', 1], ['c', null] ]) )   ||  null.bug;

    // `tfun.each` + various possibilities to pass a piece of code

    var s_in  = 'some/string*\"@cha\xEEne$de_caract\xE8res'
    ,   s_out = s_in.replace( /\W/g, '-' )
    ;
    s_out === 'some-string---cha-ne-de_caract-res'  ||  null.bug;
    s_out === tval( 'some/string*\"@cha\xEEne$de_caract\xE8res' )( tfun.split( '\"\"' ).map( 'v.match(/\\w/) ? v : \"-\"' ).join( '\"\"' ) )  ||  null.bug;
    s_out === tval( 'some/string*\"@cha\xEEne$de_caract\xE8res' )( tfun.split( '\"\"' ).each( 'if (!/\\w/.test(v)) current[k] = \"-\"' ).join( '\"\"' ) ) ||  null.bug;
    s_out === tval( 'some/string*\"@cha\xEEne$de_caract\xE8res' )( tfun.split( '\"\"' ).each( { 'if' : '!/\\w/.test(v)', then : 'current[k] = \"-\"' } ).join( '\"\"' ) )  ||  null.bug;
    s_out === tval( 'some/string*\"@cha\xEEne$de_caract\xE8res' )( tfun.split( '\"\"' ).each( { 'if' : '!/\\w/.test(v)', then : { set_at : [ 'current', 'k', '\"-\"' ] } } ).join( '\"\"' ) )  ||  null.bug;

    //

    "********" === tval( 'abcd\nefghijkl\nmnop' )( tfun.split( '"\\n"' ).redinit( '""', 'out.length > v.length ? out : v' ).next( '.replace( /[\\s\\S]/g, "*" )' ) )  ||  null.bug;
    
    //

    oEquals(
        { a : 531, b : 642 }
        , [ { a: 1, b : 2 }, { a: 500, b : 600 }, { a : 30, b : 40 } ]
            .reduce( function ( a, b ) { return tval.call( a, b )( tfun.mapIn( 'v+this[k]' ) ); } )
    )
        ||  null.bug
    ;

    oEquals(
        { a : 531, b : 642 }
        , tval( [ { a: 1, b : 2 }, { a: 500, b : 600 }, { a : 30, b : 40 } ] )
        ( tfun.reduce( '{ a : out.a + v.a, b : out.b + v.b}' ) )
    )
        ||  null.bug
    ;                                                                              
    
    oEquals(
        { a : 531, b : 642 }
        , tval( [ { a: 1, b : 2 }, { a: 500, b : 600 }, { a : 30, b : 40 } ] )
        ( tfun.declIn( { _a : '0', _b : '0' } ).each( '_a += v.a, _b += v.b' ).next( '{ a : _a, b : _b }' ) )
    )
        ||  null.bug
    ;                                                                              
    
    var     h0  = 'abc=123&xyz=456&def=qq'
    , expected  = 'abc=123&def=qq'
    , obtained  = tval( h0 )( tfun.split( '"&"' ).filter( '' ).map( '.split("=")').filter( 'v[0]!="xyz"' ).map( '.join("=")' ).join( '"&"') )
    , obtained2 = tval( h0 )( tfun.split( '"&"' ).filter( '.split("=")[0]!="xyz"' ).join( '"&"') )
    , obtained3 = tval( h0 )( tfun.split( '"&"' ).filter( '!/^xyz=/.test(v)' ).join( '"&"') )
    , obtained4 = h0.replace( /(?:^|&)xyz=[^&]*/g, '' )
    ;
    expected === obtained   ||  null.bug;
    expected === obtained2  ||  null.bug;
    expected === obtained3  ||  null.bug;
    expected === obtained4  ||  null.bug;

    // 
    
    console.timeEnd( 'transfun:test' );
    console.log( 'transfun:test: all tests passed.' );
}


// ----------------------------------------------------------------------

function after_async( callback )
{
    if (after_async.done_with_success)
        callback();
    else
        after_async.cb_arr.push( callback );
}
after_async.cb_arr = [];
after_async.ready = function ( success ) 
{ 
    if (success === true) 
    {
        after_async.done_with_success = true;

        while (after_async.cb_arr.length) 
            after_async.cb_arr.shift()(); 
    }
};

function async_run_test( detailnode, outnode )
{
    detailnode.innerHTML = outnode.innerHTML = 'running...';

    var test_data, truth_mean;

    var sum_appfun = tfun.decl( '_count', '0' )
        .map( '.p' ).filter( '!=null' ).redinit( '0', '_count++, out+v' )
        .next( '{ sum : current, count : _count }' )

    , sum2mean_appfun = tfun.declIn( { _count : '.count', _sum : '.sum' }).next( '{ sum : _sum, count : _count, mean : _sum / _count }' )

    , mean_appfun = sum_appfun.next( sum2mean_appfun )

    , actual_parallel_tests = [
        check_psingle_appfun
        , check_psplit_appfun_maximum
        , check_psplit_appfun_50percent
        
        , check_psingle_devilappfun
        , check_psplit_devilappfun_maximum
        , check_psplit_devilappfun_50percent
    ]
    ;
    async_test_loop(
        async_finished
        , [
            setup_truth
            , check_truth
            , check_sync_appfun
        ]
            .concat( actual_parallel_tests )
            .concat( actual_parallel_tests )  // A second time, to make sure code caching does not break things
    )
    
    function async_finished( /*boolean*/success )
    {
        outnode.innerHTML = success === true ? 'success' : 'failure';
        detailnode.innerHTML = '' + async_run_test;
        prettyPrint();

        after_async.ready( success );
    }

    function setup_truth( /*function*/notifyDone )
    {
        test_data = create_pseudo_random_arr();
        var truth = test_data.reduce( function (out, x) { return x.p != null  ?  { sum : out.sum + x.p, count : out.count + 1 } : out }
                                      , { sum : 0, count : 0 }
                                    );
        truth_mean = { sum : truth.sum, count : truth.count, mean : truth.sum / truth.count };

        notifyDone();
    }
    
    function check_truth( /*function*/notifyDone )
    {
        test_data.length  &&  'p' in test_data[ 0 ]  ||  null.bug;

        (truth_mean.sum  ||  null).toPrecision.call.a;
        (truth_mean.count  ||  null).toPrecision.call.a;
        (truth_mean.mean  ||  null).toPrecision.call.a;
        
        truth_mean.sum === test_data.filter(function (x) { return x.p != null; }).reduce(function (a, b) { return a + b.p; },0)  ||  null.bug;
        truth_mean.count === test_data.filter(function (x) { return x.p != null }).length  ||  null.bug;
        1e-10 > Math.abs( truth_mean.mean - truth_mean.sum / truth_mean.count )  ||  null.bug;
        
        notifyDone();
    }

    function check_sync_appfun( /*function*/notifyDone )
    {
        var sync_result = mean_appfun( test_data );
        oEquals( truth_mean, sync_result )  ||  null.bug;
        notifyDone();
    }

    function check_psingle_appfun( /*function*/notifyDone )
    // single worker process
    {
        var async_appfun = psingle( sum_appfun )
            .next( sum2mean_appfun )
        ;
        async_appfun.runOn( test_data )
            .then( receive_result )
        ;
        function receive_result( r )
        {
            notifyDone( oEquals( truth_mean, r ) );
        }
    }

    function check_psplit_appfun_maximum( /*function*/notifyDone )
    // maximum number of worker processes
    {
        var async_appfun = psplit( sum_appfun )
            .pmerge( pmerge_result )
            .next( sum2mean_appfun )
        ;
        async_appfun.runOn( test_data )
            .then( receive_result )
        ;
        function receive_result( r )
        {
            notifyDone( oEquals( truth_mean, r ) );
        }

        function pmerge_result( a, b )
        {
            return tval.call( a, b )( tfun.mapIn( 'v+this[k]' ) );
        }
    }


    function check_psplit_appfun_50percent( /*function*/notifyDone )
    // 50% of the maximum number of worker processes
    {
        var async_appfun = psplit( sum_appfun, { prop : 0.5 } )
            .pmerge( pmerge_result )
            .next( sum2mean_appfun )
        ;
        async_appfun.runOn( test_data )
            .then( receive_result )
        ;
        function receive_result( r )
        {
            notifyDone( oEquals( truth_mean, r ) );
        }

        function pmerge_result( a, b )
        {
            return tval.call( a, b )( tfun.mapIn( 'v+this[k]' ) );
        }
    }

    function check_psingle_devilappfun( /*function*/notifyDone )
    {
        var async_devilappfun = psingle( devilappfun( sum_native ) )
            .next( devilappfun( sum2mean_native ) )
        ;
        async_devilappfun.runOn( test_data )
            .then( receive_result )
        ;
        function receive_result( r )
        {
            notifyDone( oEquals( truth_mean, r ) );
        }
    }

    function check_psplit_devilappfun_maximum( /*function*/notifyDone )
    // maximum number of worker processes
    {
        var async_devilappfun = psplit( devilappfun( sum_native ) )
            .pmerge( pmerge_result )
            .next( devilappfun( sum2mean_native ) )
        ;
        async_devilappfun.runOn( test_data )
            .then( receive_result )
        ;
        function receive_result( r )
        {
            notifyDone( oEquals( truth_mean, r ) );
        }
        function pmerge_result( a, b )
        {
            return tval.call( a, b )( tfun.mapIn( 'v+this[k]' ) );
        }
    }

    function check_psplit_devilappfun_50percent( /*function*/notifyDone )
    // 50% of the maximum number of worker processs
    {
        var async_devilappfun = psplit( devilappfun( sum_native ), { prop : 0.5 } )
            .pmerge( pmerge_result )
            .next( devilappfun( sum2mean_native ) )
        ;
        async_devilappfun.runOn( test_data )
            .then( receive_result )
        ;
        function receive_result( r )
        {
            notifyDone( oEquals( truth_mean, r ) );
        }
        function pmerge_result( a, b )
        {
            return tval.call( a, b )( tfun.mapIn( 'v+this[k]' ) );
        }
    }

    function sum_native( arr )
    {
        var count = 0
        ,   sum   = 0
        ;
        for (var n = arr.length, i = 0; i < n; i++)
        {
            var x = arr[ i ];
            if (x.p != null)
            {
                count++;
                sum += x.p;
            }
        }
        return { count : count, sum : sum };
    }

    function sum2mean_native( o )
    {
        var sum = o.sum
        , count = o.count
        ;
        return {
            sum : sum
            , count : count
            , mean : sum / count
        };
    }
    
}

function async_test_loop( finished, arr )
{
    var success = false;
    
    arr = [ async_log_begin ].concat( arr ).concat( async_log_end );
    
    console.time( 'transfun:async_test_loop' );
    
    async_test_next();

    function async_test_next( /*?boolean?*/maybe_async_success )
    {
        if (false === maybe_async_success)  // useful test to catch an async failure as in `check_psingle_appfun: receive_result`
            async_log_end( function () {
                console.error( 'async_test_loop: failure!' );
                finished( false );
            } );
        else
            setTimeout( async_test_next_impl, 0 );
    }
    
    function async_test_next_impl()
    {
        if (arr.length < 1)
        {
            console.log( 'async_test: all tests passed.' );
            finished( true );
        }
        else
        {                       
            var one_test = arr.shift();
            try {
                one_test( async_test_next );
            }
            catch ( e )
            {
                success = false;
                console.error( 'async_test_loop caught an error on test "' + one_test.name + '":', e );
                finished( false );
            }
        }
    }

    function async_log_begin( /*function*/notifyDone )
    {
        console.time( 'async_test_loop' );
        notifyDone();
    }
    
    function async_log_end( /*function*/notifyDone )
    {
        console.timeEnd( 'async_test_loop' );
        notifyDone();
    }
}
