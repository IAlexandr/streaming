var fs = require('fs');
var streamJsonParser = require('./utils/parse');
var rs = fs.createReadStream('./source/result.geojson');//'./source/short.geojson');//
var ws = fs.createWriteStream('./source/result.geojson');
//var tt = require('./source/result.json');
var jsonStreamParse = module.exports = function (rs, callback) {
    rs
        .pipe(streamJsonParser.parse())
        .pipe(ws);

    rs.on('error', function (err) {
        return callback(err);
    });
    rs.on('close', function () {
        console.log('rs closed.');
    });

    ws.on('data', function (data, a, b) {
        var t = 1;
    });
    ws.on('error', function (err) {
        return callback(err);
    });
    ws.on('finish', function () {
        return callback();
    });
};

jsonStreamParse(rs, function (err) {
    if (err) {
        console.log(err.message);
    } else {
        console.log('done.');
    }
});
