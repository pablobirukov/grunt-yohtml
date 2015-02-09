// show modules via microtemplating
document.getElementById("index-list-container").innerHTML = window.tmpl('index_tmpl', {index: INDEX});

(function (index) {
    var blockSelector = '.app-example',
        occurrenceClassPrefix = 'occurrence-',
        search = function (index, val) {
            var result = [],
                valLow = val.toLowerCase();
            for (var blockName in index) {
                if (!index.hasOwnProperty(blockName)) continue;
                if (blockName.toLowerCase().indexOf(valLow) !== -1) {
                    result.push({id: blockName, occurrence: 'name'});
                } else if (index[blockName].description.toLowerCase().indexOf(valLow) !== -1) {
                    result.push({id: blockName, occurrence: 'description'});
                }
            }
            return result;
        };

    // bind to search input
    $('#search').keyup(function () {
        var val = $(this).val();
        $(blockSelector)[val ? 'hide' : 'show']().removeClass('occurrence-name occurrence-description');
        if (!val) return;
        search(index, val).forEach(function (o) {
            $('#' + o.id)
                .show()
                .addClass(occurrenceClassPrefix + o.occurrence);
        }).focus();
    });

}(window.INDEX));
