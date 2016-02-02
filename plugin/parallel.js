/*
  parallel.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ../LICENSE

  Contact: glat@glat.info

  --- DESCRIPTION ---

  Split an `appfun` across workers. 
  
  `appfun` must support the interface:

   * `getNExternals()`: returns the number of extern calls (must be zero!).

   * `getBodyCode()`: returns the JavaScript code implementing `appfun`
     with an input parameter called `current`.

   * `next( otherAppfun )`: returns a new `appfun` that is the composition
     of the two: `this` and `otherAppfun`.

  The `appfun`s produced by ../transfun.js support that interface.

  You may however develop your own. Example: ./devilappfun.js
*/

/*global psingle psplit navigator URL Blob Worker setTimeout*/

var psingle, psplit; // required
(function () {

    var DEFAULT_N_WORKERS = navigator.hardwareConcurrency - 1  ||  3
    ,   WORKERS_SUPPORTED = 'undefined' !== typeof URL  &&  'function' === typeof URL.createObjectURL  &&
        'function' === typeof Blob  &&
        'function' === typeof Worker
    ;
    
    // ---------- Public API
    
    psingle = tfun_psingle;
    psplit  = tfun_psplit;

    psingle.getSystemInfo = tfun_psingle_getSystemInfo;
    
    // ---------- Public API implementation

    function tfun_psingle( appfun )
    // Setup an `appfun` runner for a single parallel worker.
    {
        return tfun_psplit( appfun, { _single : true, n : 1 } );
    }

    function tfun_psplit( appfun, /*?object { n : <integer>} | { prop : <float between 0 and 1>}?*/cfg )
    // Setup an `appfun` runner for a several parallel workers.
    {
        cfg != null  ||  (cfg = { n : DEFAULT_N_WORKERS });

        return new _ParallelSplit( appfun, cfg );
    }

    function tfun_psingle_getSystemInfo()
    {
        return {
            default_n_workers   : WORKERS_SUPPORTED  ?  DEFAULT_N_WORKERS  :  null
            , workers_supported : WORKERS_SUPPORTED
        };
    }
    
    // ---------- Private details

    function _ParallelSplit( appfun, cfg, previous_parallelMerge )
    {
        if (appfun.getNExternal() !== 0)
            throw new Error( 'psplit: `appfun`: external calls are forbidden here!' );

        cfg.n != null
            ?  0 < cfg.n       &&  cfg.n < Infinity  &&  cfg.n.toPrecision.call.a
            :  0.0 < cfg.prop  &&  cfg.prop < 1.0    &&  cfg.prop.toPrecision.call.a
        ;
        this.appfun = appfun;
        this.cfg    = cfg;
        this.previous_parallelMerge = previous_parallelMerge  ||  null;

        if (cfg._single)
        {
            cfg.n === 1  ||  null.bug;
            return this.pmerge( 'out' );
        }
    }
    
    var PS_proto = _ParallelSplit.prototype;

    PS_proto.pnext           = PS_pnext;
    PS_proto.pmerge          = PS_pmerge
    PS_proto.pmergeRight     = PS_pmergeRight;
    PS_proto.pmerginit       = PS_pmerginit
    PS_proto.pmerginitRight  = PS_pmerginitRight;

    function PS_pnext( appfun )
    {
        return new _ParallelSplit( this.appfun  ?  this.appfun.next( appfun )  :  appfun, this.cfg );
    }

    function PS_pmerge( /*function (out,v) => new_out | (partial) expression string*/mergefun )
    {
        return new _ParallelMerge( this, mergefun );
    }
    
    function PS_pmergeRight( /*function (out,v) => new_out | (partial) expression string*/mergefun )
    {
        return new _ParallelMerge( this, mergefun, { righttoleft : true } );
    }

    function PS_pmerginit( /*non-string value | string code*/initval
        , /*function (out,v) => new_out | (partial) expression string*/mergefun )
    {
        return new _ParallelMerge( this, mergefun, { initval : initval } );
    }
    
    function PS_pmerginitRight( /*non-string value | string code*/initval
        , /*function (out,v) => new_out | (partial) expression string*/mergefun )
    {
        return new _ParallelMerge( this, mergefun, { initval : initval, righttoleft : true } );
    }

    // ---
    
    function _ParallelMerge( parallelSplit, mergefun, opt, opt_nextAppFun )
    {
        this.parallelSplit = parallelSplit;
        this.mergefun      = mergefun;
        this.opt           = opt  ||  {};

        this.nextAppfun    = opt_nextAppFun  ||  null; // optional main-thread post-processing, see `next` below
    }

    var PM_proto = _ParallelMerge.prototype;

    PM_proto.next    = PM_next;
    PM_proto.runOn   = PM_runOn;
    PM_proto.psingle = PM_psingle;
    PM_proto.psplit  = PM_psplit;
    
    function PM_next( appfun )
    {
        var   naf = this.nextAppfun
        , new_naf = naf  ?  naf.next( appfun )  :  appfun
        ;
        return new _ParallelMerge( this.parallelSplit, this.mergefun, this.opt, new_naf );
    }

    function PM_runOn( data )
    {
        var that = this;
        
        var done
        , merged_result
        , nextAppfun = that.nextAppfun
        , cb_arr = []
        ;

        _PS_runOn.call( that.parallelSplit, data ).then( _PM_merge_result );
        
        return { then : _PM_runOn_then };

        function _PM_merge_result( result_arr )
        {
            var has_initval = 'initval' in that.opt
            ,     tfun_name = (has_initval  ?  'redinit'  :  'reduce')
                + (that.opt.righttoleft  ?  'Right'  :  '')

            , result_merge_appfun = 'initval' in that.opt
                ?  tfun[ tfun_name ]( that.opt.initval, that.mergefun )
                :  tfun[ tfun_name ]( that.mergefun )

            , merged_result = result_merge_appfun( result_arr )
            ;
            
            done = true;

            var final_merged_result = nextAppfun
                ?  nextAppfun( merged_result )
                :  merged_result
            ;

            while (cb_arr.length)
                cb_arr.shift()( final_merged_result );
        }

        function _PM_runOn_then( callback )
        {
            if (done)
                callback( merged_result );
            else
                cb_arr.push( callback );
        }
    }

    function PM_psingle( appfun )
    {
        return this.psplit( appfun, 1 );
    }

    function PM_psplit( appfun,  /*?object { n : <integer>} | { prop : <float between 0 and 1>}?*/cfg )
    {
        cfg != null  ||  (cfg = this.parallelSplit.cfg  ||  { n : DEFAULT_N_WORKERS });
        return new _ParallelSplit( appfun, cfg, this );
    }
    
    // ---------- Private details: Deeper

    function _PS_runOn( data )
    {
        var that = this;
        
        var done
        ,   split_result
        ,   cb_arr = []
        ,   ppm    = that.previous_parallelMerge
        ;
        if (ppm)
            ppm.runOn( data ).then( _PS_runOn_impl );
        else
            _PS_runOn_impl( data );

        return { then : _PS_runOn_then };

        function _PS_runOn_then( callback )
        {
            if (done)
                callback( split_result );
            else
                cb_arr.push( callback );
        }

        function _PS_runOn_impl( data2 )
        {
            var  cfg = that.cfg
            , appfun = that.appfun

            , data2_length = data2  &&  data2.length

            , split_data
            ;
            if (WORKERS_SUPPORTED)
            {
                var n = Math.max( 1, Math.min(
                    DEFAULT_N_WORKERS
                    , cfg.n != null
                        ?  cfg.n
                        :  Math.round( cfg.prop * DEFAULT_N_WORKERS )
                ));
                n.toPrecision.call.a;

                if (n < 2)
                {
                    split_data = [ data2 ];
                }
                else
                {
                    if (!(data2  instanceof Array  ||  (data2  &&  data2.slice  &&  data2_length != null)))
                        throw new Error( 'ParallelSplit on more than one worker can only run on array data!' );

                    split_data = [];
                    
                    var delta  = Math.max( 1, data2_length / n )
                    ,   x      = 0
                    ,   i_next = 0
                    ;
                    while (i_next < data2_length)
                    {
                        x += delta;

                        var j = 1 + Math.min( data2_length, Math.max( i_next, Math.round( x ) ) );

                        split_data.push( data2.slice( i_next, j ) );

                        i_next = j;
                    }
                }

                var n_worker = split_data.length
                , result_arr = new Array( n_worker )
                , n_received = 0
                , bodycode   = appfun.getBodyCode()
                ;
                
                split_data.forEach( _PS_start_one_worker );
            }
            else if ('function' === typeof setTimeout)
            {
                // Workers not supported. Fallback 1: later.
                setTimeout( _PS_fallback_runOn_in_main );
                
            }
            else
            {
                // Workers not supported. Fallback 2: now.
                _PS_fallback_runOn_in_main();
            }

            // --- details
            
            function _PS_start_one_worker( data_piece, i_worker )
            {
                var worker = _parallel_takePoolWorker();
                worker.addEventListener( 'message', _PS_receive_one_result );

                worker.postMessage( { w_data   : data_piece
                                      , w_code : bodycode
                                    }
                                  );
                
                function _PS_receive_one_result( e )
                {
                    result_arr[ i_worker ] = e.data;
                    n_received++;
                    _parallel_releasePoolWorker( worker );
                    
                    if (n_received === n_worker)
                    {
                        split_result = result_arr;
                        _PS_transmit_result();
                    }
                }

            } // _PS_start_one_worker

            function _PS_fallback_runOn_in_main()
            {
                split_result = [ appfun( data ) ];
                _PS_transmit_result();
            }
            
            function _PS_transmit_result()
            {
                done = true;
                
                while (cb_arr.length)
                    cb_arr.shift()( split_result );
            }
            
        } // _PS_runOn_impl

    } // _PS_runOn

    // ---------- Maintain a worker pool so that we don't have to
    // terminate anyone.

    var workerPool = [];
    function _parallel_takePoolWorker()
    {
        return workerPool.length
            ?  workerPool.pop()
            :  new Worker( URL.createObjectURL( new Blob(
                [
                    [ // Javascript code that can run any piece of code on any piece of data
                        "(function () {",
                        "  var w_code2fun = {};",
                        "  self.addEventListener('message', function(e) {",
                        "    var w_code = e.data.w_code;",
                        "    (w_code  ||  null).substring.call.a;",
                        "    var fun = w_code in w_code2fun  ?  w_code2fun[ w_code ]  :  (w_code2fun[ w_code ] = new Function( 'current', w_code ))",
                        "    ,   ret = fun( e.data.w_data )",
                        "    ;",
                        "    self.postMessage( ret );",
                        "  });",
                        "})();"
                    ].join( '\n' )  // join( '\n' ) for blob code source readability, in case of error.
                ]
                , {type: 'application/javascript'}
                
            )))
        ;
    }

    function _parallel_releasePoolWorker( worker )
    {
        workerPool.push( worker );
    }
    
})();
