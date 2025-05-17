sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.invertions.sapfiorimodinv.controller.Invertions", {
        onInit: function () {
            const oData = {
                symbols: [
                    { symbol: "AAPL", name: "Apple Inc." },
                    { symbol: "GOOGL", name: "Alphabet Inc." },
                    { symbol: "TSLA", name: "Tesla Inc." }
                ]
            };
            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        },

        onCompanyPress: function (oEvent) {
            const oItem = oEvent.getParameter("listItem"); // ← Esta es la línea clave
            const sSymbol = oItem.getBindingContext().getProperty("symbol");

            this.getOwnerComponent().getRouter().navTo("RouteInvertions", {
                symbol: sSymbol
            });
        }

    });
});
