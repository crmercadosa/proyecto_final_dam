/* eslint-disable no-console */
sap.ui.define([
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "jquery"
], function (BaseController, JSONModel, MessageBox, MessageToast, Filter, Fragment, FilterOperator, $) {
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.catalogs.Values", {
        // Método de inicialización del controlador
        onInit: function () {
            // Modelo para los valores
            this.getView().setModel(new JSONModel({
                values: [],
                selectedValue: null
            }), "values");
            this.getView().setModel(new JSONModel({
                values: [],       // Datos de la tabla
                selectedValueIn: null  // Para controlar los botones
            }), "values");

            // Modelo para los datos del formulario
            this.getView().setModel(new JSONModel({
                VALUEID: "",
                VALUE: "",
                VALUEPAID: "",
                ALIAS: "",
                IMAGE: "",
                DESCRIPTION: ""
            }), "newValueModel");
        },
        // Método para cargar los valores en el modelo
        loadValues: function (aValues) {
            this.getView().getModel("values").setProperty("/values", aValues || []);
        },
        // Método para abrir el diálogo de selección de valores
        onItemSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oSelectedData = oItem.getBindingContext("values").getObject();
            // Actualiza el modelo newValueModel con los datos seleccionados
            this.getView().getModel("newValueModel").setProperty("/", {
                VALUEID: oSelectedData.VALUEID,
                VALUE: oSelectedData.VALUE,
                VALUEPAID: oSelectedData.VALUEPAID,
                ALIAS: oSelectedData.ALIAS,
                IMAGE: oSelectedData.IMAGE,
                DESCRIPTION: oSelectedData.DESCRIPTION
            });

            // Activa el modo de edición
            this.getView().getModel("values").setProperty("/selectedValueIn", true);
        },

        // Método para esditar el nuevo valor
        onEditValue: function () {
            var oView = this.getView();
            var oNewValueModel = oView.getModel("newValueModel");
            var oValuesModel = oView.getModel("values");

            // Obtener datos del formulario
            var oFormData = oNewValueModel.getData();
            var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");

            // Validaciones
            if (!oFormData.VALUEID || !oFormData.VALUE) {
                MessageToast.show("VALUEID y VALUE son campos obligatorios");
                return;
            }

            // Construir objeto con todos los parámetros
            var oParams = {
                value :{
                    COMPANYID: "0",
                    CEDIID: "0",
                    LABELID: oSelectedCatalog.LABELID,
                    VALUEPAID: oFormData.VALUEPAID || "",
                    VALUEID: oFormData.VALUEID,
                    VALUE: oFormData.VALUE,
                    ALIAS: oFormData.ALIAS || "",
                    SEQUENCE: 30,
                    IMAGE: oFormData.IMAGE || "",
                    DESCRIPTION: oFormData.DESCRIPTION || "",
                    ROUTE: ""
                }
            };

            console.log(oFormData.VALUEID);

            // Configurar llamada FETCH
            oView.setBusy(true);

            fetch("env.json")
              .then(res => res.json())
              .then(env => fetch(env.API_VALUES_URL_BASE + "updateonevalue?VALUEID=" + oFormData.VALUEID, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(oParams)
              }))
              .then(response => {
                  if (!response.ok) {throw new Error("Error en la respuesta del servidor");}
                  return response.json();
              })
              .then(() => {
                oView.setBusy(false);
                MessageToast.show("Valor guardado correctamente");

                // Actualizar el modelo directamente
                var currentValues = oValuesModel.getProperty("/values") || [];
                var updatedIndex = currentValues.findIndex(item => item.VALUEID === oFormData.VALUEID);

                if (updatedIndex !== -1) {
                    currentValues[updatedIndex] = {
                        ...currentValues[updatedIndex],
                        VALUE: oFormData.VALUE,
                        VALUEPAID: oFormData.VALUEPAID,
                        ALIAS: oFormData.ALIAS,
                        IMAGE: oFormData.IMAGE,
                        DESCRIPTION: oFormData.DESCRIPTION
                    };
                    oValuesModel.setProperty("/values", currentValues);
                }

                // Cerrar diálogo y limpiar
                this.onCancelEdit();
              })
              .catch(err => MessageToast.show("Error al actualizar valor: " + err.message));
        },

        // Método para guardar un nuevo valor
        onSaveValues: function () {
            var oView = this.getView();
            var oNewValueModel = oView.getModel("newValueModel");
            var oValuesModel = oView.getModel("values");

            // Obtener datos del formulario
            var oFormData = oNewValueModel.getData();
            var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");

            // Validaciones
            if (!oFormData.VALUEID || !oFormData.VALUE) {
                MessageToast.show("VALUEID y VALUE son campos obligatorios");
                return;
            }

            // Construir objeto con todos los parámetros
            var oParams = {
                value: {
                    COMPANYID: "0",
                    CEDIID: "0",
                    LABELID: oSelectedCatalog.LABELID,
                    VALUEPAID: oFormData.VALUEPAID || "",
                    VALUEID: oFormData.VALUEID,
                    VALUE: oFormData.VALUE,
                    ALIAS: oFormData.ALIAS || "",
                    SEQUENCE: 30,
                    IMAGE: oFormData.IMAGE || "",
                    DESCRIPTION: oFormData.DESCRIPTION || "",
                    ROUTE: ""
                }
            };

            // Configurar llamada AJAX con GET
            oView.setBusy(true);

            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "addonevalue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oParams)
                }))
                .then(response => {
                    if (!response.ok) {throw new Error("Error en la respuesta del servidor");}
                    return response.json();
                })
                .then(() => {
                    oView.setBusy(false);
                    MessageToast.show("Valor guardado correctamente");

                    // Actualizar el modelo directamente
                    var currentValues = oValuesModel.getProperty("/values") || [];
                    currentValues.push({
                        VALUEID: oFormData.VALUEID,
                        VALUE: oFormData.VALUE,
                        VALUEPAID: oFormData.VALUEPAID,
                        ALIAS: oFormData.ALIAS,
                        IMAGE: oFormData.IMAGE,
                        DESCRIPTION: oFormData.DESCRIPTION,
                        DETAIL_ROW: {
                            ACTIVED: true,
                            DELETED: false
                        }
                    });
                    oValuesModel.setProperty("/values", currentValues);

                    // Cerrar diálogo y limpiar
                    this.onCancelValues();
                })
                .catch(err => MessageToast.show("Error al crear valor: " + err.message));
        },
        //FILTRO DE VALORES
        onFilterChange: function () {
            var oTable = this.byId("valuesTable");
            var oBinding = oTable.getBinding("items");
            var valueFilterVal = this.byId("ValueSearchField").getValue();

            var aFilters = [];
            if (valueFilterVal) {
                aFilters.push(new Filter("VALUEID", FilterOperator.Contains, valueFilterVal));
            }

            oBinding.filter(aFilters);
        },

        /*_loadValuesByLabel: function(sLabelID) {
            var oView = this.getView();
            
            $.ajax({
                url: "http://localhost:4004/api/sec/valuesCRUD?procedure=get&labelID=" + encodeURIComponent(sLabelID),
                method: "GET",
                success: function(data) {
                    oView.getModel("values").setProperty("/values", data.value || []);
                }.bind(this),
                error: function(error) {
                    MessageToast.show("Error al cargar valores");
                    console.error("Error loading values:", error);
                }
            });
        },*/
        StatusValueDecline: function () {
            this.StatusValue(false, true, "delete");
        },
        StatusValueAccept: function () {
            this.StatusValue(true, false, "actived");
        },
        
        StatusValue: function (aceptar, rechazar, type) {
            var oView = this.getView();
            var oNewValueModel = oView.getModel("newValueModel");
            var oValuesModel = oView.getModel("values");

            // Obtener datos del formulario
            var oFormData = oNewValueModel.getData();

            // Validaciones
            if (!oFormData.VALUEID || !oFormData.VALUE) {
                MessageToast.show("VALUEID y VALUE son campos obligatorios");
                return;
            }

            console.log(type);

            // Configurar llamada AJAX con GET
            oView.setBusy(true);

            fetch("env.json")
            .then(function (response) {
                return response.json();
            })
            // eslint-disable-next-line consistent-return
            .then(function (env) {
                return fetch(`${env.API_VALUES_URL_BASE}delvaluelogically?VALUEID=${oFormData.VALUEID}&TYPE=${type}`, {
                    method: "POST"
                });
            })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Error");
                }
                // Actualizar el estado localmente
                oView.setBusy(false);
                if (aceptar) {
                    MessageToast.show("Valor activado correctamente");
                } else {
                    MessageToast.show("Valor desactivado correctamente");
                }

                // Actualizar el modelo directamente
                var currentValues = oValuesModel.getProperty("/values") || [];
                var updatedIndex = currentValues.findIndex(item => item.VALUEID === oFormData.VALUEID);

                if (updatedIndex !== -1) {
                    currentValues[updatedIndex].DETAIL_ROW = {
                        ACTIVED: aceptar,
                        DELETED: rechazar
                    };
                    oValuesModel.setProperty("/values", currentValues);
                }
            })
            .catch(function (err) {
                MessageToast.show("Error al eliminar catálogo: " + err.message);
            });
        },

        onDeleteValue: function () {
            var oView = this.getView();
            var oNewValueModel = oView.getModel("newValueModel");
            var oValuesModel = oView.getModel("values");

            // Obtener datos del formulario
            var oFormData = oNewValueModel.getData();

            var that = this;

            // Validaciones
            if (!oFormData.VALUEID || !oFormData.VALUE) {
                MessageToast.show("VALUEID y VALUE son campos obligatorios");
                return;
            }

            // 🔥 Mensaje de confirmación antes de eliminar
            MessageBox.confirm(`¿ESTÁS SEGURO DE ELIMINAR PERMANENTEMENTE ESTE VALOR: ${oFormData.VALUE}?`, {
                title: "Confirmar Eliminación",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        // ✅ Si el usuario presiona "OK", ejecuta la eliminación
                        oView.setBusy(true);

                        fetch("env.json")
                            .then(function (response) {
                                return response.json();
                            })
                            .then(function (env) {
                                return fetch(env.API_VALUES_URL_BASE + "delvaluephysically?VALUEID=" + oFormData.VALUEID, {
                                    method: "POST"
                                });
                            })
                            .then(function (response) {
                                if (!response.ok) {
                                    throw new Error("Error en la eliminación del valor");
                                }

                                oView.setBusy(false);
                                MessageToast.show("Valor eliminado correctamente");

                                // Actualizar el modelo directamente
                                var currentValues = oValuesModel.getProperty("/values") || [];
                                var filteredValues = currentValues.filter(item => item.VALUEID !== oFormData.VALUEID);
                                oValuesModel.setProperty("/values", filteredValues);

                                that._cleanModels();
                            })
                            .catch(function (err) {
                                MessageToast.show("Error al eliminar valor: " + err.message);
                            });
                    }
                }.bind(this)
            });
        },
        
        onChangeValue: function () {
            var oView = this.getView();
            var oValuesModel = oView.getModel("values");
            var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");
            // Inicializa el modelo con estructura completa
            var oModel = new JSONModel({
                COMPANYID: 0,
                CEDIID: 0,
                LABELID: oSelectedCatalog.LABELID,
                VALUEPAID: "",
                VALUEID: "",
                VALUE: "",
                ALIAS: "",
                SEQUENCE: 30,
                IMAGE: "",
                VALUESAPID: "",
                DESCRIPTION: "",
                ROUTE: "",
                // Estructura anidada para DETAIL_ROW
                "DETAIL_ROW": {
                    "ACTIVED": true,
                    "DELETED": false
                },
                "DETAIL_ROW_REG": [

                ]
            });

            this.getView().setModel(oModel, "addValueModel");

            // Cargar el diálogo si no existe
            if (!this._oEditDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.EditValueDialog",
                    controller: this,
                }).then(
                    function (oDialog) {
                        this._oEditDialog = oDialog;
                        // @ts-ignore
                        this.getView().addDependent(oDialog);
                        oDialog.open();
                    }.bind(this)
                );
            } else {
                this._oEditDialog.open();
            }
        },

        onAddValues: function () {
            var oView = this.getView();
            var oValuesModel = oView.getModel("values");
            var oSelectedCatalog = oValuesModel.getProperty("/selectedValue");
            // Inicializa el modelo con estructura completa
            var oModel = new JSONModel({
                COMPANYID: 0,
                CEDIID: 0,
                LABELID: oSelectedCatalog.LABELID,
                VALUEPAID: "",
                VALUEID: "",
                VALUE: "",
                ALIAS: "",
                SEQUENCE: 30,
                IMAGE: "",
                VALUESAPID: "",
                DESCRIPTION: "",
                ROUTE: "",
                // Estructura anidada para DETAIL_ROW
                "DETAIL_ROW": {
                    "ACTIVED": true,
                    "DELETED": false
                },
                "DETAIL_ROW_REG": [

                ]
            });

            this.getView().setModel(oModel, "addValueModel");

            // Cargar el diálogo si no existe
            if (!this._oAddDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.AddValueDialog",
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
        onCancelEdit: function () {
            if (this._oEditDialog) {
                this._oEditDialog.close();
            }
            this._cleanModels();
        },
        onCancelValues: function () {
            if (this._oAddDialog) {
                this._oAddDialog.close();
            }
            this._cleanModels();
        },
        _cleanModels: function () {
            // Limpiar modelo de valores seleccionados
            this.getView().getModel("newValueModel").setData({
                VALUEID: "",
                VALUE: "",
                VALUEPAID: "",
                ALIAS: "",
                IMAGE: "",
                DESCRIPTION: ""
            });

            // Limpiar modelo de añadir valores (si existe)
            if (this.getView().getModel("addValueModel")) {
                this.getView().getModel("addValueModel").setData({
                    VALUEID: "",
                    VALUE: "",
                    VALUEPAID: "",
                    ALIAS: "",
                    IMAGE: "",
                    DESCRIPTION: ""
                });
            }

            // Resetear selección
            this.getView().getModel("values").setProperty("/selectedValueIn", null);

            // Deseleccionar items en la tabla
            var oTable = this.byId("valuesTable");
            if (oTable) {
                oTable.removeSelections();
            }
        }


    });
});