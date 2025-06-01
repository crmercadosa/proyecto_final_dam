/* eslint-disable max-statements */
/* eslint-disable complexity */
/* eslint-disable curly */
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
            // Modelo para RowMode UI
            const oUIModel = new JSONModel({
                rowMode: "Fixed" // Opciones: Fixed | Interactive
            });
            this.getView().setModel(oUIModel, "ui");
            // Carga los usuarios
            this.loadUsers();
            this.loadRoles();
            this.loadCompanies();
        },

        /**
         * Funcion para cargar la lista de usuarios en la tabla.
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
                    that._aAllUsers = data.value[0].users; // Copia original
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

            var valuepa = "IdCompanies-" + sSelectedKey;

            console.log("Valuepa: ", valuepa);

            if(sSelectedKey){
                this.loadCedis(valuepa);
            } else {
                // Si se borra la selección, limpiamos el modelo de departamentos
                var oEmptyModel = new JSONModel({ cedis: [] });
                oView.setModel(oEmptyModel, "cedisModel");
            }
        },
        

        loadCedis: function(valuepa){
            var oView = this.getView();
            var oCedisModel = new JSONModel();

            return fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "getallvalues?LABELID=IdCedis&VALUEPAID=" + valuepa))
                .then(res => res.json())
                .then(data => {
                    oCedisModel.setData({ cedis: data.value });
                    oView.setModel(oCedisModel, "cedisModel");
                })
                .catch(err => {
                    MessageToast.show("Error al cargar sucursales: " + err.message);
                });
        },

        onCediSelected: function(oEvent){
            var oComboBox = oEvent.getSource();
            var sSelectedKey = oComboBox.getSelectedKey();
            var oView = this.getView();
            
            var valuepa = "IdCedis-" + sSelectedKey;

            console.log("Valuepa: ", valuepa);

            if(sSelectedKey){
                this.loadDeptos(valuepa);
            } else {
                // Si se borra la selección, limpiamos el modelo de departamentos
                var oEmptyModel = new JSONModel({ deptos: [] });
                oView.setModel(oEmptyModel, "deptosModel");
            }
        },

        loadDeptos: function(valuepa){
            var oView = this.getView();
            var oDeptosModel = new JSONModel();

            console.log("Valor padre: ",valuepa);

            return fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "getallvalues?LABELID=IdDeptos&VALUEPAID=" + valuepa))
                .then(res => res.json())
                .then(data => {
                    oDeptosModel.setData({ deptos: data.value });
                    oView.setModel(oDeptosModel, "deptosModel");
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
                    ]).then(()=>{
                        this._oCreateUserDialog.open();
                    });
                });
            } else {
                Promise.all([
                ]).then(()=>{
                    this._oCreateUserDialog.open();
                });
            }
            
        },

        onSaveUser: function(){
            //Aquí la lógica para agregar el usuario
            var oView = this.getView();
            var that = this;
            var oNewValueModel = oView.getModel("rolesModel");
            var rolesData = oNewValueModel.getData().roles;


            // Obtener valores del formulario
            var UserId = oView.byId("inputUserId").getValue();
            var Pass = oView.byId("inputUserPassword").getValue();
            var Alias = oView.byId("inputUserAlias").getValue();
            var FirstN = oView.byId("inputUserFirstName").getValue();
            var LastN = oView.byId("inputUserLastName").getValue();
            var Username = FirstN + " " + LastN;
            var EmplId = oView.byId("inputEmployeeId").getValue();
            var Ext = oView.byId("inputExtension").getValue();
            var Phone = oView.byId("inputUserPhoneNumber").getValue();
            var EmailUser = oView.byId("inputEmailUser").getValue();
            var EmailDomain = oView.byId("inputEmailDomain").getValue();
            var Email = EmailUser + "@" + EmailDomain;
            var Birthday = oView.byId("inputUserBirthdayDate").getDateValue();
            var formattedBirthday = Birthday ? Birthday.toISOString().split("T")[0] : null;
            var Avatar = oView.byId("inputUserAvatar").getValue();
            var Company = oView.byId("comboBoxCompanies").getSelectedItem().getText();
            var Department = oView.byId("comboBoxDeptos").getSelectedItem().getText();
            var CediId = oView.byId("comboBoxCedis").getSelectedKey();
            var Function = oView.byId("inputUserFunction").getValue();

            var Street = oView.byId("inputStreetUser").getValue();
            var Postal = Number(oView.byId("inputPostalCodeUser").getValue());
            var City = oView.byId("inputCityUser").getValue();
            var Region = oView.byId("inputRegionUser").getValue();
            var State = oView.byId("inputStateUser").getValue();
            var Country = oView.byId("inputCountryUser").getValue();

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
                    PASSWORD: Pass,
                    USERNAME: Username,
                    ALIAS: Alias,
                    FIRSTNAME: FirstN,
                    LASTNAME: LastN,
                    BIRTHDAYDATE: formattedBirthday,
                    COMPANYNAME: Company,
                    CEDIID: CediId,
                    EMPLOYEEID: EmplId,
                    EMAIL: Email,
                    PHONENUMBER: Phone,
                    EXTENSION: Ext,
                    DEPARTMENT: Department,
                    FUNCTION: Function,
                    STREET: Street,
                    POSTALCODE: Postal,
                    CITY: City,
                    REGION: Region,
                    STATE: State,
                    COUNTRY: Country,
                    AVATAR: Avatar,
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
                .then((responseData) => {
                    MessageToast.show("Usuario creado correctamente");

                    // Extraer el usuario desde el response
                    var newUser = responseData.value[0].user;

                    // Formatear roles
                    console.log("Roles del USER: ",newUser.ROLES);
                    console.log("Roles cargados: ",rolesData);

                    // Enriquecer los roles
                    newUser.ROLES = newUser.ROLES.map(userRole => {
                        const fullRole = rolesData.find(role => role.ROLEID === userRole.ROLEID);
                        return {
                            ...userRole,
                            ROLENAME: fullRole ? fullRole.ROLENAME : "Rol desconocido"
                        };
                    });

                    console.log("Roles enriquecidos: ", newUser.ROLES);

                    // Obtener tabla y modelo
                    var oTable = that.byId("IdTable1UsersManageTable");
                    var oModel = oTable.getModel();
                    var aData = oModel.getProperty("/value/0/users");

                    // Añadir el nuevo usuario
                    aData.push(newUser);

                    // Actualizar el modelo
                    oModel.setProperty("/value/0/users", aData);

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
                this.setUpdateUserDialogData(UserData);
                this._oEditUserDialog.open();
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

        setUpdateUserDialogData: async function(UserData) {
            var oView = this.getView();
            const EmailData = UserData.EMAIL.split("@");
            const parteAntesDelArroba = EmailData[0];
            const parteDespuesDelArroba = EmailData[1];

            oView.byId("inputEditUserId").setValue(UserData.USERID || "");
            oView.byId("inputEditUserPassword").setValue(UserData.PASSWORD || "");
            oView.byId("inputEditUserAlias").setValue(UserData.ALIAS || "");
            oView.byId("inputEditUserFirstName").setValue(UserData.FIRSTNAME || "");
            oView.byId("inputEditUserLastName").setValue(UserData.LASTNAME || "");
            oView.byId("inputEditEmployeeId").setValue(UserData.EMPLOYEEID || "");
            oView.byId("inputEditExtension").setValue(UserData.EXTENSION || "");
            oView.byId("inputEditStreetUser").setValue(UserData.STREET || "");
            oView.byId("inputEditPostalCodeUser").setValue(UserData.POSTALCODE || "");
            oView.byId("inputEditCityUser").setValue(UserData.CITY || "");
            oView.byId("inputEditRegionUser").setValue(UserData.REGION || "");
            oView.byId("inputEditStateUser").setValue(UserData.STATE || "");
            oView.byId("inputEditCountryUser").setValue(UserData.COUNTRY || "");
            oView.byId("inputEditEmailUser").setValue(parteAntesDelArroba || "");
            oView.byId("inputEditEmailDomain").setValue(parteDespuesDelArroba || "");
            oView.byId("inputEditUserAvatar").setValue(UserData.AVATAR || "");
            // Cargar compañías y seleccionar la correcta
            // Primero cargamos las compañías
            const oComboCompanies = oView.byId("comboBoxEditCompanies");
            const aCompanies = oComboCompanies.getItems();
            let selectedCompanyId = null;

            for (let i = 0; i < aCompanies.length; i++) {
                if (aCompanies[i].getText() === UserData.COMPANYNAME) {
                    oComboCompanies.setSelectedItem(aCompanies[i]);
                    selectedCompanyId = aCompanies[i].getKey();
                    break;
                }
            }

            // Aquí llamamos a loadCedis con el ID seleccionado del combobox de compañías
            if (selectedCompanyId) {
                await this.loadCedis("IdCompanies-" + selectedCompanyId);
                const oComboCedis = oView.byId("comboBoxEditCedis");
                const aCedis = oComboCedis.getItems();

                for (let j = 0; j < aCedis.length; j++) {
                    if (aCedis[j].getKey() === UserData.CEDIID) {
                        oComboCedis.setSelectedItem(aCedis[j]);
                        this.selectedCedi = aCedis[j].getKey();
                        break;
                    }
                }

                if (this.selectedCedi) {
                    await this.loadDeptos("IdCedis-" + this.selectedCedi);
                    const oComboDeptos = oView.byId("comboBoxEditDeptos");
                    const aDeptos = oComboDeptos.getItems();

                    for (let k = 0; k < aDeptos.length; k++) {
                        if (aDeptos[k].getText() === UserData.DEPARTMENT) {
                            oComboDeptos.setSelectedItem(aDeptos[k]);
                            break;
                        }
                    }
                }
            }



            oView.byId("inputEditUserPhoneNumber").setValue(UserData.PHONENUMBER || "");
            oView.byId("inputEditUserFunction").setValue(UserData.FUNCTION || "");
            if (UserData.BIRTHDAYDATE) {
                var localDate = this.parseDateAsLocal(UserData.BIRTHDAYDATE);
                oView.byId("inputEditUserBirthdayDate").setDateValue(localDate);
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

            // Obtener valores del formulario
            var UserId = oView.byId("inputEditUserId").getValue();
            var Pass = oView.byId("inputEditUserPassword").getValue();
            var Alias = oView.byId("inputEditUserAlias").getValue();
            var FirstN = oView.byId("inputEditUserFirstName").getValue();
            var LastN = oView.byId("inputEditUserLastName").getValue();
            var Username = FirstN + " " + LastN;
            var EmplId = oView.byId("inputEditEmployeeId").getValue();
            var Ext = oView.byId("inputEditExtension").getValue();
            var Phone = oView.byId("inputEditUserPhoneNumber").getValue();
            var EmailUser = oView.byId("inputEditEmailUser").getValue();
            var EmailDomain = oView.byId("inputEditEmailDomain").getValue();
            var Email = EmailUser + "@" + EmailDomain;
            var Birthday = oView.byId("inputEditUserBirthdayDate").getDateValue();
            var formattedBirthday = Birthday ? Birthday.toISOString().split("T")[0] : null;
            var Avatar = oView.byId("inputEditUserAvatar").getValue();
            var Company = oView.byId("comboBoxEditCompanies").getSelectedItem().getText();
            var Department = oView.byId("comboBoxEditDeptos").getSelectedItem().getText();
            var CediId = oView.byId("comboBoxEditCedis").getSelectedKey();
            var Function = oView.byId("inputEditUserFunction").getValue();

            var Street = oView.byId("inputEditStreetUser").getValue();
            var Postal = Number(oView.byId("inputEditPostalCodeUser").getValue());
            var City = oView.byId("inputEditCityUser").getValue();
            var Region = oView.byId("inputEditRegionUser").getValue();
            var State = oView.byId("inputEditStateUser").getValue();
            var Country = oView.byId("inputEditCountryUser").getValue();

            var SelectedRoles = oView.byId("selectedEditRolesVBox").getItems().map(oItem => ({
                ROLEID: oItem.data("roleId"),
                ROLEIDSAP: ""
            }));
            if (!UserId || !Email || !UserId) {
                MessageToast.show("Los campos Id de usuario, Nombre e Email son obligatorios");
                return;
            }
            var userBody = { user: {} };
            var original = this.selectedUser;
            // Comparaciones campo por campo
            
            if (FirstN !== original.FIRSTNAME) {userBody.user.FIRSTNAME = FirstN;}
            if (LastN !== original.LASTNAME) {userBody.user.LASTNAME = LastN;}
            if (Email !== original.EMAIL) {userBody.user.EMAIL = Email;}
            if (Phone !== original.PHONENUMBER) {userBody.user.PHONENUMBER = Phone;}
            if (Function !== original.FUNCTION) {userBody.user.FUNCTION = Function;}
            if (Company !== original.COMPANYNAME) {userBody.user.COMPANYNAME = Company;}
            if (Department !== original.DEPARTMENT) {userBody.user.DEPARTMENT = Department;}
            if (CediId !== original.CEDIID) {userBody.user.CEDIID = CediId;}
            if (EmplId !== original.EMPLOYEEID) {userBody.user.EMPLOYEEID = EmplId;}
            if (Ext !== original.EXTENSION) {userBody.user.EXTENSION = Ext;}
            if (Avatar !== original.AVATAR) {userBody.user.AVATAR = Avatar;}
            if (UserId !== original.USERID) {userBody.user.USERID = UserId;}
            if (Pass !== original.PASSWORD) {userBody.user.PASSWORD = Pass;}
            if (Alias !== original.ALIAS) {userBody.user.ALIAS = Alias;}
            if (Street !== original.STREET) {userBody.user.STREET = Street;}
            if (Postal !== original.POSTALCODE) {userBody.user.POSTALCODE = Postal;}
            if (City !== original.CITY) {userBody.user.CITY = City;}
            if (Region !== original.REGION) {userBody.user.REGION = Region;}
            if (State !== original.STATE) {userBody.user.STATE = State;}
            if (Country !== original.COUNTRY) {userBody.user.COUNTRY = Country;}
            if (formattedBirthday !== original.BIRTHDAYDATE) {userBody.user.BIRTHDAYDATE = formattedBirthday;}
            if (Username !== original.USERNAME) {userBody.user.USERNAME = Username;}

            // Comparar roles (por ROLEID)
            const oldRoleIds = (original.ROLES || []).map(r => r.ROLEID).sort();
            const newRoleIds = SelectedRoles.map(r => r.ROLEID).sort();
            const rolesChanged = JSON.stringify(oldRoleIds) !== JSON.stringify(newRoleIds);
            if (rolesChanged) {
                userBody.user.ROLES = SelectedRoles;
            }
            
            // Verificar si hubo algún cambio
            if (Object.keys(userBody.user).length === 0) {
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
                    //that.loadUsers();

                    // Obtener tabla y modelo
                    var oTable = that.byId("IdTable1UsersManageTable");
                    var oModel = oTable.getModel();
                    var aUsers = oModel.getProperty("/value/0/users");

                    // Obtener el índice dentro del modelo del usuario editado
                    var index = aUsers.findIndex(user => user.USERID === that.selectedUser.USERID);

                    if (index !== -1) {
                        // Mezclar los cambios sobre el original
                        var updatedUser = { ...that.selectedUser, ...userBody.user };

                        // Enriquecer roles si es que se modificaron
                        if (updatedUser.ROLES) {
                            const rolesData = that.getView().getModel("rolesModel").getProperty("/roles");
                            updatedUser.ROLES = updatedUser.ROLES.map(userRole => {
                                const fullRole = rolesData.find(role => role.ROLEID === userRole.ROLEID);
                                return {
                                    ...userRole,
                                    ROLENAME: fullRole ? fullRole.ROLENAME : "Rol desconocido"
                                };
                            });
                        }

                        // Reemplazar en el array
                        aUsers[index] = updatedUser;

                        // Actualizar el modelo de usuarios
                        oModel.setProperty("/value/0/users", aUsers);

                        // Limpiar selección y cerrar el diálogo
                        that.unSelectedRow();
                        that.getView().byId("EditUserDialog").close();
                    } else {
                        MessageToast.show("No se encontró el usuario en el modelo.");
                    }
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
                    //that.loadUsers();
                    
                    // Obtener la tabla y el modelo
                    var oTable = that.byId("IdTable1UsersManageTable");
                    var oModel = oTable.getModel();
                    var aUsers = oModel.getProperty("/value/0/users");

                    // Buscar el índice del usuario a eliminar
                    var index = aUsers.findIndex(user => user.USERID === that.selectedUser.USERID);

                    if (index !== -1) {
                        // Eliminar del array
                        aUsers.splice(index, 1);

                        // Actualizar el modelo
                        oModel.setProperty("/value/0/users", aUsers);

                        // Limpiar selección y cerrar cualquier diálogo si es necesario
                        that.unSelectedRow();
                        that.getView().byId("ConfirmDeleteDialog")?.close(); // si tienes uno
                    } else {
                        MessageToast.show("No se encontró el usuario en el modelo.");
                    }
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
                    
                    // Actualiza directamente la instancia seleccionada
                    that.selectedUser.DETAIL_ROW.ACTIVED = false;
                    that.selectedUser.DETAIL_ROW.DELETED = true;

                    // Notifica al modelo del cambio
                    var oTable = that.byId("IdTable1UsersManageTable");
                    var oModel = oTable.getModel();
                    oModel.refresh(true);

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

                    // Actualiza directamente la instancia seleccionada
                    that.selectedUser.DETAIL_ROW.ACTIVED = true;
                    that.selectedUser.DETAIL_ROW.DELETED = false;

                    // Notifica al modelo del cambio
                    var oTable = that.byId("IdTable1UsersManageTable");
                    var oModel = oTable.getModel();
                    oModel.refresh(true);

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

        onSearchUser: function (oEvent) {
            var sQuery = oEvent.getSource().getValue().toLowerCase();
            var oTable = this.byId("IdTable1UsersManageTable");
            var oModel = new JSONModel();

            var aFilteredUsers = this._aAllUsers.filter(user =>
                (user.USERID && user.USERID.toLowerCase().includes(sQuery)) ||
                (user.USERNAME && user.USERNAME.toLowerCase().includes(sQuery)) ||
                (user.EMAIL && user.EMAIL.toLowerCase().includes(sQuery)) ||
                (user.PHONENUMBER && user.PHONENUMBER.toLowerCase().includes(sQuery)) ||
                (user.EMAIL && user.EMAIL.toLowerCase().includes(sQuery)) ||
                (user.BIRTHDAYDATE && user.BIRTHDAYDATE.toLowerCase().includes(sQuery)) ||
                (user.COMPANYNAME && user.COMPANYNAME.toLowerCase().includes(sQuery)) ||
                (user.DEPARTMENT && user.DEPARTMENT.toLowerCase().includes(sQuery)) ||
                (user.FUNCTION && user.FUNCTION.toLowerCase().includes(sQuery)) ||
                (user.ROLES && user.ROLES.some(role => role.ROLENAME && role.ROLENAME.toLowerCase().includes(sQuery)))
            );

            oModel.setData({ value: [{ users: aFilteredUsers }] });
            oTable.setModel(oModel);
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
                this.unSelectedRow();
                this._oCreateUserDialog.close();
            }
        },

        onCancelEditUser: function(){
            if(this._oEditUserDialog){
                this.resetInputEditDialog();
                this.unSelectedRow();
                this._oEditUserDialog.close();
            }
        },        

        resetInputDialog: function () {
            var oView = this.getView();

            // Limpiar inputs de texto
            [
                "inputUserId", "inputUserPassword", "inputUserAlias", "inputUserFirstName",
                "inputUserLastName", "inputEmployeeId", "inputExtension", "inputUserPhoneNumber",
                "inputUserEmail", "inputUserFunction", "inputStreetUser", "inputPostalCodeUser",
                "inputCityUser", "inputRegionUser", "inputStateUser", "inputCountryUser", "inputUserAvatar"
            ].forEach(id => {
                var input = oView.byId(id);
                if (input) {input.setValue("");}
            });

            // Limpiar date picker
            var dateInput = oView.byId("inputUserBirthdayDate");
            dateInput.setDateValue(null);

            // Limpiar ComboBoxes (deseleccionar items)
            ["comboBoxCompanies", "comboBoxCedis","comboBoxDeptos","comboBoxRoles"].forEach(id => {
                var combo = oView.byId(id);
                if (combo) combo.setSelectedItem(null);
            });

            // Limpiar VBox de roles seleccionados
            var rolesVBox = oView.byId("selectedRolesVBox");
            if (rolesVBox) rolesVBox.removeAllItems();
        },


        resetInputEditDialog: function () {
            var oView = this.getView();

            // Limpiar inputs de texto
            [
                "inputEditUserId", "inputEditUserPassword", "inputEditUserAlias", "inputEditUserFirstName",
                "inputEditUserLastName", "inputEditEmployeeId", "inputEditExtension", "inputEditUserPhoneNumber",
                "inputEditUserEmail", "inputEditUserFunction", "inputEditStreetUser", "inputEditPostalCodeUser",
                "inputEditCityUser", "inputEditRegionUser", "inputEditStateUser", "inputEditCountryUser", "inputEditUserAvatar"
            ].forEach(id => {
                var input = oView.byId(id);
                if (input) {input.setValue("");}
            });

            // Limpiar date picker
            var dateInput = oView.byId("inputEditUserBirthdayDate");
            dateInput.setDateValue(null);

            // Limpiar ComboBoxes (deseleccionar items)
            ["comboBoxEditCompanies", "comboBoxEditCedis", "comboBoxEditRoles"].forEach(id => {
                var combo = oView.byId(id);
                if (combo) combo.setSelectedItem(null);
            });

            // Limpiar VBox de roles seleccionados
            var rolesVBox = oView.byId("selectedEditRolesVBox");
            if (rolesVBox) rolesVBox.removeAllItems();
        },

        parseDateAsLocal: function(dateString) {
            var parts = dateString.split("-");
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        },

        onPhoneInputChange: function (oEvent) {
            let value = oEvent.getParameter("value").replace(/\D/g, ""); // Quita todo lo que no sea dígito

            // Formato automático tipo XXX XXX XXXX
            if (value.length > 3 && value.length <= 6) {
                value = `${value.slice(0, 3)} ${value.slice(3)}`;
            } else if (value.length > 6) {
                value = `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 10)}`;
            }

            // Setea el valor formateado
            this.byId("inputUserPhoneNumber").setValue(value);

            // También puedes actualizar el modelo
            this.getView().getModel("newUserModel").setProperty("/PHONENUMBER", value);
        }



    });
});
