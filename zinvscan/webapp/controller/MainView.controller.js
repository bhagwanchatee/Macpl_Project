sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller,Filter,FilterOperator) => {
    "use strict";

    return Controller.extend("com.fiori.zinvscan.controller.MainView", {
        onInit() {
        },
        onGo: function(){
            const asn = this.byId("asnInput").getValue();
            this._fetchPONumber(asn);
        },
        _fetchPONumber: function(sGateEntryID){
                // console.log("Fetching PO Number for EntryID:", sGateEntryID);

                var oModel = this.getOwnerComponent().getModel("GateEntryService");
                var sPath = "/InwardGateHeader";
                
                 var aFilters = [];
                 aFilters.push(new Filter("GateEntryId", FilterOperator.EQ, sGateEntryID));
 
                //  console.log("API Request Path:", sPath); // Debugging

                 if (!oModel || !(oModel instanceof sap.ui.model.odata.v2.ODataModel)) {
                    console.error("OData Model is not available or incorrect type.");
                    return;
                }
                               
                // Call OData model to fetch data
                oModel.read(sPath, {
                    filters: aFilters,
                    urlParameters: {
                        "$select": "Ponumber"
                    },
                    success: function (oData, response) {

                        // console.log(oData)
                        let sPONumber = oData.results[0].Ponumber;
                        this.Ponumber = sPONumber; // Setting Ponumber as global
                        console.log("PONumber: ", sPONumber)
                        

                        // Gettting the PODetails using the GateEntryID
                        this._fetchPODetails(sPONumber,sGateEntryID);

                    }.bind(this),
                    error: function (oError) {
                        console.error("Error fetching PO details:", oError);
                    }
                });      
        },        
    });
});