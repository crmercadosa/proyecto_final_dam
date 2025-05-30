/* eslint-disable camelcase */
/* eslint-disable curly */
/* eslint-disable fiori-custom/sap-no-localhost */
/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable complexity */
// @ts-nocheck
/* eslint-disable no-console */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageBox",
    "sap/viz/ui5/controls/VizFrame",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    DateFormat,
    MessageBox,
    VizFrame,
    FlattenedDataset,
    FeedItem
  ) {
    "use strict";

    return Controller.extend(
      "com.invertions.sapfiorimodinv.controller.investments.Investments",
      {
        _oResourceBundle: null,
        _bSidebarExpanded: true,
        _sSidebarOriginalSize: "380px",

        /**
         * Lifecycle hook that is called when the controller is initialized.
         * Initializes models, sets default dates, and configures event delegates.
         */
        onInit: function () {
          // 1. Initialize Symbol Model
          this._initSymbolModel();

          // 2. Initialize Price Data Model (empty for now)
          this.getView().setModel(
            new JSONModel({
              value: [],
            }),
            "priceData"
          );

          // 3. Add event delegate for VizFrame configuration after rendering
          this.getView().addEventDelegate({
            onAfterRendering: this._onViewAfterRendering.bind(this),
          });

          // 4. Initialize ViewModel for UI state (e.g., selected tab)
          var oViewModel = new sap.ui.model.json.JSONModel({
            selectedTab: "table",
          });
          this.getView().setModel(oViewModel, "viewModel");

          // 5. Initialize Strategy Analysis Model
          var oStrategyAnalysisModelData = {
            balance: 1000,
            stock: 1,
            longSMA: 200,
            shortSMA: 50,
            rsi: 14, // Default RSI value
            startDate: null,
            endDate: null,
            controlsVisible: false,
            strategies: [
              { key: "", text: "Cargando textos..." }, // Placeholder for i18n
              { key: "MACrossover", text: "Cargando textos..." },
              { key: "Reversión Simple", text: "Cargando textos..." },
              { key: "Supertrend", text: "Cargando textos..."},
              { key: "Momentum", text: "Cargando textos..."}
            ],
            // IMPORTANT: Initialize as an ARRAY of strings for VizFrame FeedItem
            chartMeasuresFeed: ["PrecioCierre", "Señal BUY", "Señal SELL"],
          };
          var oStrategyAnalysisModel = new JSONModel(
            oStrategyAnalysisModelData
          );
          this.getView().setModel(
            oStrategyAnalysisModel,
            "strategyAnalysisModel"
          );

          // 6. Initialize Investment History Model
          
          //await this.loadSimulationsOnce("historyModel");
          this.loadSimulationsOnce();

          // 7. Initialize Strategy Result Model
          var oStrategyResultModel = new JSONModel({
            hasResults: false,
            idSimulation: null,
            signal: null,
            date_from: null,
            date_to: null,
            moving_averages: { short: null, long: null },
            signals: [],
            chart_data: [], // Initialize as empty array
            result: null,
            // Propiedades para el resumen de simulación (ahora vienen de la API)
            simulationName: "",
            symbol: "",
            startDate: null,
            endDate: null,
            TOTAL_BOUGHT_UNITS: 0,
            TOTAL_SOLD_UNITS: 0,
            REMAINING_UNITS: 0,
            FINAL_CASH: 0,
            FINAL_VALUE: 0,
            FINAL_BALANCE: 0,
            REAL_PROFIT: 0,
            PERCENTAGE_RETURN: 0, // Nueva propiedad
          });
          this.getView().setModel(oStrategyResultModel, "strategyResultModel");

          // 8. Set default date range for analysis
          this._setDefaultDates();

          // 9. Load ResourceBundle for i18n texts
          var oI18nModel = this.getOwnerComponent().getModel("i18n");
          if (oI18nModel) {
            try {
              var oResourceBundle = oI18nModel.getResourceBundle();
              if (
                oResourceBundle &&
                typeof oResourceBundle.getText === "function"
              ) {
                this._oResourceBundle = oResourceBundle;
                oStrategyAnalysisModel.setProperty("/strategies", [
                  {
                    key: "",
                    text: this._oResourceBundle.getText(
                      "selectStrategyPlaceholder"
                    ),
                  },
                  {
                    key: "MACrossover",
                    text: this._oResourceBundle.getText(
                      "movingAverageCrossoverStrategy"
                    ),
                  },
                  {
                    key: "Reversión Simple",
                    text: this._oResourceBundle.getText(
                      "movingAverageReversionSimpleStrategy"
                    ),
                  },
                  {
                    key: "Supertrend",
                    text: this._oResourceBundle.getText(
                      "movingAverageSupertrendStrategy"
                    ),
                  },
                  {
                    key: "Momentum",
                    text: this._oResourceBundle.getText(
                      "movingAverageMomentumStrategy"
                    )
                  }
                ]);
                console.log("Textos de i18n cargados correctamente.");
              } else {
                throw new Error("ResourceBundle no válido");
              }
            } catch (error) {
              console.error("Error al cargar ResourceBundle:", error);
              oStrategyAnalysisModel.setProperty("/strategies", [
                { key: "", text: "Error i18n: Seleccione..." },
                { key: "MACrossover", text: "Error i18n: Cruce Medias..." },
                { key: "Reversión Simple", text: "Error i18n: Reversion Simple..."},
                { key: "Supertrend", text: "Error i18n: Supertrend..." },
                { key: "Momentum", text: "Error i18n: Momentum..." }
              ]);
            }
          } else {
            console.error(
              "Modelo i18n no encontrado. Usando textos por defecto."
            );
            oStrategyAnalysisModel.setProperty("/strategies", [
              { key: "", text: "No i18n: Seleccione..." },
              { key: "MACrossover", text: "No i18n: Cruce Medias..." },
              { key: "Reversión Simple", text: "No i18n: Reversion Simple..." },
              { key: "Supertrend", text: "No i18n: Supertrend..."},
              { key: "Momentum", text: "No i18n: Momentum..." }
            ]);
          }

          // 10. Store original sidebar size
          var oSidebarLayoutData = this.byId("sidebarLayoutData");
          if (oSidebarLayoutData) {
            this._sSidebarOriginalSize = oSidebarLayoutData.getSize();
          } else {
            var oSidebarVBox = this.byId("sidebarVBox");
            if (oSidebarVBox && oSidebarVBox.getLayoutData()) {
              this._sSidebarOriginalSize = oSidebarVBox
                .getLayoutData()
                .getSize();
            }
          }

          // 11. Call function to initialize chart measures feed based on initial strategy
          this._updateChartMeasuresFeed();
        },

        /**
         * Event handler for tab selection.
         * @param {sap.ui.base.Event} oEvent The event object
         */
        onTabSelect: function (oEvent) {
          var sKey = oEvent.getParameter("key");
          this.getView()
            .getModel("viewModel")
            .setProperty("/selectedTab", sKey);
        },

        /**
         * Event handler for after rendering of the view.
         * Configures the VizFrame once it's rendered.
         * @private
         */
        _onViewAfterRendering: function () {
          this._configureChart();
        },

        /**
         * Initializes the symbol model with data on the mongo's collection.
         * @private
         */
        _initSymbolModel: function () {
          const oView = this.getView();
          fetch("http://localhost:3333/api/inv/companys?type=local")
            .then(response => response.json())
            .then(data => {
              const oSymbolModel = new JSONModel({
                symbols: data.value.map(company => ({
                  symbol: company.symbol,
                  name: company.name
                }))
              });
              oView.setModel(oSymbolModel, "symbolModel");
            })
            .catch(error => {
              console.error("Error loading symbol data:", error);
            });
        },

                /**
         * Initializes the symbol model with static data.
         * @private
         */
        // _initSymbolModel: function () {
        //   const oView = this.getView();
        //   const oSymbolModel = new JSONModel({
        //     symbols: [
        //       { symbol: "AAPL", name: "Apple Inc." },
        //       { symbol: "GOOGL", name: "Alphabet Inc." },
        //       { symbol: "AMZN", name: "Amazon.com Inc." },
        //       { symbol: "MSFT", name: "Microsoft Corporation" },
        //       { symbol: "TSLA", name: "Tesla Inc." },
        //       { symbol: "FB", name: "Meta Platforms Inc." },
        //       { symbol: "NFLX", name: "Netflix Inc." },
        //       { symbol: "NVDA", name: "NVIDIA Corporation" },
        //     ]
        //   });
        //   oView.setModel(oSymbolModel, "symbolModel");
        // },




        /**
         * Configures the properties of the VizFrame.
         * @private
         */
        _configureChart: function () {
          const oVizFrame = this.byId("idVizFrame");
          if (!oVizFrame) {
            console.warn(
              "Función _configureChart: VizFrame con ID 'idVizFrame' no encontrado en este punto del ciclo de vida."
            );
            return;
          }

          oVizFrame.setVizProperties({
            plotArea: {
              dataLabel: { visible: false },
              window: {
                start: null,
                end: null,
              },
            },
            valueAxis: {
              title: { text: "Precio (USD)" }, // Generalize title as it will show various measures
            },
            timeAxis: {
              title: { text: "Fecha" },
              levels: ["day", "month", "year"],
              label: {
                formatString: "dd/MM/yy",
              },
            },
            title: {
              text: "Análisis de Precios e Indicadores",
            },
            legend: {
              visible: true,
            },
            toolTip: {
              visible: true,
              formatString: "#,##0.00",
            },
            interaction: {
              zoom: {
                enablement: "enabled",
              },
              selectability: {
                mode: "single",
              },
            },
          });
          console.log(
            "Propiedades de VizFrame configuradas para permitir zoom."
          );
        },

        /**
         * Sets default start and end dates for the analysis.
         * @private
         */
        _setDefaultDates: function () {
          var oStrategyAnalysisModel = this.getView().getModel(
            "strategyAnalysisModel"
          );
          var oToday = new Date();
          oStrategyAnalysisModel.setProperty("/endDate", new Date(oToday));
          var oStartDate = new Date(oToday);
          oStartDate.setMonth(oStartDate.getMonth() - 6);
          oStrategyAnalysisModel.setProperty(
            "/startDate",
            new Date(oStartDate)
          );
        },

        /**
         * Event handler for strategy selection change.
         * Updates visible controls and chart measures.
         * @param {sap.ui.base.Event} oEvent The event object
         */
        onStrategyChange: function (oEvent) {
          var oStrategyAnalysisModel = this.getView().getModel(
            "strategyAnalysisModel"
          );
          var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
          oStrategyAnalysisModel.setProperty(
            "/controlsVisible",
            !!sSelectedKey
          );
          // Update strategyKey in the model
          oStrategyAnalysisModel.setProperty("/strategyKey", sSelectedKey);
          this._updateChartMeasuresFeed();
          // Call function to update chart measures feed based on new strategy
        },

        /**
         * Event handler for running the analysis.
         * Makes an API call to get simulation data and updates models.
         * It also triggers the update of chart measures feed after data is loaded.
         */
        onRunAnalysisPress: function () {
          var oView = this.getView();
          var oStrategyModel = oView.getModel("strategyAnalysisModel");
          var oResultModel = oView.getModel("strategyResultModel");
          var oAnalysisPanel =
            this.byId("strategyAnalysisPanelTable")?.byId(
              "strategyAnalysisPanel"
            ) ||
            this.byId("strategyAnalysisPanelChart")?.byId(
              "strategyAnalysisPanel"
            );
          var oResultPanel = this.byId("strategyResultPanel"); // Ensure this ID is correct

          var sSymbol = oView.byId("symbolSelector").getSelectedKey();

          // Basic validations
          if (!oStrategyModel.getProperty("/strategyKey")) {
            MessageBox.warning("Seleccione una estrategia");
            return;
          }
          if (!sSymbol) {
            MessageBox.warning("Seleccione un símbolo (ej: AAPL)");
            return;
          }

          if (oAnalysisPanel) {
            oAnalysisPanel.setExpanded(false);
          }

          var strategy = oStrategyModel.getProperty("/strategyKey");
          // Expand results panel
          if (oResultPanel) {
            oResultPanel.setExpanded(true);
          }

          // Adjust strategy name for API call if necessary
          let apiStrategyName = strategy; // Usamos una variable para el nombre de la API
          if (strategy === "Reversión Simple") {
            apiStrategyName = "reversionsimple";
          }else if (strategy === "Supertrend"){
            apiStrategyName = "supertrend";
          }else if (strategy === "Macrossover") {
            apiStrategyName = "macrossover";
          } else if (strategy === "Momentum") {
            apiStrategyName = "momentum";
          }

          var SPECS = []; // Initialize as array

          if (apiStrategyName === "reversionsimple") {
            const rsi = oStrategyModel.getProperty("/rsi");
            SPECS = [
              {
                INDICATOR: "rsi",
                VALUE: rsi,
              },
            ];
          } else if(apiStrategyName === "supertrend"){
            SPECS = [
              {
                INDICATOR: "ma_length",
                VALUE: oStrategyModel.getProperty("/ma_length"), // Asegúrate de que el tipo de dato sea correcto (número si lo esperas como número)
              },
              {
                INDICATOR: "atr",
                VALUE: oStrategyModel.getProperty("/atr"), // Asegúrate de que el tipo de dato sea correcto
              },
              {
                INDICATOR: "mult",
                VALUE: oStrategyModel.getProperty("/mult"), // Asegúrate de que el tipo de dato sea correcto
              },
              {
                INDICATOR: "rr",
                VALUE: oStrategyModel.getProperty("/rr"), // Asegúrate de que el tipo de dato sea correcto
              },
            ];
          } else if (apiStrategyName === "macrossover") {
            // Default for MACrossover or any other strategy
            SPECS = [
              {
                INDICATOR: "SHORT_MA",
                VALUE: oStrategyModel.getProperty("/shortSMA"),
              },
              {
                INDICATOR: "LONG_MA",
                VALUE: oStrategyModel.getProperty("/longSMA"),
              }
            ];
          } else if (apiStrategyName === "momentum") {
            SPECS = [
              {
                INDICATOR: "LONG",  
                VALUE: oStrategyModel.getProperty("/long_sma"),
              },
              {
                INDICATOR: "SHORT",
                VALUE: oStrategyModel.getProperty("/short_sma"),
              },
              {
                INDICATOR: "ADX",
                VALUE: oStrategyModel.getProperty("/adx"),
              },
              {
                INDICATOR: "RSI",
                VALUE: oStrategyModel.getProperty("/rsi_m"),
              }
            ];
          }

          // Configure request body
          var oRequestBody = {
            SIMULATION: {
              SYMBOL: sSymbol,
              STARTDATE: this.formatDate(
                // Usar el formateador público
                oStrategyModel.getProperty("/startDate")
              ),
              ENDDATE: this.formatDate(oStrategyModel.getProperty("/endDate")), // Usar el formateador público
              AMOUNT: oStrategyModel.getProperty("/stock"),
              USERID: "CRMERCADOSA", // Assuming a fixed user ID for now
              SPECS: SPECS,
            },
          };

          // API call
          const PORT = 3333; // Ensure this matches your backend port

          fetch(
            `http://localhost:${PORT}/api/inv/simulation?strategy=${apiStrategyName}`, // Usar apiStrategyName
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(oRequestBody),
            }
          )
            .then((response) =>
              response.ok ? response.json() : Promise.reject(response)
            )
            .then((data) => {
              console.log("Datos recibidos:", data);

              const aChartData = this._prepareTableData(
                data.value?.[0]?.CHART_DATA || [],
                data.value?.[0]?.SIGNALS || []
              );
              const aSignals = data.value?.[0]?.SIGNALS || [];
              const oSummary = data.value?.[0]?.SUMMARY || {}; // Obtener el objeto SUMMARY
              const simData = data.value?.[0] || [];
              // Update result model with transformed data for chart and table
              oResultModel.setData({
                hasResults: true,
                chart_data: aChartData,
                signals: aSignals,
                result: oSummary.REAL_PROFIT || 0, // Usar REAL_PROFIT del SUMMARY
                // Datos para el resumen de simulación (directamente del SUMMARY de la API)
                simulationName:
                  oStrategyModel
                    .getProperty("/strategies")
                    .find((s) => s.key === strategy)?.text || strategy,
                symbol: sSymbol,
                startDate: oStrategyModel.getProperty("/startDate"),
                endDate: oStrategyModel.getProperty("/endDate"),
                TOTAL_BOUGHT_UNITS: oSummary.TOTAL_BOUGHT_UNITS || 0,
                TOTAL_SOLD_UNITS: oSummary.TOTAL_SOLD_UNITS || 0,
                REMAINING_UNITS: oSummary.REMAINING_UNITS || 0,
                FINAL_CASH: oSummary.FINAL_CASH || 0,
                FINAL_VALUE: oSummary.FINAL_VALUE || 0,
                FINAL_BALANCE: oSummary.FINAL_BALANCE || 0,
                REAL_PROFIT: oSummary.REAL_PROFIT || 0,
                PERCENTAGE_RETURN: oSummary.PERCENTAGE_RETURN || 0,
              });

              const oHistoryModel = this.getView().getModel("historyModel");

              // Obtener los datos actuales
              const aValues = oHistoryModel.getProperty("/values") || [];

              // Crear el nuevo objeto formateado igual que en loadSimulations
              const newValue = {
                simulationName: simData.SIMULATIONNAME,
                strategyName: simData.STRATEGYID,
                symbol: simData.SYMBOL,
                rangeDate: `${new Date(simData.STARTDATE).toISOString().slice(0, 10)} - ${new Date(simData.ENDDATE).toISOString().slice(0, 10)}`,
                result: oSummary.REAL_PROFIT ?? 0,
                _fullRecord: simData
              };

              // Agregar el nuevo valor al array
              aValues.push(newValue);

              // Actualizar el modelo
              oHistoryModel.setProperty("/values", aValues);

              // Actualizar el contador de simulaciones encontradas
              oHistoryModel.setProperty("/filteredCount", aValues.length);

              // After new data is loaded, ensure chart feeds are updated based on current strategy
              // Esto es crucial para que el gráfico se actualice correctamente con las medidas de la nueva estrategia

              // Invalidate the VizFrame to force a re-render
              const oVizFrame = this.byId("idVizFrame");
              if (oVizFrame) {
                oVizFrame.invalidate(); // Invalidate the control to force re-rendering
                // oVizFrame.rerender(); // Explicitly rerender (though invalidate often triggers this) - NO ES NECESARIO
              }

              // Update balance
              var currentBalance = oStrategyModel.getProperty("/balance") || 0;
              var totalGain = oSummary.REAL_PROFIT || 0; // Usar la ganancia real del SUMMARY
              oStrategyModel.setProperty(
                "/balance",
                currentBalance + totalGain
              );
              MessageToast.show(
                "Se añadieron $" + totalGain.toFixed(2) + " a tu balance."
              );
            })
            .catch((error) => {
              console.error("Error:", error);
              MessageBox.error("Error al obtener datos de simulación");
            });
        },

        /**
         * Helper function to format a Date object to "YYYY-MM-DD" string.
         * Made public for use in XML view bindings.
         * @param {Date} oDate The date object to format.
         * @returns {string|null} The formatted date string or null if input is not a Date.
         */
        formatDate: function (oDate) {
          return oDate
            ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(
                oDate
              )
            : null;
        },

        loadSimulationsOnce: async function () {
          if (this._simulationsLoaded) return;
            await this.loadSimulations("historyModel");
            this._simulationsLoaded = true;
        },

        onSearchData: function(oEvent) {
            const sQuery = oEvent.getParameter("newValue").trim();
            const oTable = this.byId("ResultdataTable");
            const oBinding = oTable.getBinding("items");

            if (!oBinding) {
                return;
            }

            if (sQuery.length > 0) {
                const aFilters = [];

                // Campos texto
                ["DATE", "INDICATORS", "SIGNALS", "RULES"].forEach(function(field) {
                    aFilters.push(new sap.ui.model.Filter(field, sap.ui.model.FilterOperator.Contains, sQuery));
                });

                // Campos numéricos
                if (!isNaN(sQuery)) {
                    const nQuery = Number(sQuery);
                    ["OPEN", "HIGH", "LOW", "CLOSE", "VOLUME", "SHARES"].forEach(function(field) {
                        aFilters.push(new sap.ui.model.Filter(field, sap.ui.model.FilterOperator.EQ, nQuery));
                    });
                }

                const oFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    and: false
                });

                oBinding.filter(oFilter);
            } else {
                oBinding.filter([]);
            }
        },



        loadSimulations: async function (modelName) {
            try {
                const res = await fetch("http://localhost:3333/api/inv/getallSimulations");
                const data = await res.json();
                const simulationsWrapper = data.value || [];
                const simulations = simulationsWrapper[0]?.simulations || [];

                console.log("Simulaciones reales:", simulations);

                const values = simulations.map(sim => ({
                  simulationName: sim.SIMULATIONNAME,
                  strategyName: sim.STRATEGYID,
                  symbol: sim.SYMBOL,
                  rangeDate: `${new Date(sim.STARTDATE).toISOString().slice(0,10)} - ${new Date(sim.ENDDATE).toISOString().slice(0,10)}`,
                  result: sim.SUMMARY?.REAL_PROFIT ?? 0,
                  _fullRecord: sim // por si luego necesitas volver a cargar todo
                }));

                this.getView().setModel(
                  new JSONModel({
                    values,
                    filteredValues: values, // para mostrar inicialmente todos
                    filteredCount: values.length,
                    isDeleteMode: false,
                    selectedCount: 0
                  }),
                  modelName
                );

          } catch (e) {
            console.error("Error cargando simulaciones ", e);
          }
        },

        /**
         * Helper function to format the count of signals by type.
         * @param {Array} aSignals The array of signal objects.
         * @param {string} sType The type of signal to count ('buy', 'sell', 'stop_loss').
         * @returns {number} The count of signals of the specified type.
         */
        formatSignalCount: function (aSignals, sType) {
          if (!Array.isArray(aSignals)) {
            return 0;
          }
          return aSignals.filter((signal) => signal.TYPE === sType).length;
        },

        /**
         * Helper function to format the count of stop loss signals.
         * @param {Array} aSignals The array of signal objects.
         * @returns {number} The count of stop loss signals.
         */
        formatStopLossCount: function (aSignals) {
          if (!Array.isArray(aSignals)) {
            return 0;
          }
          return aSignals.filter((signal) => signal.TYPE === "stop_loss")
            .length;
        },

        /**
         * Helper function to determine the ObjectStatus state based on signal type.
         * @param {string} sType The type of signal ('buy', 'sell', 'stop_loss').
         * @returns {string} The ObjectStatus state ('Success', 'Error', 'Warning', 'None').
         */
        formatSignalState: function (sType) {
          if (sType === "buy") {
            return "Success";
          } else if (sType === "sell") {
            return "Error";
          } else if (sType === "stop_loss") {
            return "Warning";
          }
          return "None";
        },

        /**
         * Helper function to format a signal price.
         * @param {number} fPrice The price of the signal.
         * @returns {string} The formatted price string.
         */
        formatSignalPrice: function (fPrice) {
          return fPrice ? fPrice.toFixed(2) + " USD" : "N/A";
        },

        /**
         * Helper function to prepare raw API data for both table and VizFrame.
         * Ensures dates are Date objects for the chart and numeric values are parsed.
         * @param {Array} aData Raw data from API (e.g., CHART_DATA).
         * @param {Array} aSignals Signal data from API.
         * @returns {Array} Transformed data suitable for binding.
         * @private
         */
        _prepareTableData: function (aData, aSignals) {
          if (!Array.isArray(aData)) {return [];}

          return aData.map((oItem, index) => {
            // Encuentra la señal correspondiente para esta fecha, si existe
            const signal = aSignals.find((s) => s.DATE === oItem.DATE) || {};

            let dateObject = null;
            // Convert date string "YYYY-MM-DD" to a Date object.
            // This is CRUCIAL for VizFrame's time axis.
            if (
              typeof oItem.DATE === "string" &&
              oItem.DATE.match(/^\d{4}-\d{2}-\d{2}$/)
            ) {
              dateObject = new Date(oItem.DATE);
            } else if (oItem.DATE instanceof Date) {
              dateObject = oItem.DATE;
            }

            // Extract indicator values from the INDICATORS array
            let shortMA = null;
            let longMA = null;
            let rsi = null;
            let sma = null; // Variable para la SMA simple
            let ma = null;
            let atr = null;
            let adx = null;
            if (Array.isArray(oItem.INDICATORS)) {
              oItem.INDICATORS.forEach((indicator) => {
                // Asegúrate de que estos nombres coincidan EXACTAMENTE con lo que tu API devuelve
                // Por ejemplo, si tu API devuelve "SHORT_MA" (mayúsculas), cambia aquí a "SHORT_MA"
                if (indicator.INDICATOR === "short_ma") {
                  shortMA = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "long_ma") {
                  longMA = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "rsi") {
                  rsi = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "sma") {
                  // Nuevo indicador para Reversión Simple
                  sma = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "ma") {
                  // Nuevo indicador para longitud de MA
                  ma = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "atr") {
                  // Nuevo indicador para ATR
                  atr = parseFloat(indicator.VALUE);
                } else if (indicator.INDICATOR === "adx") {
                  // Nuevo indicador para ADX
                  adx = parseFloat(indicator.VALUE);
                }
              });
            }

            // Construcción dinámica de la cadena de texto de indicadores para la tabla
            let indicatorParts = [];
            if (shortMA !== null && !isNaN(shortMA)) {
              indicatorParts.push(`SMA Corta: ${shortMA.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (longMA !== null && !isNaN(longMA)) {
              indicatorParts.push(`SMA Larga: ${longMA.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (rsi !== null && !isNaN(rsi)) {
              indicatorParts.push(`RSI: ${rsi.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (sma !== null && !isNaN(sma)) {
              // Incluir SMA simple si tiene valor
              indicatorParts.push(`SMA: ${sma.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (ma !== null && !isNaN(ma)) {
              indicatorParts.push(`MA: ${ma.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (atr !== null && !isNaN(atr)) {
              indicatorParts.push(`ATR: ${atr.toFixed(2)}`); // Formatear a 2 decimales
            }
            if (adx !== null && !isNaN(adx)) {
              indicatorParts.push(`ADX: ${adx.toFixed(2)}`); // Formatear a 2 decimales
            }

            const indicatorsText =
              indicatorParts.length > 0 ? indicatorParts.join(", ") : "N/A";

            return {
              DATE_GRAPH: dateObject, // Property for VizFrame (Date object)
              DATE: dateObject
                ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(
                    dateObject
                  )
                : null, // Property for table (formatted string)
              OPEN: parseFloat(oItem.OPEN),
              HIGH: parseFloat(oItem.HIGH),
              LOW: parseFloat(oItem.LOW),
              CLOSE: parseFloat(oItem.CLOSE),
              VOLUME: parseFloat(oItem.VOLUME),
              // Properties for chart measures (will be null if not present for a given row)
              SHORT_MA: shortMA,
              LONG_MA: longMA,
              RSI: rsi,
              SMA: sma, // Asegúrate de incluir SMA aquí para que el gráfico pueda acceder a él
              // Signal points on chart (only show value if a signal exists)
              MA: ma,
              ATR: atr,
              ADX: adx,
              BUY_SIGNAL:
                signal.TYPE === "buy" ? parseFloat(oItem.CLOSE) : null,
              SELL_SIGNAL:
                signal.TYPE === "sell" ? parseFloat(oItem.CLOSE) : null,
              // Propiedades para la tabla (ej. texto combinado de indicadores)
              INDICATORS_TEXT: indicatorsText, // Usamos la cadena construida dinámicamente

              SIGNALS: signal.TYPE
                ? "ACCIÓN " + signal.TYPE.toUpperCase()
                : "SIN ACCIÓN", // Convertir a mayúsculas
              RULES: signal.REASONING
                ? "RAZÓN " + signal.REASONING
                : "SIN RAZÓN",
              SHARES: signal.SHARES ?? 0,
              // Añadir propiedades de señal para el fragmento de última operación
              type: signal.TYPE || "",
              price: signal.PRICE || 0,
              reasoning: signal.REASONING || "",
            };
          });
        },

        /**
         * Dynamically updates the list of measures displayed on the VizFrame's value axis.
         * This function is called onInit and when the strategy changes.
         * @private
         */
        _updateChartMeasuresFeed: function () {
          const oStrategyAnalysisModel = this.getView().getModel(
            "strategyAnalysisModel"
          );
          const sStrategyKey =
            oStrategyAnalysisModel.getProperty("/strategyKey");

          // Define las medidas base que siempre deben estar presentes
          // ¡IMPORTANTE! Usar los NOMBRES de las MeasureDefinition del XML, no los nombres de las propiedades de los datos.
          let aMeasures = ["PrecioCierre", "Señal BUY", "Señal SELL"];

          // Añade medidas adicionales según la estrategia seleccionada
          if (sStrategyKey === "MACrossover") {
            aMeasures.push("SHORT_MA", "LONG_MA"); // Estos nombres coinciden en tu XML
          } else if (sStrategyKey === "Reversión Simple") {
            aMeasures.push("RSI", "SMA"); // Estos nombres coinciden en tu XML
          } else if( sStrategyKey === "Supertrend") {
            aMeasures.push("MA","ATR");
          } else if (sStrategyKey === "Momentum") {
            aMeasures.push("LONG_MA", "SHORT_MA", "ADX", "RSI");
          }


          // Actualiza la propiedad del modelo con las medidas actuales
          oStrategyAnalysisModel.setProperty("/chartMeasuresFeed", aMeasures);
          console.log("Medidas actualizadas en el modelo:", aMeasures);

          const oVizFrame = this.byId("idVizFrame");
          if (oVizFrame) {
            // Obtener el dataset actual
            const oDataset = oVizFrame.getDataset();
            if (oDataset) {
              // Eliminar feeds existentes para valueAxis
              const aCurrentFeeds = oVizFrame.getFeeds();
              for (let i = aCurrentFeeds.length - 1; i >= 0; i--) {
                const oFeed = aCurrentFeeds[i];
                if (oFeed.getUid() === "valueAxis") {
                  oVizFrame.removeFeed(oFeed);
                }
              }

              // Crear y añadir un nuevo FeedItem para valueAxis con las medidas actualizadas
              const oNewValueAxisFeed = new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: aMeasures,
              });
              oVizFrame.addFeed(oNewValueAxisFeed);
              console.log(
                "Nuevo Feed 'valueAxis' añadido con:",
                oNewValueAxisFeed.getValues()
              );

              // Forzar la actualización del dataset si es necesario (a veces ayuda)
              // oDataset.setModel(oVizFrame.getModel("strategyResultModel")); // Esto puede ser redundante si el binding ya está bien

              // Invalida el VizFrame para forzar un re-renderizado
              oVizFrame.invalidate();
              console.log(
                "VizFrame invalidado y feeds re-establecidos para redibujar con nuevas medidas."
              );
            } else {
              console.warn("Dataset no encontrado en el VizFrame.");
            }
          } else {
            console.warn("VizFrame con ID 'idVizFrame' no encontrado.");
          }
        },

        /**
         * Event handler for refreshing chart data.
         * Triggers a new analysis run with the current symbol.
         */
        onRefreshChart: function () {
          const oSymbolModel = this.getView().getModel("symbolModel");
          const sCurrentSymbol = this.byId("symbolSelector").getSelectedKey(); // Get selected symbol

          if (sCurrentSymbol) {
            this.onRunAnalysisPress(); // Recalculate and update chart data
          } else {
            const aSymbols = oSymbolModel.getProperty("/symbols");
            if (aSymbols && aSymbols.length > 0) {
              const sDefaultSymbol = aSymbols[0].symbol;
              this.byId("symbolSelector").setSelectedKey(sDefaultSymbol); // Set default if none selected
              this.onRunAnalysisPress();
            } else {
              MessageToast.show("Por favor, seleccione un símbolo.");
            }
          }
        },

        /**
         * Event handler for data point selection on the VizFrame.
         * Updates the ViewModel with selected point's data.
         * @param {sap.ui.base.Event} oEvent The event object
         */
        onDataPointSelect: function (oEvent) {
          const oData = oEvent.getParameter("data");
          console.log("Datos seleccionados:", oData);

          if (oData && oData.length > 0) {
            const oSelectedData = oData[0];
            console.log("Datos del punto seleccionado:", oSelectedData);

            const sFecha = oSelectedData.data.DATE_GRAPH; // This should be a Date object
            const fPrecioCierre = oSelectedData.data.CLOSE;

            if (sFecha && fPrecioCierre !== undefined) {
              const oViewModel = this.getView().getModel("viewModel");
              oViewModel.setProperty("/selectedPoint", {
                DATE: sFecha,
                CLOSE: fPrecioCierre,
              });
            } else {
              console.warn(
                "Los datos seleccionados no contienen DATE_GRAPH o CLOSE."
              );
            }
          } else {
            console.warn("No se seleccionaron datos.");
          }
        },

        /**
         * Event handler for showing investment history popover.
         * @param {sap.ui.base.Event} oEvent The event object
         */
        onHistoryPress: function (oEvent) {
          if (!this._oHistoryPopover) {
            this._oHistoryPopover = sap.ui.xmlfragment(
              "myFragmentId",
              "com.invertions.sapfiorimodinv.view.investments.fragments.InvestmentHistoryPanel",
              this
            );
            this.getView().addDependent(this._oHistoryPopover);
          }

          if (this._oHistoryPopover.isOpen()) {
            const oTable = sap.ui.core.Fragment.byId("myFragmentId", "historyTable");
            oTable.removeSelections(); // Elimina todas las selecciones
            this._oHistoryPopover.close();
            return;
          }
          this._oHistoryPopover.openBy(oEvent.getSource());
        },

        onCloseHistoryPopover: function () {
            if (this._oHistoryPopover) {
                  const oTable = sap.ui.core.Fragment.byId("myFragmentId", "historyTable");
                  oTable.removeSelections(); // Elimina todas las selecciones
                this._oHistoryPopover.close();
            }
        },

        onSearch: function (oEvent) {
          const sQuery = oEvent.getParameter("query")?.toLowerCase() || "";
          const oModel = this.getView().getModel("historyModel");
          const aAllValues = oModel.getProperty("/values") || [];
          // Si no hay búsqueda, restablece el filtrado original
          if (!sQuery) {
            oModel.setProperty("/filteredValues", aAllValues);
            oModel.setProperty("/filteredCount", aAllValues.length);
            return;
          }
          const aFiltered = aAllValues.filter(item => {
          return (
            item.simulationName?.toLowerCase().includes(sQuery) ||
            item.strategyName?.toLowerCase().includes(sQuery) ||
            item.symbol?.toLowerCase().includes(sQuery) ||
            item.rangeDate?.toLowerCase().includes(sQuery) ||
            String(item.result).includes(sQuery)
            );
          });
          oModel.setProperty("/filteredValues", aFiltered);
          oModel.setProperty("/filteredCount", aFiltered.length);
        },
        
        onFilterDateChange: function (oEvent) {
          const oView = this.getView();
          const oModel = oView.getModel("historyModel");
          const aAllValues = oModel.getProperty("/values");

          const oDateRange = sap.ui.core.Fragment.byId("myFragmentId", "dateRangeFilter");
          const oDateFrom = oDateRange.getDateValue();  // Fecha inicio
          const oDateTo = oDateRange.getSecondDateValue(); // Fecha fin

          const aFiltered = aAllValues.filter(item => {
            const simStart = new Date(item._fullRecord.STARTDATE);
            const simEnd = new Date(item._fullRecord.ENDDATE);

            if (oDateFrom && simStart < oDateFrom) return false;
            if (oDateTo && simEnd > oDateTo) return false;

            return true;
          });

          oModel.setProperty("/filteredValues", aFiltered);
          oModel.setProperty("/filteredCount", aFiltered.length);
        },


        onLoadStrategy: function () {
            const oTable = sap.ui.core.Fragment.byId("myFragmentId", "historyTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Por favor selecciona una estrategia antes de cargar.");
                return;
            }

            const oContext = oSelectedItem.getBindingContext("historyModel");
            const oData = oContext.getObject();
            const fullRecord = oData._fullRecord;
            console.log("aasdsadsadsa", fullRecord);
            // Agrupar señales por fecha
            const signalsByDate = {};
            (fullRecord.SIGNALS || []).forEach(signal => {
                const dateKey = signal.DATE?.substring(0, 10);
                if (dateKey) {
                    if (!signalsByDate[dateKey]) {
                        signalsByDate[dateKey] = [];
                    }
                    signalsByDate[dateKey].push(signal);
                }
            });

            // Procesar CHART_DATA, añadiendo señales agrupadas por día
            const chartDataProcessed = (fullRecord.CHART_DATA || []).map(item => {
                const dateKey = item.DATE?.substring(0, 10);
                const signalsForDay = signalsByDate[dateKey] || [];

                // Si hay señales para ese día, concatenar los campos en arrays
                const rules = signalsForDay.map(s => s.REASONING);
                const signals = signalsForDay.map(s => s.TYPE);
                const shares = signalsForDay.map(s => s.SHARES);

                return {
                    DATE: dateKey,
                    OPEN: item.OPEN,
                    HIGH: item.HIGH,
                    LOW: item.LOW,
                    CLOSE: item.CLOSE,
                    VOLUME: item.VOLUME,
                    SPECS: item.INDICATORS,
                    RULES: rules.length > 0 ? rules : [""],
                    SIGNALS: signals.length > 0 ? signals : [""],
                    SHARES: shares.length > 0 ? shares : [0]
                };
            }).reverse(); // Mostrar desde la fecha más antigua

            // Pasar datos al método que carga la tabla y gráfico
            this._loadTableDataBySymbol(chartDataProcessed);
            console.log("Señales", chartDataProcessed);
            // Para el modelo de resultados también mandamos todas las señales planas invertidas
            const simplifiedSignals = Object.values(signalsByDate).flat().reverse();
            const oResultModel = this.getView().getModel("strategyResultModel");
            oResultModel.setProperty("/signals", simplifiedSignals);
            //Aqui ponemos todo lo de resumen
            oResultModel.setProperty("/simulationName", fullRecord.SIMULATIONNAME);
            oResultModel.setProperty("/symbol", fullRecord.SYMBOL);
            oResultModel.setProperty("/startDate", fullRecord.STARTDATE);
            oResultModel.setProperty("/endDate", fullRecord.ENDDATE);


            const oSummary = fullRecord.SUMMARY;
            oResultModel.setProperty("/FINAL_BALANCE", oSummary.FINAL_BALANCE);
            oResultModel.setProperty("/FINAL_CASH", oSummary.FINAL_CASH);
            oResultModel.setProperty("/FINAL_VALUE", oSummary.FINAL_VALUE);
            oResultModel.setProperty("/REAL_PROFIT", oSummary.REAL_PROFIT);
            oResultModel.setProperty("/REMAINING_UNITS", oSummary.REMAINING_UNITS);
            oResultModel.setProperty("/TOTAL_BOUGHT_UNITS", oSummary.TOTAL_BOUGHT_UNITS);
            oResultModel.setProperty("/TOTAL_SOLD_UNITS", oSummary.TOTAL_SOLDUNITS); // ojo con nombre diferente
            oResultModel.setProperty("/PERCENTAGE_RETURN", oSummary.PERCENTAGE_RETURN);
        },

        _loadTableDataBySymbol: function (aApiData) {
            const oResultModel = this.getView().getModel("strategyResultModel");

            if (Array.isArray(aApiData)) {
                // Formatear fechas
                const dataWithFormattedDates = aApiData.map(item => ({
                    ...item,
                    DATE: item.DATE ? item.DATE.substring(0, 10) : "",
                    DATE_GRAPH: item.DATE ? item.DATE.substring(0, 10) : "",
                    BUY: item.BUY ? item.BUY : "",
                    SELL: item.SELL ? item.SELL : "",
                }));

                const aPreparedData = this._prepareTableDataSaved(dataWithFormattedDates);
                console.log(aPreparedData);
                oResultModel.setProperty("/chart_data", aPreparedData);

                this._addVizMeasures(dataWithFormattedDates);

            } else {
                oResultModel.setProperty("/chart_data", []);
            }
        },

        _prepareTableDataSaved: function (aData) {
            if (!Array.isArray(aData)) return [];

            return aData.map(oItem => {

                let shortMValue = null;
                let longMValue = null;
                let rsiValue = null;
                let adxValue = null;
                let maValue = null;
                let atrValue = null;
                let smaValue = null;

                if (Array.isArray(oItem.INDICATORS)) {
                    oItem.INDICATORS.forEach(ind => {
                        switch (ind.INDICATOR) {
                            case "short_ma":
                                shortMValue = ind.VALUE;
                                break;
                            case "long_ma":
                                longMValue = ind.VALUE;
                                break;
                            case "adx":
                                adxValue = ind.VALUE;
                                break;
                            case "rsi":
                                rsiValue = ind.VALUE;
                                break;
                            case "ma":
                                maValue = ind.VALUE;
                                break;
                            case "atr":
                                atrValue = ind.VALUE;
                                break;
                            case "sma":
                                smaValue = ind.VALUE;
                                break;
                        }
                    });
                }
                const dateIso = oItem.DATE || oItem.date; // puede ser uppercase o lowercase según el backend
                console.log(oItem.SIGNALS?.[0]);
                return {
                    DATE: dateIso?.substring(0, 10), // para la tabla (YYYY-MM-DD)
                    DATE_GRAPH: new Date(dateIso),   // para el gráfico (objeto Date)
                    OPEN: oItem.OPEN ?? oItem.open,
                    HIGH: oItem.HIGH ?? oItem.high,
                    LOW: oItem.LOW ?? oItem.low,
                    CLOSE: oItem.CLOSE ?? oItem.close,
                    VOLUME: oItem.VOLUME ?? oItem.volume,
                    SHORT_MA: oItem.SHORT_MA ?? shortMValue,
                    LONG_MA: oItem.LONG_MA ?? longMValue,
                    ADX: oItem.ADX ?? adxValue,
                    RSI: oItem.RSI ?? rsiValue,
                    MA: oItem.ADX ?? maValue,
                    ATR: oItem.RSI ?? atrValue,
                    SMA: oItem.RSI ?? smaValue,
                    INDICATORS: Array.isArray(oItem.INDICATORS)
                        ? oItem.INDICATORS.map(ind => `${ind.INDICATOR}: ${ind.VALUE.toFixed(2)}`).join(", ")
                        : "",
                    SIGNALS: oItem.SIGNALS,
                    RULES: oItem.RULES,
                    SHARES: oItem.SHARES,
                    BUY_SIGNAL: oItem.BUY_SIGNAL,
                    SELL: oItem.SIGNALS?.[0] === "sell" ? oItem.CLOSE : null,
                    BUY: oItem.SIGNALS?.[0] === "buy" ? oItem.CLOSE : null



                };
            });
        },

        _addVizMeasures: function (aData) {
            console.log(aData);

            // 🔄 Preprocesar: convertir INDICATORS[] en propiedades directas
            aData.forEach(dayItem => {
                (dayItem.INDICATORS || []).forEach(ind => {
                    const key = ind.INDICATOR.toUpperCase();
                    dayItem[key] = ind.VALUE;
                });
            });

            const oVizFrame = this.byId("idVizFrame");
            const oDataset = oVizFrame.getDataset();

            // 🧹 Limpia medidas y feeds existentes
            oDataset.removeAllMeasures();
            oVizFrame.removeAllFeeds();

            // 📈 Definir medidas dinámicas según los datos
            const aMeasures = [];

            // Precio de cierre (siempre)
            aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                name: "PrecioCierre",
                value: "{strategyResultModel>CLOSE}"
            }));

            console.log(aData[0]);
            // Agregar indicadores si existen
            if ("SHORT_MA" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "ShortMA",
                    value: "{strategyResultModel>SHORT_MA}"
                }));
            }

            if ("LONG_MA" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "LongMA",
                    value: "{strategyResultModel>LONG_MA}"
                }));
            }

            if ("RSI" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "RSI",
                    value: "{strategyResultModel>RSI}"
                }));
            }

            if ("ADX" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "ADX",
                    value: "{strategyResultModel>ADX}"
                }));
            }

            if ("MA" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "MA",
                    value: "{strategyResultModel>MA}"
                }));
            }

            if ("ATR" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "ATR",
                    value: "{strategyResultModel>ATR}"
                }));
            }
            if ("SMA" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "SMA",
                    value: "{strategyResultModel>SMA}"
                }));
            }

            // Señales de compra/venta (opcional, si las agregas como números)


            if ("BUY" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "Señal BUY",
                    value: "{strategyResultModel>BUY}"
                }));
            }

            if ("SELL" in aData[0]) {
                aMeasures.push(new sap.viz.ui5.data.MeasureDefinition({
                    name: "Señal SELL",
                    value: "{strategyResultModel>SELL}"
                }));
            }


            // 📌 Agrega todas las medidas al dataset
            aMeasures.forEach(oMeasure => oDataset.addMeasure(oMeasure));

            // 📊 Feeds para ejes
            const oFeedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: aMeasures.map(m => m.getName())
            });

            const oFeedTimeAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "timeAxis",
                type: "Dimension",
                values: ["Fecha"]
            });

            oVizFrame.addFeed(oFeedTimeAxis);
            oVizFrame.addFeed(oFeedValueAxis);
            this._configureChart();
        },

        /**
         * Toggles the visibility of advanced filters in the history popover.
         */
        onToggleRangeDateFilter: function () {
          const oPanelDates = sap.ui.core.Fragment.byId("myFragmentId", "rangeDatesFilter");
          const oPanelInv = sap.ui.core.Fragment.byId("myFragmentId", "rangeInversionFilter");
          const oPanelRent = sap.ui.core.Fragment.byId("myFragmentId", "rangeRentFilter");

          if (!oPanelDates || !oPanelInv || !oPanelRent) {
            console.warn("Alguno de los paneles no fue encontrado.");
            return;
          }

          const bCurrentVisible = oPanelDates.getVisible(); // Ver si está visible actualmente

          // Cierra todos
          oPanelDates.setVisible(false);
          oPanelInv.setVisible(false);
          oPanelRent.setVisible(false);

          // Abre solo si estaba oculto
          if (!bCurrentVisible) {
            oPanelDates.setVisible(true);
          }
        },


        onToggleRangeInversionFilter: function () {
          const oPanelInv = sap.ui.core.Fragment.byId("myFragmentId", "rangeInversionFilter");
          const oPanelDates = sap.ui.core.Fragment.byId("myFragmentId", "rangeDatesFilter");
          const oPanelRent = sap.ui.core.Fragment.byId("myFragmentId", "rangeRentFilter");

          if (!oPanelInv || !oPanelDates || !oPanelRent) {
            console.warn("Alguno de los paneles no fue encontrado");
            return;
          }

          const bCurrentVisible = oPanelInv.getVisible(); // Guarda visibilidad actual

          // Cierra todos los paneles
          oPanelInv.setVisible(false);
          oPanelDates.setVisible(false);
          oPanelRent.setVisible(false);

          // Solo vuelve a abrir si estaba cerrado
          if (!bCurrentVisible) {
            oPanelInv.setVisible(true);
          }
        },

        onToggleRangeRentFilter: function () {
          const oPanelRent = sap.ui.core.Fragment.byId("myFragmentId", "rangeRentFilter");
          const oPanelDates = sap.ui.core.Fragment.byId("myFragmentId", "rangeDatesFilter");
          const oPanelInv = sap.ui.core.Fragment.byId("myFragmentId", "rangeInversionFilter");

          if (!oPanelRent || !oPanelDates || !oPanelInv) {
            console.warn("Alguno de los paneles no fue encontrado");
            return;
          }

          const bCurrentVisible = oPanelRent.getVisible(); // guarda el estado actual

          // Cerrar todos
          oPanelRent.setVisible(false);
          oPanelDates.setVisible(false);
          oPanelInv.setVisible(false);

          // Solo abrir el panel rentabilidad si estaba cerrado
          if (!bCurrentVisible) {
            oPanelRent.setVisible(true);
          }
        }

      }
    );
  }
);
