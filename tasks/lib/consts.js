module.exports = function (nsPrefix) {
    nsPrefix = nsPrefix || 'yo';
    var delimiters = {
        TAG: '-',
        ATTR: '-',
        PLACEHOLDER: '::'
    };
    return {
        BLOCK: 'block',
        PARAM: 'param',
        REPLACE: 'replace',
        TAG_DELIMETER: '-',
        PLACEHOLDER_DELIMITER: '::',
        DEFAULT_PREFIX: 'yo',
        TAG_NAME: 'yohtml',
        TAG: {
            MAIN: nsPrefix + 'html',
            BLOCK: ''
        },
        //PLACEHOLDER: {
        //
        //},
        ATTR: {
            YO_BLOCK:       nsPrefix + delimiters.ATTR + 'block',
            YO_PARAM:       nsPrefix + delimiters.ATTR + 'param',
            YO_REPLACE:     nsPrefix + delimiters.ATTR + 'replace',
            RULE_BLOCK:     nsPrefix + delimiters.ATTR + 'block',
            RULE_PARAM:     nsPrefix + delimiters.ATTR + 'param',
            RULE_PARAM_REPLACE:     nsPrefix + delimiters.ATTR + 'replace' + delimiters.ATTR + 'param'
        },
        DELITIMER: delimiters
    }
}