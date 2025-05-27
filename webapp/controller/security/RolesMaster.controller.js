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
      this.initModels();
      this.loadRoles();
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

    //===================================================
    //=================== CREAR ROL =====================
    //===================================================
    onOpenDialog: async function () {
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
    //=================== EDITAR ROL ====================
    //===================================================
    onUpdateRole: async function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) {
        MessageToast.show("Selecciona un rol válido para editar.");
        return;
      }

      const oRole = oTable.getContextByIndex(iIndex).getObject();

      const oModel = new JSONModel({
        OLD_ROLEID: oRole.ROLEID,
        ROLEID: oRole.ROLEID,
        ROLENAME: oRole.ROLENAME,
        DESCRIPTION: oRole.DESCRIPTION,
        PRIVILEGES: oRole.PRIVILEGES || [],
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: []
      });

      this.getView().setModel(oModel, "newRoleModel");

      if (!this._pDialog) {
        this._pDialog = await Fragment.load({
          name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
          controller: this
        });
        this.getView().addDependent(this._pDialog);
      }

      this._pDialog.setTitle("Editar Rol");
      this._pDialog.open();
    },

    //===================================================
    //================ DESACTIVAR ROL ===================
    //===================================================
    onDesactivateRole: function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) {
        MessageToast.show("Selecciona un rol válido para desactivar.");
        return;
      }

      const oRole = oTable.getContextByIndex(iIndex).getObject();

      MessageBox.confirm(
        `¿Estás seguro de que deseas desactivar el rol "${oRole.ROLENAME}"?`,
        {
          title: "Confirmar desactivación",
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          emphasizedAction: MessageBox.Action.YES,
          onClose: async (oAction) => {
            if (oAction === MessageBox.Action.YES) {
              try {
                const env = await fetch("env.json").then(r => r.json());

                const response = await fetch(`${env.API_ROLES_URL_BASE}delrolelogically?ROLEID=${encodeURIComponent(oRole.ROLEID)}`, {
                  method: "POST"
                });

                if (!response.ok) throw new Error(await response.text());

                MessageToast.show("Rol desactivado correctamente.");
                this.loadRoles();

              } catch (err) {
                MessageBox.error("Error al desactivar el rol: " + err.message);
              }
            }
          }
        }
      );
    },

    //===================================================
    //================ ELIMINAR ROL =====================
    //===================================================
    onDeleteRole: function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) {
        MessageToast.show("Selecciona un rol válido para eliminar.");
        return;
      }

      const oRole = oTable.getContextByIndex(iIndex).getObject();

      MessageBox.warning(
        `¿Estás seguro de que deseas eliminar el rol "${oRole.ROLENAME}" permanentemente? Esta acción no se puede deshacer.`,
        {
          title: "Confirmar eliminación permanente",
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: async (oAction) => {
            if (oAction === MessageBox.Action.DELETE) {
              try {
                const env = await fetch("env.json").then(r => r.json());

                const response = await fetch(`${env.API_ROLES_URL_BASE}delrolephysically?ROLEID=${encodeURIComponent(oRole.ROLEID)}`, {
                  method: "POST"
                });

                if (!response.ok) throw new Error(await response.text());

                MessageToast.show("Rol eliminado permanentemente.");
                this.loadRoles();

              } catch (err) {
                MessageBox.error("Error al eliminar el rol: " + err.message);
              }
            }
          }
        }
      );
    },

    //===================================================
    //=================== BUSCAR ROL ====================
    //===================================================
    onMultiSearch: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oBinding = this.byId("rolesTable").getBinding("rows");
      const aFilters = sQuery ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)] : [];
      oBinding.filter(aFilters);
    }
  });
});