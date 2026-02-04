sap.ui.define(
    [
        'sap/ui/core/mvc/ControllerExtension',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/BusyIndicator"
        // ,'sap/ui/core/mvc/OverrideExecution'
    ],
    function (
        ControllerExtension, Filter, FilterOperator, BusyIndicator
        // ,OverrideExecution
    ) {
        'use strict';
        var baselineDate = "";
        return ControllerExtension.extend("customer.appvar.suppinv.ObjExt", {
            // metadata: {
            // 	// extension can declare the public methods
            // 	// in general methods that start with "_" are private
            // 	methods: {
            // 		publicMethod: {
            // 			public: true /*default*/ ,
            // 			final: false /*default*/ ,
            // 			overrideExecution: OverrideExecution.Instead /*default*/
            // 		},
            // 		finalPublicMethod: {
            // 			final: true
            // 		},
            // 		onMyHook: {
            // 			public: true /*default*/ ,
            // 			final: false /*default*/ ,
            // 			overrideExecution: OverrideExecution.After
            // 		},
            // 		couldBePrivate: {
            // 			public: false
            // 		}
            // 	}
            // },

            // onGo:function(){

            //         alert("on Go press");
            // },
            onClear: function () {
                this.base.byId(this.STRING + "-component---MMIV_HEADER_ID_S1--customer.appvar.suppinv.asnInput").setValue("");
                this.base.executeReverseDeleteDiscardOrCancel();
                debugger

            },
            _fetchBaselIneDate: function (sGateEntryID) {
                // console.log("Fetching PO Number for EntryID:", sGateEntryID);

                BusyIndicator.show();
                var oModel5 = this.getView().getModel("customer.ZMM_GATE_REPORT_BINDING");
                var sPath = "/GateRep";

                var aFilters = [];
                aFilters.push(new Filter("GateEntryId", FilterOperator.EQ, sGateEntryID));

                //  console.log("API Request Path:", sPath); // Debugging

                if (!oModel5 || !(oModel5 instanceof sap.ui.model.odata.v2.ODataModel)) {
                    console.error("OData Model is not available or incorrect type.");
                    return;
                }

                // Call OData model to fetch data
                oModel5.read(sPath, {
                    filters: aFilters,
                    success: function (oData, response) {
                        BusyIndicator.hide();
                        // console.log(oData)
                        let sPONumber = oData.results[0].Ponumber;
                        if (Array.isArray(oData.results) && oData.results.length > 0) {

                            var oContext = this.base.getView().getBindingContext();
                            if (oContext) {
                                var oModel = oContext.getModel();
                                var sPath = oContext.getPath();

                                oModel.setProperty(sPath + "/DueCalculationBaseDate", oData.results[0].PostingDate);
                                baselineDate = oData.results[0].PostingDate;

                            }

                        }


                    }.bind(this),
                    error: function (oError) {
                        BusyIndicator.hide();
                        console.error("Error fetching BaseLine Date:", oError);
                    }
                });
            },
            onGo: function () {
                //var asn = this.byId("asnInput").getValue();
                var asn = this.base.byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--customer.appvar.suppinv.asnInput").getValue();
                this.ASN = asn;
                var sel = this.base.getView().byId(this.STRING + "-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.SelectReferenceType-select");
                //var sel = this.base.getView().byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.SelectReferenceType-select");

                if (sel.getSelectedKey() !== '2') {

                    sel.setSelectedKey(2);
                    var selItem = sel.getSelectedItem();
                    sel.fireChange({ selectedItem: selItem });
                }
                this.base.getView().byId(this.STRING + "-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry").removeAllTokens();
                //this.base.getView().byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry").removeAllTokens();

                this._fetchBaselIneDate(asn);
                this._fetchPONumber(asn);

            },
            _fetchPONumber: function (sGateEntryID) {
                // console.log("Fetching PO Number for EntryID:", sGateEntryID);

                BusyIndicator.show();
                var oModel = this.getView().getModel("customer.ZSB_INWARDGATEENTRY");
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
                        BusyIndicator.hide();
                        // console.log(oData)
                        let sPONumber = oData.results[0].Ponumber;
                        this.Ponumber = sPONumber; // Setting Ponumber as global
                        console.log("PONumber: ", sPONumber)


                        // Gettting the PODetails using the GateEntryID
                        this._fetchPODetails(sPONumber, sGateEntryID);

                    }.bind(this),
                    error: function (oError) {
                        BusyIndicator.hide();
                        console.error("Error fetching PO details:", oError);
                    }
                });
            },
            _fetchPODetails: function (sPonumber, sGateEntryID) {
                // var oModel = this.getView().getModel();
                var oModel = this.getView().getModel("customer.ZC_PO_HEADER");
                var sPath = "/ZC_PO_HEADER";

                BusyIndicator.show();
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
                        BusyIndicator.hide();
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

                        } else {

                            sap.m.MessageBox.error("Failed to load data for entered ASN No.");

                        }

                        if (Array.isArray(oData.results) && oData.results.length > 0) {

                            var oContext = this.base.getView().getBindingContext();
                            if (oContext) {
                                var oModel = oContext.getModel();
                                var sPath = oContext.getPath();

                                oModel.setProperty(sPath + "/CompanyCode", oData.results[0].CompanyCode);
                                oModel.setProperty(sPath + "/DocumentDate", oData.results[0].DocumentDate);
                                oModel.setProperty(sPath + "/Reference", oData.results[0].IN_InvoiceReferenceNumber);
                                oModel.setProperty(sPath + "/YY1_GateEntry_MIH", oData.results[0].GateEntryId);
                                // oModel.setProperty(sPath + "/IN_GSTPartner",oData.results[0].IN_GSTPartner);
                                // oModel.setProperty(sPath + "/PaymentTerms",oData.results[0].PaymentTerms);
                                oModel.setProperty(sPath + "/IN_GSTPlaceOfSupply", oData.results[0].IN_GSTPlaceOfSupply);
                                oModel.setProperty(sPath + "/InvoiceGrossAmount", oData.results[0].InvoiceGrossAmount);
                                oModel.setProperty(sPath + "/BusinessPlace", oData.results[0].BusinessPlace);

                                if (oData.results[0].BusinessPlace === "3300") {
                                    oModel.setProperty(sPath + "/YY1_ZPlaceOfSupply_MIH", "TN");
                                }
                                if (oData.results[0].BusinessPlace === "2700") {
                                    oModel.setProperty(sPath + "/YY1_ZPlaceOfSupply_MIH", "MH");
                                }
                                //oModel.setProperty(sPath + "/DueCalculationBaseDate", oData.results[0].BaselineDate);

                            }
                            //var oContext1=this.base.getView().byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry").getBindingContext();

                            setTimeout(() => {
                                var oInp = this.base.getView().byId(this.STRING + "-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry");
                                //var oInp = this.base.getView().byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry");

                                var oContext1 = oInp.getBindingContext();

                                if (oContext1) {
                                    var oModel1 = oContext1.getModel();
                                    var sPath1 = oContext1.getPath();
                                    if (oModel1.getProperty(sPath1 + "/DeliveryNote")) {
                                        oModel1.setProperty(sPath1 + "/DeliveryNote", oData.results[0].IN_InvoiceReferenceNumber);
                                    }
                                    oInp.focus();
                                    oInp.removeAllTokens();
                                    oInp.setValue("");
                                    oInp.setValue(oData.results[0].IN_InvoiceReferenceNumber);

                                    //this.base.executeCheck();


                                    var aValue = [];
                                    aValue.push(oData.results[0].IN_InvoiceReferenceNumber);
                                    //var aTokens=aValue.map(val => new sap.m.Token({key:val,text:val}));
                                    //this.base.getView().byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry").setTokens(aTokens);
                                    // oInp.focus();
                                    //this.base.getView().byId("application-app-preview-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry").setTokens(aTokens);

                                    // this.base.getView().byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.MultiInputQuickPurchaseOrderEntry").fireTokenUpdate({
                                    //    type: "added",
                                    //    addedTokens: aTokens
                                    //});
                                    var oView = this.base.getView();
                                    oModel.attachRequestCompleted(function () {
                                        //var oSF = oView.byId("application-app-preview-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.InputBusinessSectionCode");
                                        var oSF = oView.byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.InputBusinessSectionCode");

                                        var oCtx = oSF.getBindingContext();
                                        if (oCtx && !oCtx.getProperty("BusinessSectionCode")) {
                                            oCtx.setProperty("BusinessSectionCode", "1100");
                                        }
                                        //var oSF1 = oView.byId("application-app-preview-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.SmartFieldDueCalculationBaseDate");
                                        var oSF1 = oView.byId("application-SupplierInvoice-create_New-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.SmartFieldDueCalculationBaseDate");
                                        var oCtx1 = oSF1.getBindingContext();
                                        if (oCtx1 && !oCtx1.getProperty("DueCalculationBaseDate")) {
                                            oCtx1.setProperty("DueCalculationBaseDate", baselineDate);
                                        }


                                    });

                                }

                            }, 0);

                            //Get the InvoicingParty
                            let sInvoicingParty = oData.results[0].InvoicingParty;
                            this.invoicingParty = sInvoicingParty;
                            console.log("Inovicing Party:", this.invoicingParty)

                            // //Get the DocumentDate
                            // let sDocumentDate = oData.results[0].DocumentDate;
                            // // this.documentDate = sDocumentDate;
                            // var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "yyyyMMdd" });
                            // this.documentDate = oDateFormat.format(new Date(sDocumentDate));
                            // console.log("This Document Date",this.documentDate)

                            // //Get the PostingDate
                            // let sPostingDate = oData.results[0].PostingDate;
                            // // this.postingDate = sPostingDate;
                            // this.postingDate = oDateFormat.format(new Date(sPostingDate));
                            // console.log("This Document Date",this.postingDate)


                            // let sPInInvoicereferencenumber = oData.results[0].IN_InvoiceReferenceNumber
                            // this.invoiceReferenceNumber = sPInInvoicereferencenumber                            



                        }

                    }.bind(this),
                    error: function (oError) {
                        console.error("Error fetching PO details:", oError);
                        BusyIndicator.hide();
                    }
                });
            },


            // // adding a private method, only accessible from this controller extension
            // _privateMethod: function() {},
            // // adding a public method, might be called from or overridden by other controller extensions as well
            // publicMethod: function() {},
            // // adding final public method, might be called from, but not overridden by other controller extensions as well
            // finalPublicMethod: function() {},
            // // adding a hook method, might be called by or overridden from other controller extensions
            // // override these method does not replace the implementation, but executes after the original method
            // onMyHook: function() {},
            // // method public per default, but made private via metadata
            // couldBePrivate: function() {},
            // // this section allows to extend lifecycle hooks or override public methods of the base controller
            override: {
                // 	/**
                // 	 * Called when a controller is instantiated and its View controls (if available) are already created.
                // 	 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
                // 	 * @memberOf customer.appvar.suppinv.ObjExt
                // 	 */
                onAfterRendering: function () {
                    debugger
                    this.baselineDate = baselineDate;
                    this.STRING="application-SupplierInvoice-create_New";
                    //this.STRING = "application-app-preview";
                    var oSmartField = this.base.byId(this.STRING + "-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.CEInputInvoiceGrossAmount");
                    //var oSmartField = this.base.byId("application-app-preview-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.CEInputInvoiceGrossAmount");
                    //var oInnerControl = oSmartField.getInnerControls()[0];

                    if (oSmartField && oSmartField.attachChange) {
                        oSmartField.attachChange(this.base.executeCheck, this.base);
                    }

                    // Get your SmartField
                    var oSF1 = this.base.byId(this.STRING + "-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.SmartFieldDueCalculationBaseDate");

                    // // Attach change event handler
                    // oSF1.attachChange(function (oEvent) {
                    //     // 👉 Whenever the date changes (user or OData)
                    //     var oSource = oEvent.getSource();
                    //     var oNewDate = oEvent.getParameter("value"); // new date value

                    //     console.log("Date changed to:", oNewDate);

                    //     // Push your default date back (example: today)
                    //     //var oDefaultDate = new Date(); // or any logic you want
                    //     oSource.setValue(baselineDate);
                    // });
                    
                    // Listen to UI changes
                    oSF1.attachChange(function (oEvent) {
                        var oDefaultDate = new Date(); // your default date
                        var oBinding = oSF1.getBinding("value");
                        if (oBinding) {
                            var oModel = oBinding.getModel();
                            var sPath = oBinding.getPath();
                            // 👉 Update model so UI + backend stay consistent
                            oModel.setProperty(sPath, baselineDate);
                        }
                    });

                    // Listen to OData/model changes
                    var oBinding = oSF1.getBinding("value");
                    if (oBinding) {
                        oBinding.attachChange(function () {
                            var oDefaultDate = new Date(); // your default date
                            var oModel = oBinding.getModel();
                            var sPath = oBinding.getPath();
                            // 👉 Force overwrite whenever backend pushes a new value
                            oModel.setProperty(sPath, baselineDate);
                        });
                    }


                    //                this.base.executeReverseDeleteDiscardOrCancel();

                },
            }
            // 	/**
            // 	 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
            // 	 * (NOT before the first rendering! onInit() is used for that one!).
            // 	 * @memberOf customer.appvar.suppinv.ObjExt
            // 	 */

            // 	onBeforeRendering: function() {
            // 	},
            // 	/**
            // 	 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
            // 	 * This hook is the same one that SAPUI5 controls get after being rendered.
            // 	 * @memberOf customer.appvar.suppinv.ObjExt
            // 	 */
            // 	onAfterRendering: function() {
            // 	},
            // 	/**
            // 	 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
            // 	 * @memberOf customer.appvar.suppinv.ObjExt
            // 	 */
            // 	onExit: function() {
            // 	},
            // 	// override public method of the base controller
            // 	basePublicMethod: function() {
            // 	}
            // }
        });
    }
);
