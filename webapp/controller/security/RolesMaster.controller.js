/* eslint-disable valid-jsdoc */
/* eslint-disable linebreak-style */
/* eslint-disable no-console */
/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable fiori-custom/sap-no-localhost */
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

    //===================================================
    //============== INICIALIZACIÓN =====================
    //===================================================
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

    /**
     * Inicializa modelos del controlador
     */
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

    //===================================================
    //============ CARGA DE CATÁLOGOS ===================
    //===================================================
    loadCatalogsOnce: async function () {
      if (this._catalogsLoaded) return;
      await this.loadCatalog("IdProcesses", "processCatalogModel");
      await this.loadCatalog("IdPrivileges", "privilegeCatalogModel");
      this._catalogsLoaded = true;
    },

    loadCatalog: async function (labelId, modelName) {
      try {
        const env = await fetch("env.json").then(r => r.json());
        const response = await fetch(env.API_VALUES_URL_BASE + `getallvalues?LABELID=${labelId}`);
        const data = await response.json();
        const values = data?.value || [];
        this.getView().setModel(new JSONModel({ values }), modelName);
      } catch (err) {
        Log.error(`Error al cargar catálogo ${labelId}`, err);
      }
    },

    //===================================================
    //================ CARGA DE ROLES ===================
    //===================================================
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

    //===================================================
    //=================== FILTRADO ======================
    //===================================================
    onSearchRole: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oModel = this.getView().getModel("roles");
      const aAll = oModel.getProperty("/valueAll") || [];
      const sKey = this.getView().getModel("viewModel").getProperty("/filterKey");

      const filtered = aAll.filter(r => {
        const matchesName = r.ROLENAME.toLowerCase().includes(sQuery);
        if (sKey === "active") return matchesName && r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED;
        if (sKey === "inactive") return matchesName && !r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED;
        return matchesName && !r.DETAIL_ROW?.DELETED;
      });

      oModel.setProperty("/value", filtered);
    },

    onChangeFilter: function (oEvent) {
      const key = oEvent.getSource().getSelectedKey();
      const oModel = this.getView().getModel("roles");
      const all = oModel.getProperty("/valueAll") || [];
      let filtered = [];

      switch (key) {
        case "active":
          filtered = all.filter(r => r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
          break;
        case "inactive":
          filtered = all.filter(r => !r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
          break;
        default:
          filtered = all.filter(r => !r.DETAIL_ROW?.DELETED);
      }

      this.getView().getModel("viewModel").setProperty("/filterKey", key);
      oModel.setProperty("/value", filtered);
    },

    //===================================================
    //================ CREAR ROL ========================
    //===================================================
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

    onDialogClose: function () {
      if (this._pDialog) {
        this._pDialog.close();
      }
    },

    onAddPrivilege: function () {
      const oModel = this.getView().getModel("newRoleModel");
      const oData = oModel.getData();

      if (!oData.NEW_PROCESSID || !Array.isArray(oData.NEW_PRIVILEGES) || oData.NEW_PRIVILEGES.length === 0) {
        MessageToast.show("Selecciona proceso y al menos un privilegio.");
        return;
      }

      oData.PRIVILEGES.push({
        PROCESSID: oData.NEW_PROCESSID,
        PRIVILEGEID: oData.NEW_PRIVILEGES
      });

      oData.NEW_PROCESSID = "";
      oData.NEW_PRIVILEGES = [];
      oModel.setData(oData);
    },

    onRemovePrivilege: function (oEvent) {
      const oModel = this.getView().getModel("newRoleModel");
      const oData = oModel.getData();
      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext("newRoleModel");
      const iIndex = oContext.getPath().split("/").pop();

      oData.PRIVILEGES.splice(iIndex, 1);
      oModel.setData(oData);
    },

    onSaveRole: async function () {
      const oView = this.getView();
      const oData = oView.getModel("newRoleModel").getData();

      if (!oData.ROLEID || !oData.ROLENAME) {
        MessageToast.show("ID y Nombre del Rol son obligatorios.");
        return;
      }

      try {
        const env = await fetch("env.json").then(r => r.json());

        const response = await fetch(env.API_ROLES_URL_BASE + "addonerole", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: {
              ROLEID: oData.ROLEID,
              ROLENAME: oData.ROLENAME,
              DESCRIPTION: oData.DESCRIPTION,
              PRIVILEGES: oData.PRIVILEGES
            }
          })
        });

        if (!response.ok) throw new Error(await response.text());

        MessageToast.show("Rol guardado correctamente.");

        if (this._pDialog) {
          this._pDialog.close();
        }

        this.loadRoles();

      } catch (err) {
        MessageBox.error("Error al guardar el rol: " + err.message);
      }
    },

    //===================================================
    //================ DETALLE DE ROL ===================
    //===================================================
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
      const sId = encodeURIComponent(oRole.ROLEID);

      try {
        const env = await fetch("env.json").then(r => r.json());

        const res = await fetch(env.API_ROLES_URL_BASE + `getallroles?ROLEID=${sId}`);
        const result = await res.json();

        if (!result?.ROLEID) {
          MessageBox.warning("No se encontró información del rol.");
          return;
        }

        this.getOwnerComponent().setModel(new JSONModel(result), "selectedRole");
      } catch (e) {
        MessageBox.error("Error al obtener el rol: " + e.message);
      }
    },

    onMultiSearch: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oBinding = this.byId("rolesTable").getBinding("rows");
      const aFilters = sQuery ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)] : [];
      oBinding.filter(aFilters);
    }

  });
});
