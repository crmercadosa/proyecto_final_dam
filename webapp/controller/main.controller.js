sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("com.invertions.sapfiorimodinv.controller.Main", {

    onInit: function () {
      // Inicialización si se necesita
    },

    onGoToInvertions: function () {
      this.getOwnerComponent().getRouter().navTo("RouteInvertionsCompanies");
    },

    onGoToRoles: function () {
      this.getOwnerComponent().getRouter().navTo("RouteRolesMaster");
    },

    onGoToUsers: function () {
      this.getOwnerComponent().getRouter().navTo("RouteUsersList");
    }

  });
});
