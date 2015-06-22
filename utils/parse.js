var Parser = require('./jsonparse');
var through = require('through');
var featureSaver = require('./feature-saver');

module.exports.parse = function (path, map) {
    var parser = new Parser();
    var stream = through(function (chunk) {
            if ('string' === typeof chunk)
                chunk = new Buffer(chunk);
            stream.pause();
            parser.write(chunk);
        },
        function (data) {
            if (data)
                stream.write(data);
            stream.queue(null);
        });

    if ('string' === typeof path)
        path = path.split('.').map(function (e) {
            if (e === '*')
                return true;
            else if (e === '') // '..'.split('.') returns an empty string
                return { recurse: true };
            else
                return e
        });


    var count = 0, _key;
    if (!path || !path.length)
        path = null;

    parser.onError = function (err) {
        if (err.message.indexOf("at position") > -1)
            err.message = "Invalid JSON (" + err.message + ")";
        stream.emit('error', err)
    };

    parser.onValue = function (value) {
        if (!this.root)
            stream.root = value;

        if (!path) return;

        var i = 0; // iterates on path
        var j = 0; // iterates on stack
        while (i < path.length) {
            var key = path[i];
            var c;
            j++;

            if (key && !key.recurse) {
                c = (j === this.stack.length) ? this : this.stack[j];
                if (!c) return;
                if (!check(key, c.key)) return;
                i++
            } else {
                i++;
                var nextKey = path[i];
                if (!nextKey) return;
                while (true) {
                    c = (j === this.stack.length) ? this : this.stack[j];
                    if (!c) return;
                    if (check(nextKey, c.key)) {
                        i++;
                        this.stack[j].value = null;
                        break
                    }
                    j++
                }
            }

        }
        if (j !== this.stack.length) return;

        count++;
        var actualPath = this.stack.slice(1).map(function (element) {
            return element.key
        }).concat([this.key]);
        var data = this.value[this.key];
        if (null != data)
            if (null != (data = map ? map(data, actualPath) : data))
                stream.queue(data);
        delete this.value[this.key];
        for (var k in this.stack)
            this.stack[k].value = null
    };

    parser._onToken = parser.onToken;
    parser.onToken = function (token, value) {
        parser._onToken(token, value);
        if (this.stack[1]) {
            if (this.stack.length === 2 && this.stack[1].key == 'features') {
                if (this.stack[1].value.features.length > 0) {
                    if (stream.root) {
                        if (stream.root.type === 'Feature' && token === 2 && value === '}') {
                            featureSaver2(stream.root);
                        }
                    }
                }
            }
        }

        if (this.stack.length === 0) {
            if (stream.root) {
                if (!path)
                    featureSaver2();  // todo
                count = 0;
                stream.root = null;
            }
        }
        if (token === 'BUFFER' && value === 'END') {
            stream.resume();
        }
    };

    function featureSaver2 (feature) {
        if (feature) {
            stream.queue(',');
            stream.queue(JSON.stringify(feature));
        }
    }
    return stream;
};
