/* eslint-disable valid-jsdoc */
/* eslint-disable linebreak-style */
/* eslint-disable no-console */
/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable fiori-custom/sap-no-localhost */
sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (
  BaseController,
  JSONModel,
  Fragment,
  MessageToast,
  MessageBox
) {
  "use strict";

  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesMaster", {

    onInit: function () {
      var oViewModel = new JSONModel({
        buttonsEnabled: false,
        filterKey: "active"
      });
      this.getView().setModel(oViewModel, "viewModel");

      this._catalogsLoaded = false;
      this.selectedRole = null;

      this.initModels();
      this.loadRoles();
    },

    initModels: function () {
      var oView = this.getView();
      oView.setModel(new JSONModel(), "selectedRole");
      oView.setModel(new JSONModel({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: []
      }), "newRoleModel");
    },

    // =================== CARGA DE CATÁLOGOS ===================
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
        MessageToast.show("Error al cargar catálogo: " + err.message);
      }
    },

    // =================== CARGA DE ROLES ===================
    loadRoles: function () {
      var oView = this.getView();
      var oRolesModel = new JSONModel();
      fetch("env.json")
        .then(res => res.json())
        .then(env => fetch(env.API_ROLES_URL_BASE + "getallroles"))
        .then(res => res.json())
        .then(data => {
          var roles = data.value || [];
          // Muestra TODOS los roles, activos e inactivos
          oRolesModel.setData({ valueAll: roles, value: roles });
          oView.setModel(oRolesModel, "roles");
        })
        .catch(err => {
          MessageToast.show("Error al cargar roles: " + err.message);
        });
    },

    // =================== SELECCIÓN DE FILA ===================
    onRoleSelected: function () { // <--- CAMBIA ESTE NOMBRE
      var oTable = this.byId("rolesTable");
      var iSelectedIndex = oTable.getSelectedIndex();

      if (iSelectedIndex < 0) {
        this.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
        this.selectedRole = null;
        return;
      }

      var oContext = oTable.getContextByIndex(iSelectedIndex);
      var RoleData = oContext.getObject();

      this.selectedRole = RoleData;
      this.getView().getModel("viewModel").setProperty("/buttonsEnabled", true);

      // Mostrar detalle si tienes split view
      var oRolesView = this.getView().getParent().getParent();
      var oUiStateModel = oRolesView.getModel("uiState");
      if (oUiStateModel) oUiStateModel.setProperty("/isDetailVisible", true);

      var roleId = RoleData.ROLEID;
      var oDetailView = sap.ui.getCore().byId("container-com.invertions.sapfiorimodinv---rolesSplitter--rolesDetailView");
      if (oDetailView && oDetailView.getController) {
        oDetailView.getController().loadRoleDetails(roleId);
      }
    },

    unSelectedRow: function () {
      var oTable = this.byId("rolesTable");
      oTable.setSelectedIndex(-1);
      this.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
      this.selectedRole = null;
    },

    // =================== CREAR ROL ===================
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
          id: this.getView().getId(),
          name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
          controller: this
        });
        this.getView().addDependent(this._pDialog);
      }

      this._pDialog.setTitle("Crear Rol");
      this._pDialog.open();
    },

    // =================== EDITAR ROL ===================
    onUpdateRole: async function () {
      var oTable = this.byId("rolesTable");
      var iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) {
        MessageToast.show("Selecciona un rol para editar.");
        return;
      }

      var oRole = oTable.getContextByIndex(iIndex).getObject();
      await this.loadCatalogsOnce();

      this.getView().getModel("newRoleModel").setData({
        ROLEID: oRole.ROLEID,
        ROLENAME: oRole.ROLENAME,
        DESCRIPTION: oRole.DESCRIPTION,
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: oRole.PRIVILEGES || []
      });

      if (!this._pDialog) {
        this._pDialog = await Fragment.load({
          id: this.getView().getId(),
          name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
          controller: this
        });
        this.getView().addDependent(this._pDialog);
      }

      this._pDialog.setTitle("Editar Rol");
      this._pDialog.open();
    },

    // =================== ELIMINAR ROL ===================
    onDeleteRole: function () {
      if (!this.selectedRole) {
        MessageToast.show("Selecciona un rol para eliminar.");
        return;
      }
      var that = this;
      MessageBox.confirm(
        "¿Seguro que deseas eliminar el rol \"" + this.selectedRole.ROLENAME + "\"?",
        {
          title: "Confirmar eliminación",
          icon: MessageBox.Icon.WARNING,
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that.deleteRole(that.selectedRole.ROLEID);
            }
          }
        }
      );
    },

    deleteRole: function (roleId) {
      var that = this;
      fetch("env.json")
        .then(res => res.json())
        .then(env => fetch(env.API_ROLES_URL_BASE + "delrolephysically", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ROLEID: roleId })
        }))
        .then(response => {
          if (!response.ok) throw new Error("Error en la eliminación del rol");
          MessageToast.show("Rol eliminado correctamente");
          that.loadRoles();
          that.unSelectedRow();
        })
        .catch(err => {
          MessageToast.show("Error al eliminar rol: " + err.message);
          that.unSelectedRow();
        });
    },

    // =================== DESACTIVAR ROL ===================
    onDesactivateRole: function () {
      if (!this.selectedRole) {
        MessageToast.show("Selecciona un rol para desactivar.");
        return;
      }
      var that = this;
      MessageBox.confirm(
        "¿Deseas desactivar el rol con nombre: " + this.selectedRole.ROLENAME + "?",
        {
          title: "Confirmar desactivación",
          icon: MessageBox.Icon.WARNING,
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that.desactivateRole(that.selectedRole.ROLEID);
            }
          }
        }
      );
    },

    desactivateRole: function (roleId) {
      var that = this;
      fetch("env.json")
        .then(res => res.json())
        .then(env => fetch(env.API_ROLES_URL_BASE + "delrolelogically?ROLEID=" + roleId + "&REGUSER=admin", {
          method: "POST"
        }))
        .then(response => {
          if (!response.ok) throw new Error("Error al desactivar el rol");
          MessageToast.show("Rol desactivado correctamente");
          that.loadRoles();
          that.unSelectedRow();
        })
        .catch(err => {
          MessageToast.show("Error al desactivar rol: " + err.message);
          that.unSelectedRow();
        });
    },

    // =================== GUARDAR ROL ===================
    onSaveRole: async function () {
      var oView = this.getView();
      var oData = oView.getModel("newRoleModel").getData();

      if (!oData.ROLEID || !oData.ROLENAME) {
        MessageToast.show("ID y Nombre del Rol son obligatorios.");
        return;
      }

      try {
        const env = await fetch("env.json").then(r => r.json());

        // Detecta si es edición (ya existe el rol) o creación (nuevo)
        var isEdit = false;
        var rolesModel = oView.getModel("roles");
        if (rolesModel) {
          var allRoles = rolesModel.getProperty("/valueAll") || [];
          isEdit = allRoles.some(r => r.ROLEID === oData.ROLEID);
        }

        let response;
        if (isEdit) {
          // EDICIÓN
          response = await fetch(env.API_ROLES_URL_BASE + "updateonerole?ROLEID=" + encodeURIComponent(oData.ROLEID), {
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
        } else {
          // CREACIÓN
          response = await fetch(env.API_ROLES_URL_BASE + "addonerole", {
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
        }

        if (!response.ok) throw new Error(await response.text());

        MessageToast.show(isEdit ? "Rol actualizado correctamente." : "Rol creado correctamente.");

        if (this._pDialog) {
          this._pDialog.close();
        }

        this.loadRoles();
        this.unSelectedRow();

      } catch (err) {
        MessageBox.error("Error al guardar el rol: " + err.message);
      }
    },

    // =================== AGREGAR/QUITAR PRIVILEGIOS ===================
    onAddPrivilege: function () {
      var oModel = this.getView().getModel("newRoleModel");
      var oData = oModel.getData();

      if (!oData.NEW_PROCESSID || !Array.isArray(oData.NEW_PRIVILEGES) || oData.NEW_PRIVILEGES.length === 0) {
        MessageToast.show("Selecciona proceso y al menos un privilegio.");
        return;
      }

      oData.PRIVILEGES.push({
        PROCESSID: oData.NEW_PROCESSID,
        PRIVILEGEID: oData.NEW_PRIVILEGES.slice()
      });

      oData.NEW_PROCESSID = "";
      oData.NEW_PRIVILEGES = [];
      oModel.setData(oData);
    },

    onRemovePrivilege: function (oEvent) {
      var oModel = this.getView().getModel("newRoleModel");
      var oData = oModel.getData();
      var oItem = oEvent.getSource().getParent();
      var oContext = oItem.getBindingContext("newRoleModel");
      var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);

      if (!isNaN(iIndex)) {
        oData.PRIVILEGES.splice(iIndex, 1);
        oModel.setData(oData);
      }
    },

    // =================== CERRAR MODAL ===================
    onDialogClose: function () {
      if (this._pDialog) {
        this._pDialog.close();
      }
    },

    // =================== FILTRO DE BÚSQUEDA ===================
    onMultiSearch: function () {
      var sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      var oBinding = this.byId("rolesTable").getBinding("rows");
      var aFilters = sQuery ? [new sap.ui.model.Filter("ROLENAME", sap.ui.model.FilterOperator.Contains, sQuery)] : [];
      oBinding.filter(aFilters);
    }
  });
});