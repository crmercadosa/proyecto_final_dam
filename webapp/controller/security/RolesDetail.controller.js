sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/base/Log",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment"
], function (
  BaseController,
  JSONModel,
  Log,
  MessageToast,
  MessageBox,
  Filter,
  FilterOperator,
  Fragment
) {
  "use strict";

  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesMaster", {

    onInit: function () {
      this._catalogsLoaded = false;
      this.initModels();

      const oViewModel = new JSONModel({
        filterKey: "active"
      });
      this.getView().setModel(oViewModel, "viewModel");

      this.loadRoles();

      if (!this._pDialog) {
        Fragment.load({
          name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
          controller: this
        }).then(oDialog => {
          this.getView().addDependent(oDialog);
          this._pDialog = oDialog;
        });
      }
    },

    initModels: function () {
      const view = this.getView();

      view.setModel(new JSONModel(), "selectedRole");

      view.setModel(new JSONModel({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: []
      }), "newRoleModel");
    },

    loadRoles: function () {
      const oView = this.getView();
      const oRolesModel = new JSONModel();

      fetch("env.json")
        .then(res => res.json())
        .then(env => fetch(env.API_ROLES_URL_BASE + "getallroles"))
        .then(res => res.json())
        .then(data => {
          const roles = data.value || [];
          const activos = roles.filter(r => r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
          oRolesModel.setData({ valueAll: roles, value: activos });
          oView.setModel(oRolesModel, "roles");
        })
        .catch(err => {
          MessageToast.show("Error al cargar roles: " + err.message);
        });
    },

    onRoleSelected: async function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) {
        MessageToast.show("Selecciona un rol válido.");
        return;
      }

      const oRolesView = this.getView().getParent().getParent();
      const oUiStateModel = oRolesView.getModel("uiState");
      if (oUiStateModel) oUiStateModel.setProperty("/isDetailVisible", true);

      const oRole = oTable.getContextByIndex(iIndex).getObject();
      const roleId = oRole.ROLEID;

      // Busca el XMLView del detalle
      const oDetailView = sap.ui.getCore().byId("container-com.invertions.sapfiorimodinv---rolesSplitter--rolesDetailView");
      if (oDetailView && oDetailView.getController) {
        const oDetailController = oDetailView.getController();
        if (oDetailController.loadRoleDetails) {
          oDetailController.loadRoleDetails(roleId);
        } else {
          console.error("El método loadRoleDetails no está definido en el controlador de RolesDetail.");
        }
      } else {
        console.error("No se encontró el XMLView de detalle o su controlador.");
      }
    },

    onMultiSearch: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oBinding = this.byId("rolesTable").getBinding("rows");
      const aFilters = sQuery ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)] : [];
      oBinding.filter(aFilters);
    },

    loadRoleDetails: async function (roleId) {
      try {
        const env = await fetch("env.json").then(r => r.json());
        const res = await fetch(env.API_ROLES_URL_BASE + `getroledetails?ROLEID=${encodeURIComponent(roleId)}`);
        const result = await res.json();

        const roleDetail = Array.isArray(result.value) ? result.value[0] : result;

        if (!roleDetail?.ROLEID) {
          MessageBox.warning("No se encontró información del rol.");
          return;
        }

        this.getView().setModel(new JSONModel(roleDetail), "selectedRole");
      } catch (e) {
        MessageBox.error("Error al obtener el detalle del rol: " + e.message);
      }
    },

    onOpenDialog: async function () {
      await this.loadCatalogsOnce();

      this.getView().getModel("newRoleModel").setData({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: []
      });

      // Verifica si el diálogo ya existe
      if (!this._pDialog) {
        this._pDialog = await Fragment.load({
          name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
          controller: this
        });
        this.getView().addDependent(this._pDialog);
      }

      this._pDialog.setTitle("Crear Rol");
      this._pDialog.open();
    },

    onNavToCatalogs: function () {
      this.getRouter().navTo("RouteCatalogs");
    },

    onNavToUsers: function () {
      this.getRouter().navTo("RouteUsersList");
    },

    formatPrivileges: function(aPrivs) {
      if (!aPrivs || !Array.isArray(aPrivs)) return "";
      return aPrivs.map(p => p.PRIVILEGENAME || p.PRIVILEGEID).join(", ");
    },
  });
});