// @ts-nocheck
/* eslint-disable no-extra-bind */
/* eslint-disable comma-dangle */
/* eslint-disable curly */
/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable no-console */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "jquery",
  ],
  function (Controller, JSONModel, MessageBox, Fragment, MessageToast, $) {
    "use strict";

    return Controller.extend(
      "com.invertions.sapfiorimodinv.controller.catalogs.Catalogs",
      {
        // ---------------------------------------------------- INICIO DE LA VISTA
        onInit: function () {
          this._oDialog = null;
          this._aAllValues = [];
          this.loadLabels();
          this.loadValues();
        },

        loadLabels: function(){
          var oModel = new JSONModel();
          var that = this;
            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_LABELS_URL_BASE + "getalllabels"))
                .then(res => res.json())
                .then(data => {
                    oModel.setData({ value: data.value });
                    that.getView().setModel(oModel);
                })
                .catch(err => {
                    if(err.message === ("Cannot read properties of undefined (reading 'setModel')")){
                        return;
                    }else{
                        MessageToast.show("Error al cargar catalogos: " + err.message);
                    }      
                });   
        },

        loadValues: function(){
            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "getallvalues"))
                .then(res => res.json())
                .then(data => {
                    this._aAllValues = data.value || [];
                })
                .catch(err => {
                    if(err.message === ("Cannot read properties of undefined (reading 'setModel')")){
                        return;
                    }else{
                        MessageToast.show("Error al cargar valores: " + err.message);
                    }      
                });   
        },
        // ---------------------------------------------------- PARA FILTRAR EN LA TABLA
        onFilterChange: function (oEvent) {
          var sQuery = oEvent.getSource().getValue();
          var oTable = this.byId("catalogTable");
          var aItems = oTable.getItems();

          if (!sQuery) {
            aItems.forEach(function (oItem) {
              oItem.setVisible(true);
            });
            return;
          }

          aItems.forEach(function (oItem) {
            var oContext = oItem.getBindingContext();
            if (!oContext) return;

            var oData = oContext.getObject();
            var bVisible = Object.keys(oData).some(function (sKey) {
              var value = oData[sKey];

              if (typeof value === "string") {
                return value.toLowerCase().includes(sQuery.toLowerCase());
              } else if (typeof value === "number") {
                return value.toString().includes(sQuery);
              }

              return false;
            });

            oItem.setVisible(bVisible);
          });
        },

        // ---------------------------------------------------- PARA AGREGAR UN NUEVO LABEL
        onAddCatalog: function () {
          // Inicializa el modelo con estructura completa
          var oModel = new JSONModel({
            COMPANYID: "0",
            CEDIID: "0",
            LABELID: "",
            LABEL: "",
            INDEX: "",
            COLLECTION: "",
            SECTION: "", // Valor por defecto
            SEQUENCE: 0, // Valor por defecto
            IMAGE: "",
            DESCRIPTION: "",
            DETAIL_ROW: {
              ACTIVED: true,
              DELETED: false,
              DETAIL_ROW_REG: [
                {
                  CURRENT: "",
                  REGDATE: "",
                  REGTIME: "",
                  REGUSER: "SYSTEM",
                }
              ],
            },
          });

          this.getView().setModel(oModel, "addCatalogModel");

          // Cargar el diálogo si no existe
          if (!this._oAddDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.AddCatalogDialog",
              controller: this,
            }).then(
              function (oDialog) {
                this._oAddDialog = oDialog;
                // @ts-ignore
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this._oAddDialog.open();
          }
        },

        onSaveCatalog: function () {
          var oModel = this.getView().getModel("addCatalogModel");
          var oData = oModel.getData();

          // Obtener el modelo de la tabla
          var oTableModel = this.getView().getModel();
          var aData = oTableModel.getProperty("/value") || [];

          // Validación básica
          if (!oData.LABELID || !oData.LABEL) {
            MessageToast.show("LABELID y LABEL son campos requeridos");
            return;
          }

          // Verificar si el LABELID ya existe
          var bLabelIdExists = aData.some(function (item) {
            return item.LABELID === oData.LABELID;
          });

          if (bLabelIdExists) {
            MessageToast.show("El LABELID ya existe, por favor ingrese uno diferente");
            return;
          }

          var activado = null;
          var desactivado = null;
          if(oData.DETAIL_ROW.ACTIVED === true){
            activado = true;
            desactivado = false;
          }else{
            activado = false;
            desactivado = true;
          }

          // Aquí va el payload correcto
          var payload = {
            label: {
              COMPANYID: oData.COMPANYID,
              CEDIID: oData.CEDIID,
              LABELID: oData.LABELID,
              LABEL: oData.LABEL,
              INDEX: oData.INDEX,
              COLLECTION: oData.COLLECTION,
              SECTION: "seguridad", // Valor por defecto
              SEQUENCE: 10, // Valor por defecto
              IMAGE: oData.IMAGE,
              DESCRIPTION: oData.DESCRIPTION,
              DETAIL_ROW: {
                ACTIVED: activado,
                DELETED: desactivado
              }
            }
          };

          fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_LABELS_URL_BASE + "addonelabel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }))
                .then(response => {
                    if (!response.ok) {throw new Error("Error en la respuesta del servidor");}
                    return response.json();
                })
                .then(() => {
                    MessageToast.show("Catalogo creado correctamente");
                    this._oAddDialog.close();
                    // Agregar el nuevo registro
                    aData.push(oData);
                    oTableModel.setProperty("/value", aData);
                })
                .catch(err => MessageToast.show("Error al crear catalogo: " + err.message));
        },


        onCancelAddCatalog: function () {
          if (this._oAddDialog) {
            this._oAddDialog.close();
          }
        },
        // ---------------------------------------------------- FIN PARA AGREGAR UN NUEVO LABEL

        // ---------------------------------------------------- PARA EDITAR UN LABEL
        onEditPressed: function () {
          if (!this._oSelectedItem) return;

          var oContext = this._oSelectedItem.getBindingContext();
          var oData = oContext.getObject();

          // Crear modelo para edición
          var oEditModel = new JSONModel($.extend(true, {}, oData));
          this.getView().setModel(oEditModel, "editModel"); //AQUI SE HACE REFERENCIA HACIA EL MODELO DE EDICIÓN

          this.labelidToUpdate = oData.LABELID;

          // Cargar diálogo de edición
          if (!this._oEditDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.EditCatalogDialog",
              controller: this,
            }).then(
              function (oDialog) {
                this._oEditDialog = oDialog;
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this._oEditDialog.open();
          }
        },

        onSaveEdit: function () {
          var oEditModel = this.getView().getModel("editModel"); //AQUI TRAE LA INFO DEL MODELO DE EDICIÓN
          var oEditedData = oEditModel.getData();
          
          // Obtener el modelo de la tabla
          var oTableModel = this.getView().getModel();
          var aData = oTableModel.getProperty("/value") || [];

          var that = this;

          var payload = {
            label: {
              COMPANYID: oEditedData.COMPANYID,
              CEDIID: oEditedData.CEDIID,
              LABELID: oEditedData.LABELID,
              LABEL: oEditedData.LABEL,
              INDEX: oEditedData.INDEX,
              COLLECTION: oEditedData.COLLECTION,
              SECTION: oEditedData.SECTION, 
              SEQUENCE: oEditedData.SEQUENCE,
              IMAGE: oEditedData.IMAGE,
              DESCRIPTION: oEditedData.DESCRIPTION,
            }
          };
          
          // Llamada a la API para actualizar
          fetch("env.json")
              .then(res => res.json())
              .then(env => fetch(env.API_LABELS_URL_BASE + "updateonelabel?LABELID=" + that.labelidToUpdate, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
              }))
              .then(response => {
                  if (!response.ok) {throw new Error("Error en la respuesta del servidor");}
                  return response.json();
              })
              .then(() => {
                MessageToast.show("Catalogo actualizado correctamente");
                this._oEditDialog.close();

                var updatedIndex = aData.findIndex(
                  (item) => item.LABELID === oEditedData.LABELID
                );

                if (updatedIndex !== -1) {
                  aData[updatedIndex] = {
                    ...aData[updatedIndex],
                    LABELID: oEditedData.LABELID,
                    VALUEPAID: oEditedData.VALUEPAID,
                    LABEL: oEditedData.LABEL,
                    INDEX: oEditedData.INDEX,
                    COLLECTION: oEditedData.COLLECTION,
                    SECTION: oEditedData.SECTION,
                    SEQUENCE: oEditedData.SEQUENCE,
                    IMAGE: oEditedData.IMAGE,
                    DESCRIPTION: oEditedData.DESCRIPTION,
                  };
                  oTableModel.setProperty("/values", aData);
                }
              })
              .catch(err => MessageToast.show("Error al actualizar catalogo: " + err.message));
        },

        onCancelEdit: function () {
          if (this._oEditDialog) {
            this._oEditDialog.close();
          }
        },

        // ---------------------------------------------------- FIN PARA EDITAR UN LABEL

        // ---------------------------------------------------- PARA ELIMINAR UN LABEL

        onDeletePressed: function () {
          if (!this._oSelectedItem) return;

          var oContext = this._oSelectedItem.getBindingContext();
          var oData = oContext.getObject();
          var that = this;

          MessageBox.confirm("¿Está seguro de eliminar este registro?", {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.YES) {
                fetch("env.json")
                  .then(function (response) {
                      return response.json();
                  })
                  .then(function (env) {
                      return fetch(env.API_LABELS_URL_BASE + "dellabelphysically?LABELID=" + oData.LABELID, {
                          method: "POST"
                      });
                  })
                  .then(function (response) {
                      if (!response.ok) {
                          throw new Error("Error en la eliminación del catalogo");
                      }

                      MessageToast.show("Catalogo eliminado");

                      // Actualización local del modelo
                      var oTableModel = that.getView().getModel();
                      var aData = oTableModel.getProperty("/value") || [];

                      // Encontrar y eliminar el registro
                      var index = aData.findIndex(
                        (item) => item._id === oData._id
                      );
                      if (index !== -1) {
                        aData.splice(index, 1);
                        oTableModel.setProperty("/value", aData);
                      }
                  })
                  .catch(function (err) {
                      MessageToast.show("Error al eliminar catálogo: " + err.message);
                  });
              }
            }.bind(this),
          });
        },

        // ---------------------------------------------------- FIN PARA ELIMINAR UN LABEL

        // ---------------------------------------------------- ELIMINADO/ACTIVADO LOGICO

        onActivatePressed: function () {
          this._changeStatus(true);
        },

        onDeactivatePressed: function () {
          this._changeStatus(false);
        },

        _changeStatus: function (bActivate) {
          console.log("Activar/Desactivar");

          if (!this._oSelectedItem) {
            console.log("No hay ítem seleccionado");
            return;
          }

          var oContext = this._oSelectedItem.getBindingContext();
          var oData = oContext.getObject();
          var sAction = bActivate ? "activate" : "delete";
          var sStatusMessage = bActivate ? "activado" : "desactivado";
          // Obtener el modelo y los datos actuales
          var oTableModel = this.getView().getModel();
          var aData = oTableModel.getProperty("/value") || [];

          var that = this;

          console.log(sAction);

          fetch("env.json")
            .then(function (response) {
                return response.json();
            })
            // eslint-disable-next-line consistent-return
            .then(function (env) {
              if (sAction === "delete"){
                return fetch(env.API_LABELS_URL_BASE + "dellabellogically?LABELID=" + oData.LABELID, {
                    method: "POST"
                });
              }else if (sAction === "activate"){
                return fetch(env.API_LABELS_URL_BASE + "actlabellogically?LABELID=" + oData.LABELID, {
                    method: "POST"
                });
              }
            })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Error");
                }
              // Actualizar el estado localmente
              var index = aData.findIndex(
                (item) => item.LABELID === oData.LABELID
              );
                if (index !== -1) {
                  // Actualizar solo el campo ACTIVED
                  aData[index].DETAIL_ROW.ACTIVED = bActivate;

                  // Actualizar el modelo
                  oTableModel.setProperty("/value", aData);
                }

                // Actualizar visibilidad de botones según estado
                that.byId("activateButton").setVisible(!bActivate);
                that.byId("activateButton").setEnabled(!bActivate);
                that.byId("deactivateButton").setVisible(bActivate);
                that.byId("deactivateButton").setEnabled(bActivate);

                MessageToast.show(
                  "Registro " + oData.LABELID + ": " + sStatusMessage
                );
            })
            .catch(function (err) {
                MessageToast.show("Error al eliminar catálogo: " + err.message);
            });
        },

        // ---------------------------------------------------- FIN ELIMINADO/ACTIVADO LOGICO

        _refreshCatalogTable: function () {
          // Implementa la lógica para refrescar los datos de la tabla
          var oTable = this.byId("catalogTable");
          var oModel = this.getView().getModel();

          $.ajax({
            url: "http://localhost:4004/api/sec/getall",
            method: "GET",
            success: function (data) {
              oModel.setData({ value: data.value });
            },
          });
        },

        // ---------------------------------------------------- PARA CARGAR VALORES EN EL PANEL DERECHO
        onItemPress: function (oEvent) {
          var oItem = oEvent.getParameter("listItem");
          var oContext = oItem.getBindingContext();
          var oSelectedData = oContext.getObject(); // Obtiene los datos del ítem seleccionado
          // var that = this;
          // var sLabelID = oSelectedData.LABELID;
          
          // Codigo nuevo que lee los valores desde el array que se carga al principio de la vista
          var aFilteredValues = this._aAllValues.filter(function (oValue) {
            return oValue.LABELID === oSelectedData.LABELID;
          });
          var oAllLabels = this.getView().getModel().getProperty("/value");
          var aAllValues = this._aAllValues;
          var oValuesView = this.byId("XMLViewValues");
          if (oValuesView) {
            oValuesView.loaded().then(
              function () {
                var oController = oValuesView.getController();
                if (oController && oController.loadValues) {
                  // Pasar los valores filtrados
                  oController.loadValues(
                    aFilteredValues,
                    aAllValues,
                    oAllLabels
                  );

                  // Actualizar el selectedValue en el modelo "values"
                  oValuesView
                    .getModel("values")
                    .setProperty("/selectedValue", oSelectedData);
                  oValuesView
                    .getModel("values")
                    .setProperty("/AllValues", aAllValues);
                  oValuesView
                    .getModel("values")
                    .setProperty("/AllLabels", oAllLabels);
                }
              }.bind(this)
            );
          }

          // Codigo antiguo que cargaba la api de GET VALUES BY ID
          // fetch("env.json")
          //   .then(res => res.json())
          //   .then(env => fetch(env.API_VALUES_URL_BASE + "getallvalues?LABELID=" + sLabelID))
          //   .then(res => res.json())
          //   .then(data => {
          //     var oValuesView = that.byId("XMLViewValues");
          //     if (oValuesView) {
          //       oValuesView.loaded().then(function () {
          //         var oController = oValuesView.getController();
          //         if (oController && oController.loadValues) {
          //           // Pasa los valores y también el ítem seleccionado
          //           oController.loadValues(data.value || []);

          //           // Actualiza el selectedValue en el modelo values
          //           oValuesView
          //             .getModel("values")
          //             .setProperty("/selectedValue", oSelectedData);
          //         }
          //       });
          //     }
          //   })
          //   .catch(err => {
          //       if(err.message === ("Cannot read properties of undefined (reading 'setModel')")){
          //           return;
          //       }else{
          //           MessageToast.show("Error al cargar usuarios: " + err.message);
          //       }      
          //   });   
                
          // Expandir el panel derecho
          var oSplitter = this.byId("mainSplitter");
          var oDetailPanel = this.byId("detailPanel");
          var oLayoutData = oDetailPanel.getLayoutData();
          if (oLayoutData) {
            oLayoutData.setSize("50%"); // O el porcentaje/píxeles que prefieras
          }

          // Opcional: reducir el panel izquierdo
          var oLeftPanel = oSplitter.getContentAreas()[0];
          var oLeftLayoutData = oLeftPanel.getLayoutData();
          if (oLeftLayoutData) {
            oLeftLayoutData.setSize("50%");
          }
        },

        // ---------------------------------------------------- FIN PARA CARGAR VALORES EN EL PANEL DERECHO

        // ---------------------------------------------------- PARA BOTONES DE ACCIONES LOGICAS

        // @ts-ignore
        onSelectionChange: function (oEvent) {
          // Obtener el item seleccionado
          var oTable = this.byId("catalogTable");
          var oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            this._disableAllActions();
            return;
          }

          // Habilitar todos los botones de acción
          this.byId("editButton").setEnabled(true);
          this.byId("deleteButton").setEnabled(true);

          // Determinar estado para activar/desactivar
          var oContext = oSelectedItem.getBindingContext();
          var oData = oContext.getObject();

          // Actualizar visibilidad de botones según estado
          this.byId("activateButton").setVisible(!oData.DETAIL_ROW.ACTIVED);
          this.byId("activateButton").setEnabled(!oData.DETAIL_ROW.ACTIVED);
          this.byId("deactivateButton").setVisible(oData.DETAIL_ROW.ACTIVED);
          this.byId("deactivateButton").setEnabled(oData.DETAIL_ROW.ACTIVED);

          // Guardar referencia al item seleccionado
          this._oSelectedItem = oSelectedItem;
        },

        _disableAllActions: function () {
          this.byId("editButton").setEnabled(false);
          this.byId("activateButton").setEnabled(false);
          this.byId("deactivateButton").setEnabled(false);
          this.byId("deleteButton").setEnabled(false);
        },

        // ---------------------------------------------------- FIN PARA BOTONES DE ACCIONES LOGICAS

        // ------------------------------------------------ BOTONES DE ACCIÓN

        onCloseDetailPanel: function () {
          var oSplitter = this.byId("mainSplitter");
          var oDetailPanel = this.byId("detailPanel");
          var oLayoutData = oDetailPanel.getLayoutData();
          if (oLayoutData) {
            oLayoutData.setSize("0px");
          }
          var oLeftPanel = oSplitter.getContentAreas()[0];
          var oLeftLayoutData = oLeftPanel.getLayoutData();
          if (oLeftLayoutData) {
            oLeftLayoutData.setSize("100%");
          }
        },

        onCenterDetailPanel: function () {
          var oSplitter = this.byId("mainSplitter");
          var oDetailPanel = this.byId("detailPanel");
          var oLayoutData = oDetailPanel.getLayoutData();
          if (oLayoutData) {
            oLayoutData.setSize("50%");
          }
          var oLeftPanel = oSplitter.getContentAreas()[0];
          var oLeftLayoutData = oLeftPanel.getLayoutData();
          if (oLeftLayoutData) {
            oLeftLayoutData.setSize("50%");
          }
        },

        onExpandDetailPanel: function () {
          var oSplitter = this.byId("mainSplitter");
          var oDetailPanel = this.byId("detailPanel");
          var oLayoutData = oDetailPanel.getLayoutData();
          if (oLayoutData) {
            oLayoutData.setSize("100%");
          }
          var oLeftPanel = oSplitter.getContentAreas()[0];
          var oLeftLayoutData = oLeftPanel.getLayoutData();
          if (oLeftLayoutData) {
            oLeftLayoutData.setSize("0px");
          }
        },

        // ------------------------------------------------ FIN BOTONES DE ACCIÓN
      }
    );
  }
);