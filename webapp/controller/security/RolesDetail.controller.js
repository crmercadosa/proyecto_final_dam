sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesDetail", {

    onInit: function () {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("RouteRolesDetail").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      const sRoleId = decodeURIComponent(oEvent.getParameter("arguments").roleId);
      this.loadRoleDetail(sRoleId);
    },

    loadRoleDetail: async function (roleId) {
      try {
        const env = await fetch("env.json").then(res => res.json());
        const res = await fetch(`${env.API_ROLES_URL_BASE}getroledetails?ROLEID=${roleId}`);
        const data = await res.json();

        const role = data?.value?.[0];

        if (!role || !role.ROLEID) {
          MessageBox.warning("No se encontró información del rol.");
          return;
        }

        const oModel = new JSONModel(role);
        this.getView().setModel(oModel, "selectedRole");

      } catch (e) {
        console.error("Error al cargar detalles del rol:", e);
        MessageToast.show("No se pudo cargar el detalle del rol.");
      }
    }

  });
});
