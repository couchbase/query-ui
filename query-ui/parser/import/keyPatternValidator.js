const keyPattern = require('./keyPattern').parser;

try {
    const patterns = [
        '#MONO_INCR[1234]#',
        '#MONO_INCR#',
        '1234',
        '#MONO_INCR#1234',
        '#MONO_INCR#---#UUID#',
        '%hello.world%',
        '%hello.`bar bar`%',
        '%hello.`bar``bar`%',
        '%hello.`bar###bar`%',
        '%foo.bar.`moo`%--blahblah#MONO_INCR##UUID#',
        '%id%%id2%',
        'foo##bar',
    ];
    patterns.forEach((pat) =>
        console.log("For: " + pat + ", Result: " + JSON.stringify(keyPattern.parse(pat))))
} catch (e) {
    console.log("Got error: " + e);
}
