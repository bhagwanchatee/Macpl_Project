sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    'sap/ui/core/library',
    'zchequeprint/model/formatter'
], (Controller, MessageBox, MessageToast, DateFormat, coreLibrary, formatter) => {
    "use strict";
    jQuery.sap.require("zchequeprint.model.jspdf");
    //const numberToWords = require('number-to-words');
    let ValueState = coreLibrary.ValueState;

    return Controller.extend("zchequeprint.controller.View1", {
        formatter: formatter,
        onInit() {
            this.aDocumentNumList = [];
            this.uniqueDocumentNumList = [];
            let currentYear = new Date().getFullYear();
            let currentMonth = new Date().getMonth();
            if (currentMonth < 3) {
                currentYear = currentYear - 1;
            }
            this.byId("idFiscalYear").setValue(currentYear);

            this.f4HelpModel = this.getOwnerComponent().getModel();

            this._oMutiSelectDialog = null;
            // Example data model
            let oModel = new sap.ui.model.json.JSONModel({
                items: [],
                selectedItemsText: ""
            });
            this.getView().setModel(oModel, "BulkRTGSModel");
            //this.byId("idBulkRTGS_ChequeDate").setMaxDate(new Date);
        },

        onSelectChequeType: function (oEvent) {
            let oValidatedComboBox = oEvent.getSource(),
                sSelectedKey = oValidatedComboBox.getSelectedKey(),
                sValue = oValidatedComboBox.getValue();
            if (!sSelectedKey && sValue) {
                oValidatedComboBox.setValueState(ValueState.Error);
                oValidatedComboBox.setValueStateText("Invalid Value");
                this.byId("idPanelCheque").setVisible(false);
                this.byId("idPanelRTGS").setVisible(false);
                this.byId("idPanelBulkRTGS").setVisible(false);
            } else {
                oValidatedComboBox.setValueState(ValueState.None);
                if (sValue === "") {
                    this.byId("idPanelCheque").setVisible(false);
                    this.byId("idPanelRTGS").setVisible(false);
                    this.byId("idPanelBulkRTGS").setVisible(false);
                }
                else if (sValue === "Cheque") {
                    this.byId("idPanelCheque").setVisible(true);
                    this.byId("idPanelRTGS").setVisible(false);
                    this.byId("idPanelBulkRTGS").setVisible(false);
                }
                else if (sValue === "RTGS") {
                    this.byId("idPanelCheque").setVisible(false);
                    this.byId("idPanelRTGS").setVisible(true);
                    this.byId("idPanelBulkRTGS").setVisible(false);
                }
                else if (sValue === "Bulk RTGS") {
                    this.byId("idPanelCheque").setVisible(false);
                    this.byId("idPanelRTGS").setVisible(false);
                    this.byId("idPanelBulkRTGS").setVisible(true);
                }
            }
        },

        onChangeFiscalYear: function (oEvent) {
            let oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            let currentYear = new Date().getFullYear();
            if (isNaN(sValue) || sValue.length < 4 || parseInt(sValue) > currentYear || (parseInt(sValue) <= currentYear - 5)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Enter a valid year");
                oInput.setValue();
            }
            else {
                oInput.setValueState(sap.ui.core.ValueState.None);
                oInput.setValueStateText();
                this.clearUIFieldsOnChangeFiscalYear();
            }
        },

        clearUIFieldsOnChangeFiscalYear: function () {
            let oView = this.getView();
            oView.byId("idCheque_DocumentNo").setValue();
            oView.byId("idCheque_SupplieName").setValue();
            oView.byId("idCheque_ChequeDate").setValue();
            oView.byId("idCheque_Amount").setValue();

            oView.byId("idRTGS_DocumentNo").setValue();
            oView.byId("idRTGS_SupplieName").setValue();
            oView.byId("idRTGS_ChequeDate").setValue();
            oView.byId("idRTGS_Amount").setValue();

            oView.byId("idBulkRTGS_DocumentNo").setValue();
            oView.byId("idBulkRTGS_SupplieName").setValue();
            oView.byId("idBulkRTGS_ChequeDate").setValue();
            oView.byId("idBulkRTGS_Amount").setValue();
        },
        loadAllData: function (that, sFiscalYear, fnSuccess) {
            const oModel = this.getView().getModel();
            const entitySet = "/MyEntitySet";
            const PAGE_SIZE = 2000; // backend limitation
            var aFinalFilter = new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("FiscalYear", sap.ui.model.FilterOperator.EQ, sFiscalYear.toString()),
                                    new sap.ui.model.Filter("CompanyCode", sap.ui.model.FilterOperator.EQ, "1100")
                                ],
                                and: true
                            });

         
            return new Promise((resolve, reject) => {

                // Step 1: Get count
                that.f4HelpModel.read("/CheckData/$count", {
                    filters: [aFinalFilter],
                    //urlParameters: { "$count": true },
                    success: (data, response) => {
                        const totalCount = Number(response.data);

                        let results = [];
                        let skip = 0;
                        
                        // Step 2: Load data in batches
                        const loadBatch = () => {
                        
                            that.f4HelpModel.read("/CheckData", {
                                 filters: [aFinalFilter],
                                urlParameters: {
                                    "$skip": skip,
                                    "$top": PAGE_SIZE
                                },
                                success: (res) => {
                                    results.push(...res.results);
                                    skip += PAGE_SIZE;

                                    if (skip < totalCount) {
                                        loadBatch(); // next batch
                                    } else {
                                        resolve(results); // all done
                                    }
                                },
                                error: reject
                            });
                        };

                        loadBatch();
                    },
                    error: reject
                });
            });
        },

        getDocumentNumDetails: function (that, sFiscalYear, fnSuccess) {
            this.loadAllData(that, sFiscalYear, fnSuccess).then((data) => {
                console.log("Final count:", data.length);
                that.aDocumentNumList = data.sort((a, b) => {
                        const dateA = new Date(a.DocumentDate);
                        const dateB = new Date(b.DocumentDate);
                        // Return comparison result (descending order)
                        return dateB - dateA;
                    });
                    const key = 'DocumentNumber';
                    that.uniqueDocumentNumList = [...new Map(that.aDocumentNumList.map(item =>
                        [item[key], item])).values()];
                    fnSuccess("Success");

            });


            // let sParameters = {
            //     "$top": 20000
            // };
            // var aFinalFilter = new sap.ui.model.Filter({
            //     filters: [
            //         new sap.ui.model.Filter("FiscalYear", sap.ui.model.FilterOperator.EQ, sFiscalYear.toString()),
            //         new sap.ui.model.Filter("CompanyCode", sap.ui.model.FilterOperator.EQ, "1100")
            //     ],
            //     and: true
            // });
            // that.f4HelpModel.read("/CheckData", {
            //     //filters: [filter],
            //     filters: [aFinalFilter],
            //     urlParameters: sParameters,
            //     success: function (oResponse) {
            //         that.aDocumentNumList = oResponse.results.sort((a, b) => {
            //             const dateA = new Date(a.DocumentDate);
            //             const dateB = new Date(b.DocumentDate);
            //             // Return comparison result (descending order)
            //             return dateB - dateA;
            //         });
            //         const key = 'DocumentNumber';
            //         that.uniqueDocumentNumList = [...new Map(that.aDocumentNumList.map(item =>
            //             [item[key], item])).values()];
            //         fnSuccess("Success");
            //     },
            //     error: function (oError) {
            //         fnSuccess("Error");
            //         MessageBox.error("Failed to load Document Number list");
            //         console.log(oError);
            //     }
            // });
        },
        getDocumentNumDetails1: function (that, sFiscalYear, fnSuccess) {
            that.aDocumentNumList = [];
            that.uniqueDocumentNumList = [];
            let sParameters = {
                "$top": 20000
            };
            var aFinalFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("FiscalYear", sap.ui.model.FilterOperator.EQ, sFiscalYear.toString()),
                    new sap.ui.model.Filter("CompanyCode", sap.ui.model.FilterOperator.EQ, "1100")
                ],
                and: true
            });
            that.f4HelpModel.read("/CheckData", {
                //filters: [filter],
                filters: [aFinalFilter],
                urlParameters: sParameters,
                success: function (oResponse) {
                    that.aDocumentNumList = oResponse.results.sort((a, b) => {
                        const dateA = new Date(a.DocumentDate);
                        const dateB = new Date(b.DocumentDate);
                        // Return comparison result (descending order)
                        return dateB - dateA;
                    });
                    const key = 'DocumentNumber';
                    that.uniqueDocumentNumList = [...new Map(that.aDocumentNumList.map(item =>
                        [item[key], item])).values()];
                    fnSuccess("Success");
                },
                error: function (oError) {
                    fnSuccess("Error");
                    MessageBox.error("Failed to load Document Number list");
                    console.log(oError);
                }
            });
        },
        documentNumValueHelp: function (oEvent) {
            try {
                let that = this;
                let oView = that.getView();
                let selectedInput = oEvent.getSource();
                let sFiscalYear = oView.byId("idFiscalYear").getValue();
                if (sFiscalYear === "") {
                    MessageToast.show("Select Fiscal Year");
                    return;
                }
                sFiscalYear = sFiscalYear.toString();
                oView.setBusy(true);
                that.getDocumentNumDetails(that, sFiscalYear, function (res) {
                    oView.setBusy(false);
                    if (res === "Error") {
                        return;
                    }
                    let oCustomListItem = new sap.m.StandardListItem({
                        active: true,
                        title: "{DocumentNumber}",
                        /*description: {
                            path: "DocumentDate",
                            formatter: function (s) {
                                return formatter.formatDate(s)
                            }
                        },*/
                        info: {
                            path: "DocumentDate",
                            formatter: function (s) {
                                return formatter.formatDate(s)
                            }
                        },
                    });

                    let oSelectDialog = new sap.m.SelectDialog({
                        title: "Select Document Number",
                        noDataText: "No Data",
                        width: "50%",
                        growing: true,
                        growingThreshold: 12,
                        growingScrollToLoad: true,
                        confirm: function (oEvent) {
                            let aContexts = oEvent.getParameter("selectedContexts");
                            if (aContexts.length) {
                                let selectedValue = aContexts.map(function (oContext) {
                                    return oContext.getObject();
                                });
                                selectedInput.setValue(selectedValue[0].DocumentNumber);
                                let sChequePrintType = oView.byId("idCBoxCheckPrintType").getSelectedKey();
                                if (sChequePrintType === "Cheque") {
                                    oView.byId("idCheque_SupplieName").setValue();
                                    oView.byId("idCheque_ChequeDate").setValue();
                                    oView.byId("idCheque_Amount").setValue();
                                    //Get suppliername for selected document number
                                    that.getSupplierName(sFiscalYear, selectedValue[0]);
                                }
                                else {
                                    oView.byId("idRTGS_SupplieName").setValue();
                                    that.setSelectedDocNumData(selectedValue[0]);
                                }
                            }
                        },
                        liveChange: function (oEvent) {
                            let sValue = oEvent.getParameter("value");
                            var oFilter = new sap.ui.model.Filter("DocumentNumber", sap.ui.model.FilterOperator.Contains, sValue);
                            /*let oFilter = new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("DocumentNumber", sap.ui.model.FilterOperator.Contains, sValue),
                                    new sap.ui.model.Filter("DocumentDate", sap.ui.model.FilterOperator.Contains, sValue)
                                ]
                            });*/

                            let oBinding = oEvent.getSource().getBinding("items");
                            oBinding.filter(oFilter);
                            //oBinding.filter([oFilter]);
                        }
                    });
                    let oModel = new sap.ui.model.json.JSONModel();
                    oModel.setData({
                        modelData: that.uniqueDocumentNumList
                    });
                    oSelectDialog.setModel(oModel);
                    oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                    oSelectDialog.open();
                });

            } catch (e) {
                oView.setBusy(false);
                console.log(e);
            }
        },

        getSupplierName: function (sFiscalYear, sDocumentNumData) {
            let that = this;
            let oView = this.getView();
            let sDocumentNumber = sDocumentNumData.DocumentNumber;
            oView.setBusy(true);
            var aFinalFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("AccountingDocument", sap.ui.model.FilterOperator.EQ, sDocumentNumber),
                    new sap.ui.model.Filter("CompanyCode", sap.ui.model.FilterOperator.EQ, "1100"),
                    new sap.ui.model.Filter("FiscalYear", sap.ui.model.FilterOperator.EQ, sFiscalYear.toString())
                ],
                and: true
            });
            that.f4HelpModel.read("/SupplierData", {
                filters: [aFinalFilter],
                //urlParameters: sParameters,
                success: function (oResponse) {
                    oView.setBusy(false);
                    if (oResponse.results && oResponse.results.length > 0) {
                        sDocumentNumData.SupplierName = oResponse.results[0].SupplierName;
                        that.setSelectedDocNumData(sDocumentNumData);
                    }
                    else {
                        MessageBox.error("No Supplier present for the selected Document Number");
                    }
                },
                error: function (oError) {
                    oView.setBusy(false);
                    MessageBox.error("Failed to load Suplier Name");
                }
            });
        },

        setSelectedDocNumData: function (documentNumData) {
            let oView = this.getView();
            let oDateFormat = DateFormat.getInstance({
                pattern: "MMM dd, yyyy"
            });
            let sChequePrintType = oView.byId("idCBoxCheckPrintType").getSelectedKey();
            if (sChequePrintType === "Cheque") {
                oView.byId("idCheque_SupplieName").setValue(documentNumData.SupplierName);
                oView.byId("idCheque_ChequeDate").setValue(oDateFormat.format(new Date(documentNumData.DocumentDate)));
                let amount = parseFloat(documentNumData.Amount);
                amount = amount.toFixed(2);
                oView.byId("idCheque_Amount").setValue(amount);
            }
            else if (sChequePrintType === "RTGS") {
                //oView.byId("idRTGS_SupplieName").setValue(documentNumData.SupplierName);
                oView.byId("idRTGS_ChequeDate").setValue(oDateFormat.format(new Date(documentNumData.DocumentDate)));
                let amount = parseFloat(documentNumData.Amount);
                amount = amount.toFixed(2);
                oView.byId("idRTGS_Amount").setValue(amount);
            }
            else {
                //oView.byId("idBulkRTGS_SupplieName").setValue(documentNumData.SupplierName);
                //oView.byId("idBulkRTGS_ChequeDate").setValue(oDateFormat.format(new Date(documentNumData.DocumentDate)));
                let totalAmount = parseFloat(documentNumData.TotalAmount);
                totalAmount = totalAmount.toFixed(2);
                oView.byId("idBulkRTGS_Amount").setValue(totalAmount);
            }
        },

        //Pint Bulk RTGS Cheque (multi-select) //

        onValueHelpBulkRTGS: function (oEvent) {
            let that = this;
            let oView = that.getView();
            let selectedInput = oEvent.getSource();
            let sFiscalYear = oView.byId("idFiscalYear").getValue();
            if (sFiscalYear === "") {
                MessageToast.show("Select Fiscal Year");
                return;
            }
            sFiscalYear = sFiscalYear.toString();
            oView.setBusy(true);
            that.getDocumentNumDetails(that, sFiscalYear, function (res) {
                oView.setBusy(false);
                if (res === "Error") {
                    return;
                }
                if (!that._oMutiSelectDialog) {
                    that._oMutiSelectDialog = new sap.m.SelectDialog({
                        title: "Select Document Numbers",
                        multiSelect: true,
                        //search: that.onSearchDialog.bind(this),
                        //confirm: that.onConfirmDialog.bind(that),
                        cancel: that.onCancelDialog.bind(that),
                        items: {
                            path: "/items",
                            template: new sap.m.StandardListItem({
                                title: "{DocumentNumber}",
                                //description: "{id}",
                                info: {
                                    path: "DocumentDate",
                                    formatter: function (s) {
                                        return formatter.formatDate(s)
                                    }
                                },
                                selected: "{isSelected}",
                                type: "Active"
                            })
                        },
                        confirm: function (oEvent) {
                            let aContexts = oEvent.getParameter("selectedContexts");
                            if (aContexts.length) {
                                let selectedValue = aContexts.map(function (oContext) {
                                    return oContext.getObject();
                                });
                                let totalAmount = 0;
                                let docNumArray = [];
                                selectedValue.forEach(item => {
                                    totalAmount = totalAmount + parseFloat(item.Amount);
                                    docNumArray.push(item.DocumentNumber);
                                });
                                let sDocNumbers = docNumArray.join(", ");
                                selectedInput.setValue(sDocNumbers);
                                oView.byId("idBulkRTGS_SupplieName").setValue();
                                oView.byId("idBulkRTGS_ChequeDate").setValue();
                                selectedValue[0].TotalAmount = totalAmount;
                                that.setSelectedDocNumData(selectedValue[0]);
                            }
                        },
                        liveChange: function (oEvent) {
                            let sValue = oEvent.getParameter("value");
                            var oFilter = new sap.ui.model.Filter("DocumentNumber", sap.ui.model.FilterOperator.Contains, sValue);
                            /*let oFilter = new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("DocumentNumber", sap.ui.model.FilterOperator.Contains, sValue),
                                    new sap.ui.model.Filter("DocumentDate", sap.ui.model.FilterOperator.Contains, sValue)
                                ]
                            });*/

                            let oBinding = oEvent.getSource().getBinding("items");
                            oBinding.filter(oFilter);
                            //oBinding.filter([oFilter]);
                        }
                    });
                    oView.addDependent(that._oMutiSelectDialog);
                }

                let selectedValues = selectedInput.getValue();
                if (selectedValues !== "") {
                    selectedValues = selectedValues.split(", ");
                    selectedValues.forEach(item => {
                        const index = that.uniqueDocumentNumList.findIndex(value => {
                            return item === value.DocumentNumber;
                        });
                        that.uniqueDocumentNumList[index] = { ...that.uniqueDocumentNumList[index], isSelected: true };
                    });
                }

                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    items: that.uniqueDocumentNumList
                });
                that._oMutiSelectDialog.setModel(oModel);
                //that._oMutiSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);

                that._oMutiSelectDialog.open();

                //let allDocumentItems = that._oMutiSelectDialog.getModel().getData().items;


            });
        },

        onSearchDialog: function (oEvent) {
            const sValue = oEvent.getParameter("value").toLowerCase();
            const aFilters = [];

            if (sValue) {
                aFilters.push(new sap.ui.model.Filter([
                    new sap.ui.model.Filter("DocumentNumber", sap.ui.model.FilterOperator.Contains, sValue),
                    //new sap.ui.model.Filter("id", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("DocumentDate", sap.ui.model.FilterOperator.Contains, sValue)
                ], false));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmDialog: function (oEvent) {
            const aContexts = oEvent.getParameter("selectedContexts");
            const aSelected = aContexts.map(ctx => ctx.getObject().name);
            const sSelectedText = aSelected.join(", ");

            this.getView().getModel("BulkRTGSModel").setProperty("/selectedItemsText", sSelectedText);
            //this.getView().byId("idBulkRTGS_DocumentNo").setValue();
        },

        onCancelDialog: function () {
            this._oMutiSelectDialog.getBinding("items").filter([]); // reset filters
        },

        // END //

        printBankCheque: function () {
            let oView = this.getView();
            let sBank = oView.byId("idCBoxBank").getSelectedKey();
            let sChequePrintType = oView.byId("idCBoxCheckPrintType").getSelectedKey();
            let sFiscalYear = oView.byId("idFiscalYear").getValue();
            if ((!sBank) || (!sChequePrintType) || sFiscalYear === "") {
                MessageToast.show("Enter All Mandatory Fields");
                return;
            }
            let documentNumber, supplierName, chequeDate, chequeAmount;
            if (sChequePrintType === "Cheque") {
                documentNumber = oView.byId("idCheque_DocumentNo").getValue();
                supplierName = oView.byId("idCheque_SupplieName").getValue();
                chequeDate = oView.byId("idCheque_ChequeDate").getValue();
                chequeAmount = oView.byId("idCheque_Amount").getValue();
            }
            else if (sChequePrintType === "RTGS") {
                documentNumber = oView.byId("idRTGS_DocumentNo").getValue();
                supplierName = oView.byId("idRTGS_SupplieName").getValue();
                chequeDate = oView.byId("idRTGS_ChequeDate").getValue();
                chequeAmount = oView.byId("idRTGS_Amount").getValue();
            }
            else {
                documentNumber = oView.byId("idBulkRTGS_DocumentNo").getValue();
                supplierName = oView.byId("idBulkRTGS_SupplieName").getValue();
                chequeDate = oView.byId("idBulkRTGS_ChequeDate").getValue();
                chequeAmount = oView.byId("idBulkRTGS_Amount").getValue();
            }

            if (documentNumber === "" || supplierName === "" || chequeDate === "" || chequeAmount === "") {
                MessageToast.show("Fill the Cheque Details");
                return;
            }
            else {
                this.onViewQR(sBank, supplierName, chequeDate, chequeAmount);
            }
        },

        onViewQR: function (sBank, supplierName, chequeDate, chequeAmount) {
            const date = new Date(chequeDate);
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
            const yyyy = date.getFullYear();
            const formattedDate = `${dd}${mm}${yyyy}`;
            const splitChequeDate = formattedDate.split('');
            const dateOfCheque = `${dd}-${mm}-${yyyy}`;

            let that = this;
            let oQRCodeBox = this.getView().byId("idVBox_QRCode");
            oQRCodeBox.setVisible(true);
            const oHtmlComp = new sap.ui.core.HTML({
                content: '<canvas id="qrCanvas" width="200" height="200" style="display:none;"></canvas>'
            });
            oQRCodeBox.addItem(oHtmlComp);
            setTimeout(function () {
                that._generatePDF(that, sBank, supplierName, splitChequeDate, chequeAmount, dateOfCheque);
                oQRCodeBox.setVisible(false);
            }, 200);
        },

        _generatePDF: function (that, sBank, supplierName, splitChequeDate, chequeAmount, dateOfCheque) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [200, 100]);

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(10);
            doc.setTextColor('#000');
            let sValue = that.getView().byId("idCBoxCheckPrintType").getValue();
            let printType = "";
            if (sValue === "Cheque") {
                printType = "Cheque";
            }
            else if (sValue === "RTGS" || sValue === "Bulk RTGS") {
                printType = "RTGS";
            }

            if (sBank === "SBI") {
                //Date (left, top, value)
                doc.text(159, 9.5, splitChequeDate[0]);
                doc.text(164, 9.5, splitChequeDate[1]);
                doc.text(169, 9.5, splitChequeDate[2]);
                doc.text(174.5, 9.5, splitChequeDate[3]);
                doc.text(179, 9.5, splitChequeDate[4]);
                doc.text(184.5, 9.5, splitChequeDate[5]);
                doc.text(189, 9.5, splitChequeDate[6]);
                doc.text(194.5, 9.6, splitChequeDate[7]);

                //vendor name
                doc.text(21, 23, supplierName);
                //amount in word
                //doc.text(38, 31, 'Seventy Seven Crore Seventy Seven Lakh Seventy Seven Thousand Seven Hundred Seventy Three Only');
                let amountInWord = this.convertNumberToWords(chequeAmount);
                if (amountInWord.length > 76 && amountInWord.includes(" and ")) {
                    let amountInWord1 = amountInWord.split(" and ");
                    doc.text(38, 31, (amountInWord1[0] + " and"));
                    doc.text(38, 37, amountInWord1[1]);
                }
                else {
                    doc.text(38, 31, amountInWord);
                }

                //amount in digit
                doc.text(160, 37, chequeAmount);

                //A/c Payee
                doc.text(94, 45, "A/C PAYEE");

            }
            else if (sBank === "ICICI") {
                doc.text(161, 9, splitChequeDate[0]);
                doc.text(166, 9, splitChequeDate[1]);
                doc.text(171.5, 9, splitChequeDate[2]);
                doc.text(176.5, 9, splitChequeDate[3]);
                doc.text(181.5, 9, splitChequeDate[4]);
                doc.text(186.5, 9, splitChequeDate[5]);
                doc.text(191.5, 9, splitChequeDate[6]);
                doc.text(196.5, 9, splitChequeDate[7]);

                //vendor name
                doc.text(23, 23, supplierName);
                //amount in word
                let amountInWord = this.convertNumberToWords(chequeAmount);
                if (amountInWord.length > 76 && amountInWord.includes(" and ")) {
                    let amountInWord1 = amountInWord.split(" and ");
                    doc.text(28, 31, (amountInWord1[0] + " and"));
                    doc.text(28, 37, amountInWord1[1]);
                }
                else {
                    doc.text(28, 31, amountInWord);
                }

                //amount in digit
                doc.text(166, 37, chequeAmount);

                //A/c Payee
                doc.text(94, 49, "A/C PAYEE");

            }
            else if (sBank === "MGB") {
                doc.text(159, 12.7, splitChequeDate[0]);
                doc.text(164.5, 12.7, splitChequeDate[1]);
                doc.text(169.5, 12.7, splitChequeDate[2]);
                doc.text(174.5, 12.7, splitChequeDate[3]);
                doc.text(179.5, 12.7, splitChequeDate[4]);
                doc.text(184.5, 12.7, splitChequeDate[5]);
                doc.text(189.5, 12.7, splitChequeDate[6]);
                doc.text(194.5, 12.7, splitChequeDate[7]);

                //vendor name
                doc.text(23, 23.5, supplierName);
                //amount in word
                let amountInWord = this.convertNumberToWords(chequeAmount);
                if (amountInWord.length > 76 && amountInWord.includes(" and ")) {
                    let amountInWord1 = amountInWord.split(" and ");
                    doc.text(41, 31.5, (amountInWord1[0] + " and"));
                    doc.text(41, 39.5, amountInWord1[1]);
                }
                else {
                    doc.text(41, 31.5, amountInWord);
                }

                //amount in digit
                doc.text(163, 39.5, chequeAmount);

                //A/c Payee
                doc.text(94, 49, "A/C PAYEE");

            }

            // Save the PDF to a file
            doc.save(`${sBank}_${printType}_${supplierName}_${dateOfCheque}.pdf`);

            this.clearUIFieldsAfterPrintCheque();
        },

        convertNumberToWords: function (amount) {
            const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
            const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
                'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
                'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            const places = ['', 'Thousand', 'Lakh', 'Crore'];

            function getWord(n) {
                if (n < 10) return singleDigits[n];
                else if (n < 20) return twoDigits[n - 10];
                else return tensMultiple[Math.floor(n / 10)] + (n % 10 ? ' ' + singleDigits[n % 10] : '');
            }

            function numToWords(num) {
                if (num === 0) return 'Zero';

                let words = '';
                let placeValues = [];

                // Split the number as per Indian Numbering System
                placeValues.push(num % 1000);  // hundreds
                num = Math.floor(num / 1000);

                while (num > 0) {
                    placeValues.push(num % 100);
                    num = Math.floor(num / 100);
                }

                for (let i = placeValues.length - 1; i >= 0; i--) {
                    let part = placeValues[i];
                    if (part === 0) continue;

                    if (i === 0) {
                        // Handle hundreds
                        if (part > 99) {
                            words += singleDigits[Math.floor(part / 100)] + ' Hundred ';
                            part %= 100;
                        }
                        if (part > 0) {
                            words += getWord(part) + ' ';
                        }
                    } else {
                        words += getWord(part) + ' ' + places[i] + ' ';
                    }
                }

                return words.trim();
            }

            // Handle decimal / paisa
            let [rupeesPart, paisaPart] = amount.toString().split('.');

            // let result = 'Rupees ' + numToWords(parseInt(rupeesPart));
            let result = numToWords(parseInt(rupeesPart));
            //let result = numToWords(parseInt(rupeesPart)) + " Rupees";
            if (paisaPart && parseInt(paisaPart) > 0) {
                paisaPart = paisaPart.substring(0, 2);  // take only 2 decimal places
                //result += ' and ' + numToWords(parseInt(paisaPart)) + ' Paise';
                result += ' Rupees and ' + numToWords(parseInt(paisaPart)) + ' Paise';
            }

            result += ' Only';

            return result;
        },

        clearUIFieldsAfterPrintCheque: function () {
            let oView = this.getView();
            oView.byId("idCBoxBank").setSelectedKey();
            oView.byId("idCBoxBank").setValue();

            oView.byId("idCBoxCheckPrintType").setSelectedKey();
            oView.byId("idCBoxCheckPrintType").setValue();

            oView.byId("idCheque_DocumentNo").setValue();
            oView.byId("idCheque_SupplieName").setValue();
            oView.byId("idCheque_ChequeDate").setValue();
            oView.byId("idCheque_Amount").setValue();

            oView.byId("idRTGS_DocumentNo").setValue();
            oView.byId("idRTGS_SupplieName").setValue();
            oView.byId("idRTGS_ChequeDate").setValue();
            oView.byId("idRTGS_Amount").setValue();

            oView.byId("idBulkRTGS_DocumentNo").setValue();
            oView.byId("idBulkRTGS_SupplieName").setValue();
            oView.byId("idBulkRTGS_ChequeDate").setValue();
            oView.byId("idBulkRTGS_Amount").setValue();

            this.byId("idPanelCheque").setVisible(false);
            this.byId("idPanelRTGS").setVisible(false);
            this.byId("idPanelBulkRTGS").setVisible(false);
        },

    });
});