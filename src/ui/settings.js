﻿/*
 * This file is part of SmartProxy <https://github.com/salarcode/SmartProxy>,
 * Copyright (C) 2017 Salar Khalilzadeh <salar2k@gmail.com>
 *
 * SmartProxy is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * SmartProxy is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmartProxy.  If not, see <http://www.gnu.org/licenses/>.
 */
(function () {
	var settingsUiData = null;
	var changeTracking = {
		rules: false,
		servers: false,
		activeProxy: false
	};

	function populateSettingsUiData(settingsUiData) {

		let divNoServersWarning = $("#divNoServersWarning");
		if (settingsUiData.proxyServers.length > 0) {

			divNoServersWarning.hide();
		} else {
			divNoServersWarning.show();
		}

		$("#spanVersion").text("Version: " + settingsUiData.version);

	}

	function initializeUi() {

		if (environment.chrome) {
			$("#divAlertChrome").show();
		} else {
			$("#divAlertFirefox").show();
		}


		function downloadData(data, fileName) {

			var downloadUrl = "data:application/json;charset=utf-8," + encodeURIComponent(data);
			var a = $("<a/>")
				.attr("download", fileName || "")
				.attr("href", downloadUrl);
			a[0].dispatchEvent(new MouseEvent("click"));
		}

		function checkRestartRequired(required) {
			if (!required) return;

			$("#divRestartRequired").show();

			// confirm is more anoying?
			//messageBox.confirm('Due a Firefox bug, any SmartProxy changes require restart. ' +
			//	'Do you want to restart the add-on now?<br/>' +
			//	'Sorry for inconvenience.',
			//	function() {
			//		browser.runtime.reload();
			//	});
		}

		var cmbActiveProxyServer = $("#cmbActiveProxyServer");
		cmbActiveProxyServer.on("change",
			function () {

				var proxyName = cmbActiveProxyServer.val();
				var proxyServers = settingsGrid.getServers();

				var server = settingsGrid.findProxyServerByName(proxyServers, proxyName);

				// this can be null
				settingsUiData.activeProxyServer = server;

				//messageBox.info("ActiveProxyServer> " + server + " > " + proxyName);
			});

		$("#btnSaveProxyServers").click(function () {

			var saveData = {
				proxyServers: settingsGrid.getServers(),
				activeProxyServer: settingsUiData.activeProxyServer
			};

			polyfill.runtimeSendMessage(
				{
					command: "settingsSaveProxyServers",
					saveData: saveData
				},
				function (response) {
					if (!response) return;
					if (response.success) {
						if (response.message)
							messageBox.success(response.message);

						checkRestartRequired(response.restartRequired);

					} else {
						if (response.message)
							messageBox.error(response.message);
					}
				},
				function (error) {
					messageBox.error("Failed to save servers. " + error.message);
				});

			changeTracking.servers = false;
			changeTracking.activeProxy = false;

		});
		$("#btnRejectProxyServers").click(function () {
			// reset the data
			settingsGrid.loadRules(settingsUiData.proxyServers);

			changeTracking.servers = false;

			messageBox.info("Changes reverted successfully");
		});

		$("#btnSaveProxyRules").click(function () {

			var rules = settingsGrid.getRules();

			polyfill.runtimeSendMessage(
				{
					command: "settingsSaveProxyRules",
					proxyRules: rules
				},
				function (response) {
					if (!response) return;
					if (response.success) {
						if (response.message)
							messageBox.success(response.message);

						checkRestartRequired(response.restartRequired);

					} else {
						if (response.message)
							messageBox.error(response.message);
					}
				},
				function (error) {
					messageBox.error("Failed to save servers. " + error.message);
				});

			changeTracking.rules = false;

		});
		$("#btnRejectProxyRules").click(function () {
			// reset the data
			settingsGrid.loadRules(settingsUiData.proxyRules);

			changeTracking.rules = false;

			messageBox.info("Changes reverted successfully");
		});

		$("#btnBackupComplete").on("click",
			function () {

				var data = JSON.stringify(settingsUiData);
				downloadData(data, "SmartProxy-FullBackup.json");
			});

		$("#btnBackupRules").click(function () {
			var data = JSON.stringify(
				{
					proxyRules: settingsUiData.proxyRules
				}
			);
			downloadData(data, "SmartProxy-RulesBackup.json");
		});
		$("#btnRestoreBackup").click(function () {

			function callRestoreSettings(fileData) {

				polyfill.runtimeSendMessage(
					{
						command: "restoreSettings",
						fileData: fileData
					},
					function (response) {

						if (response.success) {
							if (response.message) {
								messageBox.success(response.message,
									false,
									function () {
										// reload the current settings page
										document.location.reload();
									});
							} else {
								// reload the current settings page
								document.location.reload();
							}
						} else {
							if (response.message) {
								messageBox.error(response.message);
							}
						}
					},
					function (error) {
						messageBox.error("There was an error in restoring the backup");
						polyfill.runtimeSendMessage("restoreSettings failed with> " + error.message);
					});
			}

			selectFileOnTheFly($("#frmRestoreBackup")[0],
				"retore-file",
				function (inputElement, files) {
					var file = files[0];

					var reader = new FileReader();
					reader.onerror = function (event) {
						messageBox.error("Failed to read the selected file");
					};
					reader.onload = function (event) {
						var textFile = event.target;
						var fileText = textFile.result;

						callRestoreSettings(fileText);
					};
					reader.readAsText(file);
				},
				"application/json");


		});
	}

	function initialize() {
		polyfill.runtimeSendMessage("getDataForSettingsUi",
			function (dataForSettingsUi) {

				if (dataForSettingsUi != null) {
					settingsUiData = dataForSettingsUi;
					populateSettingsUiData(settingsUiData);

					settingsGrid.loadRules(settingsUiData.proxyRules);
					settingsGrid.loadServers(settingsUiData.proxyServers);
					settingsGrid.loadActiveProxyServer(settingsUiData.proxyServers);
				}

			},
			function (error) {
				polyfill.runtimeSendMessage("getDataForSettingsUi failed! > " + error);
			});
	}

	function selectFileOnTheFly(form, inputName, onFileSelected, acceptFormat) {
		///<summary>Select a file from a detached file input</summary>
		var fileContainer = $(`<div style='display: none'><input style='display: none' type=file accept='${acceptFormat || ""}' class='' name='${inputName}'/></div>`);
		var fileInput = fileContainer.find("input");

		form = $(form);
		form.append(fileContainer);

		function onfile(evt) {
			fileContainer.remove();

			var files = evt.target.files;
			if (!files.length)
				return;

			if (onFileSelected) {
				onFileSelected(fileInput, files);
			}
		}
		fileInput.on("change", onfile);
		fileInput.trigger("click");
	}

	// ------------------
	var settingsGrid = {
		initialize: function () {
			settingsGrid.initializeServersGrid();
			settingsGrid.initializeRulesGrid();

			$("#btnAddProxyServer").click(function () {
				settingsGrid.insertRowServersGrid();
			});


			$("#btnImportProxyServer").click(function () {
				let modalContainer = $("#modalImportProxyServer");
				var selectFileElement = modalContainer.find("#btnImportProxyServerSelectFile")[0];

				if (selectFileElement.files.length == 0) {
					messageBox.error("Please select a rules file");
					return;
				}

				var selectFile = selectFileElement.files[0];

				var append = modalContainer.find("#cmbImportProxyServerOverride_Append").prop("checked");
				var sourceType = modalContainer.find("#cmbImportProxyServerType").val();

				var proxyRules = settingsGrid.getRules();

				var importFunction;
				if (sourceType == "autoproxy") {
					importFunction = ruleImporter.importAutoProxy;
				} else if (sourceType == "switchy") {
					importFunction = ruleImporter.importSwitchyRules;
				} else {
					messageBox.warning("Please select source type");
				}

				if (importFunction)
					importFunction(selectFile,
						append,
						proxyRules,
						function (response) {
							if (!response) return;

							if (response.success) {
								if (response.message)
									messageBox.info(response.message);

								// empty the file input
								selectFileElement.value = "";

								var rules = response.result;
								settingsGrid.loadRules(rules);

								// close the window
								modalContainer.modal("hide");
							} else {
								if (response.message)
									messageBox.error(response.message);
							}
						},
						function (error) {
							var message = '';
							if (error && error.message)
								message = error.message;
							messageBox.error("Failed to import the file. " + message);
						});
			});

			$("#btnAddProxyRule").click(function () {
				settingsGrid.insertRowRulesGrid();
			});
		},
		findProxyServerByName: function (proxyServers, name) {
			for (var i = 0; i < proxyServers.length; i++) {
				var item = proxyServers[i];
				if (item.name === name) {
					return item;
				}
			}
			return null;
		},
		reloadActiveProxyServer: function () {
			settingsGrid.loadActiveProxyServer(settingsUiData.proxyServers);
		},
		loadActiveProxyServer: function (proxyServers) {
			var activeProxyServer = settingsUiData.activeProxyServer;

			var activeProxyName = "";
			if (activeProxyServer != null) {
				activeProxyName = activeProxyServer.name;
			}

			var cmbActiveProxyServer = $("#cmbActiveProxyServer");

			// remove previous items
			cmbActiveProxyServer.find("option").remove();

			var hadSelected = false;

			// display select options
			$.each(proxyServers, function (index, proxyServer) {

				// proxyServer
				let option = $("<option>")
					.attr("value", proxyServer.name)
					.text(proxyServer.name)
					.appendTo(cmbActiveProxyServer);

				let selected = (proxyServer.name === activeProxyName);
				option.prop("selected", selected);

				if (selected) {
					hadSelected = true;
				}
			});

			if (!hadSelected) {
				// first item
				cmbActiveProxyServer[0].selectedIndex = 0;
				cmbActiveProxyServer.trigger("change");
			}

		},
		insertRowServersGrid: function () {
			var grdServers = $("#grdServers");
			var inserting = grdServers.jsGrid("option", "inserting");
			grdServers.jsGrid("option", "inserting", !inserting);
		},
		insertRowRulesGrid: function () {
			var grdRules = $("#grdRules");
			var inserting = grdRules.jsGrid("option", "inserting");
			grdRules.jsGrid("option", "inserting", !inserting);
		},
		getServers: function () {
			return $("#grdServers").jsGrid("option", "data");
		},
		getRules: function () {
			return $("#grdRules").jsGrid("option", "data");
		},
		loadServers: function (proxyServers) {
			if (proxyServers)
				$("#grdServers").jsGrid("option", "data", proxyServers);
		},
		loadRules: function (proxyRules) {
			if (proxyRules)
				$("#grdRules").jsGrid("option", "data", proxyRules);
		},
		validateServersRecord: function (args, checkExisting) {
			var name = args.item.name;
			if (!name) {
				args.cancel = true;
				messageBox.error("Specify the name of the server!");
				return;
			}

			if (checkExisting !== false) {
				var data = args.grid.data;
				for (var i = 0; i < data.length; i++) {
					var item = data[i];
					if (name == item.name) {
						args.cancel = true;
						messageBox.error("A Server with the same name already exists!");
						return;
					}
				}
			}
		},
		initializeServersGrid: function () {

			var protocols = [
				{ name: "HTTP" },
				{ name: "HTTPS" },
				{ name: "SOCKS4" },
				{ name: "SOCKS5" }
			];

			$("#grdServers").jsGrid({
				width: "100%",
				height: "300px",

				inserting: true,
				editing: true,
				sorting: true,
				paging: false,
				noDataContent: "No server is defined",
				//data: clients,

				fields: [
					{ name: "name", title: "Name", type: "text", width: 150, validate: "required" },
					{ name: "protocol", align: "left", title: "Protocol", type: "select", items: protocols, valueField: "name", textField: "name", validate: "required" },
					{ name: "host", title: "Server", type: "text", width: 200, validate: "required" },
					{ name: "port", title: "Port", align: "left", type: "number", width: 100, validate: "required" },
					{ type: "control" }
				],
				onItemDeleting: function (args) {
				},
				onItemDeleted: function (e) {

					var gridServers = settingsGrid.getServers();
					settingsGrid.loadActiveProxyServer(gridServers);

					changeTracking.servers = true;
				},
				onItemInserting: function (args) {

					settingsGrid.validateServersRecord(args);

				},
				onItemInserted: function (e) {

					var gridServers = settingsGrid.getServers();
					settingsGrid.loadActiveProxyServer(gridServers);

					changeTracking.servers = true;
				},
				onItemUpdating: function (args) {

					if (args.item.name != args.previousItem.name) {

						// validate the host
						settingsGrid.validateServersRecord(args);
					}

				},
				onItemUpdated: function (e) {

					var gridServers = settingsGrid.getServers();
					settingsGrid.loadActiveProxyServer(gridServers);

					changeTracking.servers = true;
				}
			});

			if (settingsUiData && settingsUiData.proxyServers)
				$("#grdServers").jsGrid("option", "data", settingsUiData.proxyServers);
		},
		validateRulesHost: function (args, checkExisting) {
			var host = args.item.host;
			if (!host) {
				args.cancel = true;
				messageBox.error("Please specify the Host of the rule!");
				return;
			}

			if (!utils.isValidHost(host)) {
				args.cancel = true;
				messageBox.error("Host name is invalid, host name should be something like 'google.com'");
				return;
			}

			if (utils.isFullUrl(host)) {
				let extractedHost = utils.extractHostFromUrl(host);
				if (extractedHost == null || !utils.isValidHost(extractedHost)) {
					args.cancel = true;
					messageBox.error(`Host name '${extractedHost}' is invalid, host name should be something like 'google.com'`);
					return;
				}
				host = extractedHost;
				args.item.host = host;
			} else {
				// this extraction is to remove paths from rules, e.g. google.com/test/

				let extractedHost = utils.extractHostFromUrl("http://" + host);
				if (extractedHost == null || !utils.isValidHost(extractedHost)) {
					args.cancel = true;
					messageBox.error(`Host name '${extractedHost}' is invalid, host name should be something like 'google.com'`);
					return;
				}
				host = extractedHost;
				args.item.host = host;
			}

			// the pattern
			args.item.rule = utils.hostToMatchPattern(host);

			if (checkExisting !== false) {
				var data = args.grid.data;
				for (var i = 0; i < data.length; i++) {
					var item = data[i];
					if (host == item.host) {
						args.cancel = true;
						messageBox.error("A Rule with the same host already exists!");
						return;
					}
				}
			}
		},
		initializeRulesGrid: function () {


			$("#grdRules").jsGrid({
				width: "100%",

				inserting: true,
				editing: true,
				sorting: true,
				paging: true,
				noDataContent: "No rule is defined",
				//data: clients,

				fields: [
					{ name: "host", title: "Host", type: "text", width: 250, validate: "required" },
					{ name: "rule", title: "Generated Pattern", type: "disabled", width: 250 },
					{ name: "enabled", title: "Enabled", type: "checkbox", width: 80 },
					{ type: "control" }
				],
				onItemDeleting: function (args) {


				},
				onItemDeleted: function (e) {
					changeTracking.rules = true;
				},
				onItemInserting: function (args) {
					settingsGrid.validateRulesHost(args);
				},
				onItemInserted: function (e) {

					changeTracking.rules = true;
				},
				onItemUpdating: function (args) {

					if (args.item.host != args.previousItem.host) {

						// validate the host
						settingsGrid.validateRulesHost(args);
					}
				},
				onItemUpdated: function (args) {
					// because the changes to host in 'onItemUpdating' is applied we have to do it here, again!
					if (args.item.host != args.previousItem.host) {

						// don't check for existing rule
						settingsGrid.validateRulesHost(args, false);

						// to display the changes this is required
						$("#grdRules").jsGrid("refresh");
					}

					changeTracking.rules = true;

				}
			});

			if (settingsUiData && settingsUiData.proxyRules)
				$("#grdRules").jsGrid("option", "data", settingsUiData.proxyRules);
		}
	};

	// ------------------
	// ------------------

	// initialize the settings ui
	initialize();
	$(initializeUi);
	$(settingsGrid.initialize);
})();
