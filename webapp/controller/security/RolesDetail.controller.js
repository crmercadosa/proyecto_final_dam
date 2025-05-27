sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/base/Log",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment"
], function (BaseController, JSONModel, Log, MessageToast, MessageBox, Fragment) {
  "use strict";

  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesDetail", {

    onInit: async function () {
      await this.loadCatalogsOnce();

      const oProcessModel = this.getOwnerComponent().getModel("processCatalogModel");
      const oPrivilegeModel = this.getOwnerComponent().getModel("privilegeCatalogModel");

      if (oProcessModel) {
        this.getView().setModel(oProcessModel, "processCatalogModel");
      }
      if (oPrivilegeModel) {
        this.getView().setModel(oPrivilegeModel, "privilegeCatalogModel");
      }
    },

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
      } catch (e) {
        console.error("Error cargando catálogo", labelId, e);
      }
    },

    _onRouteMatched: function (oEvent) {
      const sRoleId = decodeURIComponent(oEvent.getParameter("arguments").roleId);

      const oModel = this.getOwnerComponent().getModel("roles");
      if (!oModel) {
        MessageToast.show("Modelo de roles no disponible.");
        return;
      }

      const aRoles = oModel.getProperty("/value");
      const oRole = aRoles.find(role => role.ROLEID === sRoleId);

      if (!oRole) {
        MessageToast.show("Rol no encontrado.");
        return;
      }

      const oSelectedModel = new JSONModel(oRole);
      this.getView().setModel(oSelectedModel, "selectedRole");
    },


    _handleRoleAction: async function (options) {
      const oModel = this.getView().getModel("selectedRole");
      const oData = oModel ? oModel.getData() : null;
      const that = this;

      if (!oData || !oData.ROLEID) {
        MessageToast.show("No se encontró el ROLEID.");
        return;
      }

      MessageBox[options.dialogType](
        options.message.replace("{ROLENAME}", oData.ROLENAME),
        {
          title: options.title,
          actions: options.actions,
          emphasizedAction: options.emphasizedAction,
          onClose: async function (oAction) {
            if (oAction === options.confirmAction) {
              try {
                const response = await fetch(`${options.url}${oData.ROLEID}`, {
                  method: options.method
                });

                const result = await response.json();

                if (result && !result.error) {
                  MessageToast.show(options.successMessage);
                  const oRolesModel = that.getOwnerComponent().getModel("roles");
                  if (oRolesModel) {
                    const aRoles = oRolesModel.getProperty("/value");
                    const aUpdatedRoles = aRoles.filter(role => role.ROLEID !== oData.ROLEID);
                    oRolesModel.setProperty("/value", aUpdatedRoles);
                  }

                  that.getOwnerComponent().getRouter().navTo("RouteRolesMaster");

                } else {
                  MessageBox.error("Error: " + (result?.message || "desconocido"));
                }
              } catch (error) {
                MessageBox.error("Error en la petición: " + error.message);
              }
            }
          }
        }
      );
    },

    onDesactivateRole: function () {
      this._handleRoleAction({
        dialogType: "confirm",
        message: "¿Estás seguro de que deseas desactivar el rol \"{ROLENAME}\"?",
        title: "Confirmar desactivación",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        confirmAction: MessageBox.Action.YES,
        method: "POST",
        url: "http://localhost:4004/api/sec/rolesCRUD?procedure=delete&type=logic&roleid=",
        successMessage: "Rol desactivado correctamente."
      });
    },

    onDeleteRole: function () {
      this._handleRoleAction({
        dialogType: "warning",
        message: "¿Estás seguro de que deseas eliminar el rol \"{ROLENAME}\" permanentemente? Esta acción no se puede deshacer.",
        title: "Confirmar eliminación permanente",
        actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.DELETE,
        confirmAction: MessageBox.Action.DELETE,
        method: "POST",
        url: "http://localhost:4004/api/sec/rolesCRUD?procedure=delete&type=hard&roleid=",
        successMessage: "Rol eliminado permanentemente."
      });
    },

    onUpdateRoleServer: async function () {
      const oData = this.getView().getModel("roleDialogModel").getData();

      if (!oData.ROLENAME) {
        MessageToast.show("El nombre del rol es obligatorio.");
        return;
      }

      const sOldRoleId = oData.OLD_ROLEID || oData.ROLEID;

      try {
        const response = await fetch(`http://localhost:4004/api/sec/rolesCRUD?procedure=put&roleid=${encodeURIComponent(sOldRoleId)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ROLEID: oData.ROLEID,
            ROLENAME: oData.ROLENAME,
            DESCRIPTION: oData.DESCRIPTION,
            PRIVILEGES: oData.PRIVILEGES
          })
        });

        if (!response.ok) throw new Error(await response.text());

        MessageToast.show("Rol actualizado exitosamente.");

        const oRolesModel = this.getOwnerComponent().getModel("roles");
        const aRoles = oRolesModel.getProperty("/value");
        const index = aRoles.findIndex(role => role.ROLEID === sOldRoleId);

        if (index !== -1) {
          aRoles[index].ROLEID = oData.ROLEID;
          aRoles[index].ROLENAME = oData.ROLENAME;
          aRoles[index].DESCRIPTION = oData.DESCRIPTION;
          aRoles[index].PRIVILEGES = oData.PRIVILEGES;
          oRolesModel.setProperty("/value", aRoles);
        }

        this.onDialogClose();

      } catch (err) {
        MessageBox.error("Error al actualizar el rol: " + err.message);
      }
    },

    onUpdateRole: async function () {
      const oView = this.getView();
      const oSelectedRole = oView.getModel("selectedRole")?.getData();

      if (!oSelectedRole) {
        MessageToast.show("No hay datos del rol seleccionados.");
        return;
      }

      await this.loadCatalogsOnce();

      const oModel = new JSONModel({
        OLD_ROLEID: oSelectedRole.ROLEID,
        ROLEID: oSelectedRole.ROLEID,
        ROLENAME: oSelectedRole.ROLENAME,
        DESCRIPTION: oSelectedRole.DESCRIPTION,
        PRIVILEGES: (oSelectedRole.PROCESSES || []).map(proc => ({
          PROCESSID: proc.PROCESSID,
          PRIVILEGEID: (proc.PRIVILEGES || []).map(p => p.PRIVILEGEID)
        })),
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        IS_EDIT: true
      });

      oView.setModel(oModel, "roleDialogModel");

      const oExistingDialog = this.byId("dialogEditRole");
      if (oExistingDialog) {
        oExistingDialog.destroy();
      }

      Fragment.load({
        id: oView.getId(),
        name: "com.invertions.sapfiorimodinv.view.security.fragments.EditRoleDialog",
        controller: this
      }).then(function (oDialog) {
        oView.addDependent(oDialog);
        oDialog.open();
      }).catch(function (error) {
        MessageBox.error("Error al cargar el diálogo: " + error.message);
      });
    },

    onAddPrivilege: function () {
      const oModel = this.getView().getModel("roleDialogModel");
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
      const oModel = this.getView().getModel("roleDialogModel");
      const oData = oModel.getData();

      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext("roleDialogModel");
      const iIndex = oContext.getPath().split("/").pop();

      oData.PRIVILEGES.splice(iIndex, 1);
      oModel.setData(oData);
    },

    onDialogClose: function () {
      const oDialog = this.byId("dialogEditRole");
      if (oDialog) oDialog.close();
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
      const sId = encodeURIComponent(oRole.ROLEID);

      try {
        const env = await fetch("env.json").then(r => r.json());

        // Llama al endpoint correcto para obtener los detalles del rol
        const res = await fetch(env.API_ROLES_URL_BASE + `getroledetails?ROLEID=${sId}`);
        const result = await res.json();

        // Si la respuesta viene como { value: [ ... ] }, toma el primer elemento
        const roleDetail = Array.isArray(result.value) ? result.value[0] : result;

        if (!roleDetail?.ROLEID) {
          MessageBox.warning("No se encontró información del rol.");
          return;
        }

        this.getOwnerComponent().setModel(new JSONModel(roleDetail), "selectedRole");
      } catch (e) {
        MessageBox.error("Error al obtener el rol: " + e.message);
      }
    },

    privilegesFormatter: function(aPrivileges) {
      if (!aPrivileges || !Array.isArray(aPrivileges)) return "";
      return aPrivileges.map(p => p.PRIVILEGENAME || p.PRIVILEGEID).join(", ");
    },
  });
});
