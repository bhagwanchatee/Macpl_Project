sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller,Filter,FilterOperator) => {
    "use strict";

    return Controller.extend("com.fiori.zmironew.controller.View1", {
        onInit() {
                // Setting up model for service entry
                var oModelServiceEntry = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZC_PO_HEADER/", {
                    json: true,
                    useBatch: false
                });
                
                // Set globally
                this.getOwnerComponent().setModel(oModelServiceEntry, "serviceEntry");
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
        _fetchPODetails: function (sPonumber, sGateEntryID) {
                // var oModel = this.getView().getModel();
                var oModel = this.getOwnerComponent().getModel("serviceEntry");
                var sPath = "/ZC_PO_HEADER";
                
                 
                 var aFilters = [];
                 aFilters.push(new Filter("PurchaseOrder", FilterOperator.EQ, sPonumber));
                 aFilters.push(new Filter("GateEntryId", FilterOperator.EQ, sGateEntryID));
 
                 console.log("API Request Path:", sPath); // Debugging

                 if (!oModel || !(oModel instanceof sap.ui.model.odata.v2.ODataModel)) {
                    console.error("OData Model is not available or incorrect type.");
                    return;
                }

                // Call OData model to fetch data
                oModel.read(sPath, {
                    filters: aFilters,
                    urlParameters: {
                        "$expand": "to_Item",
                    },
                    success: function (oData, response) {
                        console.log("PO Details in response:", oData);

                        // Ensure oData.results exists and has data
                        if (oData.results && oData.results.length > 0) {
                            let poDetails = oData.results[0]; // Get the first PO object

                            // Check if to_Item exists and contains results
                            if (poDetails.to_Item && poDetails.to_Item.results) {
                                // Sort the to_Item.results array in descending order
                                poDetails.to_Item.results.sort((a, b) => 
                                    Number(a.PurchaseOrderItem) - Number(b.PurchaseOrderItem)
                                );
                                
                            }

                            var oViewModel = new sap.ui.model.json.JSONModel(oData);
                            this.getView().setModel(oViewModel, "POService");

                            // ===  Get Unique TaxCodes and Fetch ===
                            
                        }

                        console.log("oData: ",oData)
                        const oJsonModel = new sap.ui.model.json.JSONModel(JSON.parse(JSON.stringify(oData))); // deep clone
                        this.getView().setModel(oJsonModel, "EditModel");
                        const oModel2 = this.getView().getModel("EditModel"); // or "your model name"
                        const oData2 = oModel2.getData();
                        
                        
                        
                                                
                        if (Array.isArray(oData.results) && oData.results.length > 0) {

                            //Get the InvoicingParty
                            let sInvoicingParty = oData.results[0].InvoicingParty;
                            this.invoicingParty = sInvoicingParty;
                            console.log("Inovicing Party:",this.invoicingParty)

                            //Get the DocumentDate
                            let sDocumentDate = oData.results[0].DocumentDate;
                            // this.documentDate = sDocumentDate;
                            var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "yyyyMMdd" });
                            this.documentDate = oDateFormat.format(new Date(sDocumentDate));
                            console.log("This Document Date",this.documentDate)

                            //Get the PostingDate
                            let sPostingDate = oData.results[0].PostingDate;
                            // this.postingDate = sPostingDate;
                            this.postingDate = oDateFormat.format(new Date(sPostingDate));
                            console.log("This Document Date",this.postingDate)

                           
                            let sPInInvoicereferencenumber = oData.results[0].IN_InvoiceReferenceNumber
                            this.invoiceReferenceNumber = sPInInvoicereferencenumber                            
                             
                            
                             var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
                                oCrossAppNav.toExternal({
                                    target: {
                                        semanticObject: "SupplierInvoice",
                                        action: "createAdvanced"
                                    },
                                    params: {
                                        PurchaseOrder: "5500000099",   // example PO number
                                        CompanyCode: "1100"            // optional additional context
                                    }
                                });






                        }

                    }.bind(this),
                    error: function (oError) {
                        console.error("Error fetching PO details:", oError);
                    }
                });
            },
    });
});