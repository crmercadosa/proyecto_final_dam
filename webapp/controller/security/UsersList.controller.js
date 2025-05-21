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
    "sap/m/MessageBox",
    "sap/m/HBox",
    "sap/m/Label",
    "sap/m/Button"
], function(BaseController,JSONModel,Fragment,MessageToast,MessageBox,HBox,Label,Button){
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.UsersList",{
        onInit: function(){

            // Esto desactiva los botones cuando entras a la vista, hasta que selecciones un usuario en la tabla se activan
            var oViewModel = new JSONModel({
                buttonsEnabled: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            //

            // Carga los usuarios
            this.loadUsers();
        },

        /**
         * Funcion para cargar la lista de usuarios.
         */
        loadUsers: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var oModel = new JSONModel();
            var that = this;

            // En nuestro proyecto nosotros creamos un archivo llamado en.json para cargar la url de las apis
            // Cambiar esto segun su backend
            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_USERS_URL_BASE + "getallusers"))
                .then(res => res.json())
                .then(data => {
                    data.value.forEach(user => {
                        user.ROLES = that.formatRoles(user.ROLES);
                    });
                    oModel.setData(data);
                    oTable.setModel(oModel);
                })
                .catch(err => {
                    if(err.message === ("Cannot read properties of undefined (reading 'setModel')")){
                        return;
                    }else{
                        MessageToast.show("Error al cargar usuarios: " + err.message);
                    }      
                });        
        },

        loadCompanies: function () {
            var oView = this.getView();
            var oCompaniesModel = new JSONModel();

            return fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "getallvalues?LABELID=IdCompanies"))
                .then(res => res.json())
                .then(data => {
                    oCompaniesModel.setData({ companies: data.value });
                    oView.setModel(oCompaniesModel, "companiesModel");
                })
                .catch(err => {
                    MessageToast.show("Error al cargar compañías: " + err.message);
                });
        },

        onCompanySelected: function(oEvent){
            var oComboBox = oEvent.getSource();
            var sSelectedKey = oComboBox.getSelectedKey();
            var oView = this.getView();

            if(sSelectedKey){
                this.loadDeptos(sSelectedKey);
            } else {
                // Si se borra la selección, limpiamos el modelo de departamentos
                var oEmptyModel = new JSONModel({ cedis: [] });
                oView.setModel(oEmptyModel, "cedisModel");
            }
        },

        loadDeptos: function(companiId){
            var oView = this.getView();
            var oCedisModel = new JSONModel();

            return fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "getallvalues?LABELID=IdCedis&COMPANYID=" + companiId))
                .then(res => res.json())
                .then(data => {
                    oCedisModel.setData({ cedis: data.value });
                    oView.setModel(oCedisModel, "cedisModel");
                })
                .catch(err => {
                    MessageToast.show("Error al cargar departamentos: " + err.message);
                });
        },


        /**
         * Funcion para cargar la lista de roles y poderlos visualizar en el combobox
         * Esto va cambiar ya que quiere que primero carguemos las compañías, luego que carguemos los deptos
         * Y en base a las compañías y depto que coloquemos, se muestren los roles que pertenecen a esta compañía y depto.
         */
        loadRoles: function () {
            var oView = this.getView();
            var oRolesModel = new JSONModel();

            return fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_ROLES_URL_BASE + "getallroles"))
                .then(res => res.json())
                .then(data => {
                    oRolesModel.setData({ roles: data.value });
                    oView.setModel(oRolesModel, "rolesModel");
                })
                .catch(err => {
                    MessageToast.show("Error al cargar roles: " + err.message);
                });
        },


        /**
         * Esto es para formatear los roles al cargarlos de la bd y que aparezcan separados por un guion medio en la tabla.
         * Ejemplo: Usuario auxiliar-Investor-etc...
         */
        formatRoles: function (rolesArray) {
            return Array.isArray(rolesArray) 
                ? rolesArray.map(role => role.ROLENAME).join("-") 
                : "";
        },

        /**
         * Este evento se encarga de crear los items en el VBox con el nombre de los roles que se vayan agregando.
         */
        onRoleSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var sSelectedKey = oComboBox.getSelectedKey();
            var sSelectedText = oComboBox.getSelectedItem().getText();

            var oVBox;
            // Este if valida si es la modal de add user o edit user en la que se estáran colocando los roles
            if (oComboBox.getId().includes("comboBoxEditRoles")) {
                oVBox = this.getView().byId("selectedEditRolesVBox");  // Update User VBox
            } else {
                oVBox = this.getView().byId("selectedRolesVBox");   // Create User VBox
            }
            // Validar duplicados
            var bExists = oVBox.getItems().some(oItem => oItem.data("roleId") === sSelectedKey);
            if (bExists) {
                MessageToast.show("El rol ya ha sido añadido.");
                return;
            }

            // Crear item visual del rol seleccionado
            var oHBox = new sap.m.HBox({
                items: [
                    new sap.m.Label({ text: sSelectedText }).addStyleClass("sapUiSmallMarginEnd"),
                    // @ts-ignore
                    new sap.m.Button({
                        icon: "sap-icon://decline",
                        type: "Transparent",
                        press: () => oVBox.removeItem(oHBox)
                    })
                ]
            });

            oHBox.data("roleId", sSelectedKey);
            oVBox.addItem(oHBox);
        },

        //===================================================
        //=============== AÑADIR USUARIO ====================
        //===================================================

        /**
         * Función onpress del botón para agregar un nuevo usuario
         */
        onAddUser : function() {
            var oView = this.getView();

            if (!this._oCreateUserDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.AddUserDialog",
                    controller: this
                }).then(oDialog => {
                    this._oCreateUserDialog = oDialog;
                    oView.addDependent(oDialog);
                    Promise.all([
                        this.loadCompanies(),
                        this.loadRoles()
                    ]).then(()=>{
                        this._oCreateUserDialog.open();
                    });
                });
            } else {
                Promise.all([
                    this.loadCompanies(),
                    this.loadRoles()
                ]).then(()=>{
                    this._oCreateUserDialog.open();
                });
            }
            
        },

        onSaveUser: function(){
            //Aquí la lógica para agregar el usuario
            var oView = this.getView();
            var that = this;

            // Obtener valores del formulario
            var UserId = oView.byId("inputUserId").getValue();
            var Username = oView.byId("inputUsername").getValue();
            var Email = oView.byId("inputUserEmail").getValue();
            var Birthday = oView.byId("inputUserBirthdayDate").getDateValue();
            var Company = oView.byId("comboBoxCompanies").getSelectedItem().getText();
            var Phone = oView.byId("inputUserPhoneNumber").getValue();
            var Department = oView.byId("comboBoxCedis").getSelectedItem().getText();
            var Function = oView.byId("inputUserFunction").getValue();

            // Roles seleccionados
            var SelectedRoles = oView.byId("selectedRolesVBox").getItems().map(oItem => ({
                ROLEID: oItem.data("roleId"),
                ROLEIDSAP: ""
            }));

            if (!Username || !Email || !UserId) {
                MessageToast.show("Los campos Id de usuario, Nombre e Email son obligatorios");
                return;
            }

            var userBody = {
                user: {
                    USERID: UserId,
                    USERNAME: Username,
                    EMAIL: Email,
                    BIRTHDAYDATE: Birthday,
                    COMPANYNAME: Company,
                    PHONENUMBER: Phone,
                    DEPARTMENT: Department,
                    FUNCTION: Function,
                    ROLES: SelectedRoles
                }
            };


            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_USERS_URL_BASE + "addoneuser", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userBody)
                }))
                .then(response => {
                    if (!response.ok) {throw new Error("Error en la respuesta del servidor");}
                    return response.json();
                })
                .then((newUser) => {
                    MessageToast.show("Usuario creado correctamente");
                    that.loadUsers();
                    that.getView().byId("AddUserDialog").close();
                })
                .catch(err => MessageToast.show("Error al crear usuario: " + err.message));
                
            this.resetInputDialog();
        },

        //===================================================
        //=============== EDITAR USUARIO ====================
        //===================================================

        /**
         * Función onpress del botón para editar un nuevo usuario
         * Agregar la lógica para cargar la info a la modal
         */
        onEditUser: function () {
            var oView = this.getView();
            var UserData = this.selectedUser;

            var openDialog = () => {
                Promise.all([
                    this.loadCompanies(),
                    this.loadRoles()
                ]).then(() => {
                    this.setUpdateUserDialogData(UserData);
                    this._oEditUserDialog.open();
                });
            };

            if (!this._oEditUserDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.EditUserDialog",
                    controller: this
                }).then(oDialog => {
                    this._oEditUserDialog = oDialog;
                    oView.addDependent(oDialog);
                    openDialog(); // Después de cargar la modal, llamamos a la constante que carga los datos
                });
            } else {
                openDialog();
            }
        },

        setUpdateUserDialogData: function(UserData) {
            var oView = this.getView();
            oView.byId("inputEditUserId").setValue(UserData.USERID || "");
            oView.byId("inputEditUsername").setValue(UserData.USERNAME || "");
            oView.byId("inputEditUserEmail").setValue(UserData.EMAIL || "");

            var oComboCompanies = oView.byId("comboBoxEditCompanies");
            var aCompanies = oComboCompanies.getItems();
            var selectedCompanyId = null;

            for (var i = 0; i < aCompanies.length; i++) {
                if (aCompanies[i].getText() === UserData.COMPANYNAME) {
                    oComboCompanies.setSelectedItem(aCompanies[i]);
                    selectedCompanyId = aCompanies[i].getKey(); // GUARDAMOS EL ID DE LA COMPAÑIA
                    break;
                }
            }

            // Aquí llamamos a loadDeptos con el ID seleccionado del combobox de compañías
            if (selectedCompanyId) {
                this.loadDeptos(selectedCompanyId).then(() => {
                    // Ahora que ya cargaron los departamentos, seleccionamos el correcto que tiene guardado este usuario
                    var oComboCedis = oView.byId("comboBoxEditCedis");
                    var aCedis = oComboCedis.getItems();
                    for (var j = 0; j < aCedis.length; j++) {
                        if (aCedis[j].getText() === UserData.DEPARTMENT) {
                            oComboCedis.setSelectedItem(aCedis[j]);
                            break;
                        }
                    }
                });
            }

            oView.byId("inputEditUserPhoneNumber").setValue(UserData.PHONENUMBER || "");
            oView.byId("inputEditUserFunction").setValue(UserData.FUNCTION || "");

            if (UserData.BIRTHDAYDATE) {
                oView.byId("inputEditUserBirthdayDate").setDateValue(new Date(UserData.BIRTHDAYDATE));
            } else {
                oView.byId("inputEditUserBirthdayDate").setValue("");
            }

            // Manejo de roles
            var oVBox = oView.byId("selectedEditRolesVBox");
            oVBox.removeAllItems();

            if (UserData.ROLES && UserData.ROLES.length > 0) {
                UserData.ROLES.forEach(role => {
                    var SelectedKey = role.ROLEID;
                    var SelectedText = role.ROLENAME;

                    var oHBox = new HBox({
                        items: [
                            new Label({ text: SelectedText }).addStyleClass("sapUiSmallMarginEnd"),
                            new Button({
                                icon: "sap-icon://decline",
                                type: "Transparent",
                                press: function () {
                                    oVBox.removeItem(oHBox);
                                }
                            })
                        ]
                    });

                    oHBox.data("roleId", SelectedKey);
                    oVBox.addItem(oHBox);
                });
            }
        },

        onEditSaveUser: function () {
            var oView = this.getView();
            var that = this;

            // Obtener valores actuales
            var UserId = oView.byId("inputEditUserId").getValue();
            var Username = oView.byId("inputEditUsername").getValue();
            var Email = oView.byId("inputEditUserEmail").getValue();
            var Birthday = oView.byId("inputEditUserBirthdayDate").getDateValue();
            var Company = oView.byId("comboBoxEditCompanies").getSelectedItem()?.getText() || "";
            var Phone = oView.byId("inputEditUserPhoneNumber").getValue();
            var Department = oView.byId("comboBoxEditCedis").getSelectedItem()?.getText() || "";
            var Function = oView.byId("inputEditUserFunction").getValue();
            var SelectedRoles = oView.byId("selectedEditRolesVBox").getItems().map(oItem => ({
                ROLEID: oItem.data("roleId"),
                ROLEIDSAP: ""
            }));
            if (!Username || !Email || !UserId) {
                MessageToast.show("Los campos Id de usuario, Nombre e Email son obligatorios");
                return;
            }
            var userBody = { user: { USERID: UserId } };
            var original = this.selectedUser;
            // Comparaciones campo por campo
            if (Username !== original.USERNAME) {userBody.user.USERNAME = Username;}
            if (Email !== original.EMAIL) {userBody.user.EMAIL = Email;}
            if (Phone !== original.PHONENUMBER) {userBody.user.PHONENUMBER = Phone;}
            if (Function !== original.FUNCTION) {userBody.user.FUNCTION = Function;}
            if (Company !== original.COMPANYNAME) {userBody.user.COMPANYNAME = Company;}
            if (Department !== original.DEPARTMENT) {userBody.user.DEPARTMENT = Department;}
            // Comparar fechas (ignorando milisegundos)
            if (Birthday && (!original.BIRTHDAYDATE || new Date(original.BIRTHDAYDATE).toISOString().split("T")[0] !== Birthday.toISOString().split("T")[0])) {
                userBody.user.BIRTHDAYDATE = Birthday;
            }
            // Comparar roles (por ROLEID)
            const oldRoleIds = (original.ROLES || []).map(r => r.ROLEID).sort();
            const newRoleIds = SelectedRoles.map(r => r.ROLEID).sort();
            const rolesChanged = JSON.stringify(oldRoleIds) !== JSON.stringify(newRoleIds);
            if (rolesChanged) {
                userBody.user.ROLES = SelectedRoles;
            }

            // Verificar si hubo algún cambio
            if (Object.keys(userBody.user).length === 1) {
                MessageToast.show("No se realizaron cambios.");
                return;
            }

            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_USERS_URL_BASE + "updateoneuser?USERID=" + that.selectedUser.USERID, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userBody)
                }))
                .then(response => {
                    if (!response.ok) {throw new Error("Error en la respuesta del servidor");}
                    return response.json();
                })
                .then(() => {
                    MessageToast.show("Usuario actualizado correctamente");
                    that.loadUsers();
                    that.unSelectedRow();
                    that.getView().byId("EditUserDialog").close();
                })
                .catch(err => MessageToast.show("Error al actualizar usuario: " + err.message));
        },



        // ===================================================
        // ========= Eliminar Usuario Fisicamente ============
        // ===================================================

        /**
         * Función onDeleteUser .
         */
        onDeleteUser: function(){
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas eliminar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar eliminación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.deleteUser(that.selectedUser.USERID);
                        }
                    }
                });
            }else{
                MessageToast.show("Selecciona un usuario para eliminar de la base de datos");
            }
        },

        deleteUser: function(UserId){
            // Aqui agregar la lógica para eliminar de la BD
            var that = this;

            fetch("env.json")
                .then(function (response) {
                    return response.json();
                })
                .then(function (env) {
                    return fetch(env.API_USERS_URL_BASE + "deluserphysically?USERID=" + UserId, {
                        method: "POST"
                    });
                })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Error en la eliminación del usuario");
                    }
                    MessageToast.show("Usuario eliminado correctamente");
                    that.loadUsers();
                    that.unSelectedRow();
                })
                .catch(function (err) {
                    MessageToast.show("Error al eliminar usuario: " + err.message);
                    that.unSelectedRow();
                });
        },

        // ===================================================
        // ============ Desactivar el usuario ================
        // ===================================================

        /**
         * Función onDesactivateUser.
         */
        onDesactivateUser: function(){
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas desactivar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar desactivación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.desactivateUser(that.selectedUser.USERID);
                        }
                    }
                });
            }else{
                MessageToast.show("Selecciona un usuario para desactivar");
            }
        },

        desactivateUser: function(UserId){
            // Aqui agregar la lógica para desactivar al usuario
            var that = this;

            fetch("env.json")
                .then(function (response) {
                    return response.json();
                })
                .then(function (env) {
                    return fetch(env.API_USERS_URL_BASE + "deluserlogically?USERID=" + UserId, {
                        method: "POST"
                    });
                })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Error al desactivar el usuario");
                    }
                    MessageToast.show("Usuario eliminado correctamente");
                    that.loadUsers();
                    that.unSelectedRow();
                })
                .catch(function (err) {
                    MessageToast.show("Error al eliminar usuario: " + err.message);
                    that.unSelectedRow();
                });
        },


        // ===================================================
        // ============== Activar el usuario =================
        // ===================================================

        /**
         * Función onActivateUser.
         */
        onActivateUser: function(){
            if (this.selectedUser) {
                if((this.selectedUser.DETAIL_ROW.ACTIVED === true) && (this.selectedUser.DETAIL_ROW.DELETED === false)){
                    MessageToast.show("Este usuario ya está activado");
                }else{
                    var that = this;
                    MessageBox.confirm("¿Deseas activar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                        title: "Confirmar activación",
                        icon: MessageBox.Icon.WARNING,
                        onClose: function (oAction) {
                            if (oAction === MessageBox.Action.OK) {
                                that.activateUser(that.selectedUser.USERID);
                            }
                        }
                    });
                }
            }else{
                MessageToast.show("Selecciona un usuario para activar");
            }
        },

        activateUser: function(UserId){
            // Aqui agregar la lógica para activar al usuario
            var that = this;

            fetch("env.json")
                .then(function (response) {
                    return response.json();
                })
                .then(function (env) {
                    return fetch(env.API_USERS_URL_BASE + "activateuser?USERID=" + UserId, {
                        method: "POST"
                    });
                })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Error al activar el usuario");
                    }
                    MessageToast.show("Usuario activado correctamente");
                    that.loadUsers();
                    that.unSelectedRow();
                })
                .catch(function (err) {
                    MessageToast.show("Error al activar usuario: " + err.message);
                    that.unSelectedRow();
                });
        },


        //===================================================
        //=============== Funciones de la tabla =============
        //===================================================

        /**
         * Función que obtiene el usuario que se selecciona en la tabla en this.selectedUser se guarda todo el usuario
         * Además activa los botones de editar/eliminar/desactivar y activar
         */
        onUserRowSelected: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var iSelectedIndex = oTable.getSelectedIndex();

            if (iSelectedIndex < 0) {
                this.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                return;
            }

            var oContext = oTable.getContextByIndex(iSelectedIndex);
            var UserData = oContext.getObject();

            this.selectedUser = UserData;

            // Activa los botones
            this.getView().getModel("viewModel").setProperty("/buttonsEnabled", true);
        },

        unSelectedRow: function(){
            var oTable = this.byId("IdTable1UsersManageTable");
            oTable.setSelectedIndex(-1);
        },

        onSearchUser: function () {
            //Aplicar el filtro de búsqueda para la tabla
        },

        onRefresh: function(){
            this.loadUsers();
        },


        //===================================================
        //================= Funciones extra =================
        //===================================================

        isValidEmail: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        isValidPhoneNumber: function(phone) {
            return /^\d{10}$/.test(phone); // Ejemplo: 10 dígitos numéricos
        },
        
        onCancelUser: function(){
            if (this._oCreateUserDialog) {
                this.resetInputDialog();
                this._oCreateUserDialog.close();
            }
        },

        onCancelEditUser: function(){
            if(this._oEditUserDialog){
                this.resetInputEditDialog();
                this._oEditUserDialog.close();
            }
        },        

        resetInputDialog: function () {
            var oView = this.getView();
            ["inputUserId", "inputUsername", "inputUserEmail", "inputUserBirthdayDate",
             "comboBoxCompanies", "inputUserPhoneNumber", "comboBoxCedis", "inputUserFunction","comboBoxRoles"]
                .forEach(id => oView.byId(id).setValue(""));
            
            oView.byId("selectedRolesVBox").removeAllItems();
        },

        resetInputEditDialog: function () {
            var oView = this.getView();
            ["inputEditUserId", "inputEditUsername", "inputEditUserPhoneNumber", "inputEditUserEmail",
             "inputEditUserBirthdayDate", "comboBoxEditCompanies", "comboBoxEditCedis", "comboBoxEditRoles","inputEditUserFunction"]
                .forEach(id => oView.byId(id).setValue(""));
            
            oView.byId("selectedEditRolesVBox").removeAllItems();
        }


    });
});
