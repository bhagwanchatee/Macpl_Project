sap.ui.define([], function () {
    "use strict";

    return {
        formatDate: function (sDate) {
            if (sDate) {
                var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "MMM dd, yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        }
    };
});