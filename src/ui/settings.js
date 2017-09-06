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
	var originalSettingsData = {
		proxyServers: null,
		proxyRules: null,
		activeProxyServer: null
	};
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

	function downloadData(data, fileName) {

		var downloadUrl = "data:application/json;charset=utf-8," + encodeURIComponent(data);
		var a = $("<a/>")
			.attr("download", fileName || "")
			.attr("href", downloadUrl);
		a[0].dispatchEvent(new MouseEvent("click"));
	}

	function initializeUi() {

		if (environment.chrome) {
			$("#divAlertChrome").show();
		} else {
			$("#divAlertFirefox").show();
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

						// current server should become equal to saved servers
						settings.proxyServers = saveData.proxyServers;
						settings.activeProxyServer = saveData.activeProxyServer;

					} else {
						if (response.message)
							messageBox.error(response.message);
					}
				},
				function (error) {
					messageBox.error(browser.i18n.getMessage("settingsErrorFailedToSaveServers") + " " + error.message);
				});

			changeTracking.servers = false;
			changeTracking.activeProxy = false;

		});
		$("#btnRejectProxyServers").click(function () {
			// reset the data
			settingsUiData.proxyServers = originalSettingsData.proxyServers.slice();
			settingsGrid.loadServers(settingsUiData.proxyServers);
			settingsGrid.reloadActiveProxyServer();
			$("#grdServers").jsGrid("refresh");

			changeTracking.servers = false;

			// Changes reverted successfully
			messageBox.info(browser.i18n.getMessage("settingsChangesReverted"));
		});

		$("#btnClearProxyServers").click(function () {

			// Are you sure to remove all the servers?
			messageBox.confirm(browser.i18n.getMessage("settingsRemoveAllProxyServers"),
				function () {
					settingsGrid.loadServers([]);

					changeTracking.servers = true;

					// All the proxy servers are removed.<br/>You have to save to apply the changes.
					messageBox.info(browser.i18n.getMessage("settingsRemoveAllProxyServersSuccess"));
				});
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

						// current rules should become equal to saved rules
						settings.proxyRules = rules;

					} else {
						if (response.message)
							messageBox.error(response.message);
					}
				},
				function (error) {
					messageBox.error(browser.i18n.getMessage("settingsErrorFailedToSaveRules") + " " + error.message);
				});

			changeTracking.rules = false;

		});
		$("#btnRejectProxyRules").click(function () {
			// reset the data
			settingsUiData.proxyRules = originalSettingsData.proxyRules.slice();
			settingsGrid.loadRules(settingsUiData.proxyRules);
			$("#grdRules").jsGrid("refresh");

			changeTracking.rules = false;

			// Changes reverted successfully
			messageBox.info(browser.i18n.getMessage("settingsChangesReverted"));
		});

		$("#btnClearProxyRules").click(function () {

			// Are you sure to remove all the rules?
			messageBox.confirm(browser.i18n.getMessage("settingsRemoveAllRules"),
				function () {
					settingsGrid.loadRules([]);

					changeTracking.rules = true;

					// All rules are removed.<br/>You have to save to apply the changes.
					messageBox.info(browser.i18n.getMessage("settingsRemoveAllRulesSuccess"));
				});
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
						// There was an error in restoring the backup
						messageBox.error(browser.i18n.getMessage("settingsRestoreBackupFailed"));
						polyfill.runtimeSendMessage("restoreSettings failed with> " + error.message);
					});
			}

			selectFileOnTheFly($("#frmRestoreBackup")[0],
				"retore-file",
				function (inputElement, files) {
					var file = files[0];

					var reader = new FileReader();
					reader.onerror = function (event) {
						// Failed to read the selected file
						messageBox.error(browser.i18n.getMessage("settingsRestoreBackupFileError"));
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

					// make copy
					originalSettingsData.proxyRules = settingsUiData.proxyRules.slice();
					originalSettingsData.proxyServers = settingsUiData.proxyServers.slice();
					originalSettingsData.activeProxyServer = settingsUiData.activeProxyServer;
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
			$("#btnExportProxyServerOpen").click(function () {
				var proxyList = settingsGrid.exportProxyListFormatted();

				downloadData(proxyList, "SmartProxy-Servers.txt");
			});
			$("#btnImportProxyServer").click(function () {
				let modalContainer = $("#modalImportProxyServer");
				var append = modalContainer.find("#cmbImportProxyServerOverride_Append").prop("checked");
				var file, text;

				if (modalContainer.find("#rbtnImportProxyServer_File").prop("checked")) {
					// file should be selected

					var selectFileElement = modalContainer.find("#btnImportProxyServerSelectFile")[0];

					if (selectFileElement.files.length == 0) {
						// Please select a proxy list file
						messageBox.error(browser.i18n.getMessage("settingsImportProxiesFileNotSelected"));
						return;
					}
					file = selectFileElement.files[0];

				} else {
					var proxyServerListText = modalContainer.find("#btnImportProxyServerListText").val().trim();
					if (proxyServerListText == "") {
						// Please enter proxy list
						messageBox.error(browser.i18n.getMessage("settingsImportProxyListTextIsEmpty"));
						return;
					}
					text = proxyServerListText;
				}

				var proxyServers = settingsGrid.getServers();

				proxyImporter.importText(text, file,
					append,
					proxyServers,
					function (response) {
						if (!response) return;

						if (response.success) {
							if (response.message)
								messageBox.info(response.message);

							// empty the input
							modalContainer.find("#btnImportProxyServerSelectFile")[0].value = "";
							modalContainer.find("#btnImportProxyServerListText").val("");

							var servers = response.result;
							settingsGrid.loadServers(servers);

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
						messageBox.error(browser.i18n.getMessage("settingsImportProxyServersFailed") + " " + message);
					});

			});


			$("#btnImportRules").click(function () {
				let modalContainer = $("#modalImportRules");
				var selectFileElement = modalContainer.find("#btnImportRulesSelectFile")[0];

				if (selectFileElement.files.length == 0) {
					// Please select a rules file
					messageBox.error(browser.i18n.getMessage("settingsRulesFileNotSelected"));
					return;
				}

				var selectFile = selectFileElement.files[0];

				var append = modalContainer.find("#cmbImportRulesOverride_Append").prop("checked");
				var sourceType = modalContainer.find("#cmbImportRulesFormat").val();

				var proxyRules = settingsGrid.getRules();

				var importFunction;
				if (sourceType == "autoproxy") {
					importFunction = ruleImporter.importAutoProxy;
				} else if (sourceType == "switchy") {
					importFunction = ruleImporter.importSwitchyRules;
				} else {
					messageBox.warning(browser.i18n.getMessage("settingsSourceTypeNotSelected"));
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
							messageBox.error(browser.i18n.getMessage("settingsImportRulesFailed") + " " + message);
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

				// Specify the name of the server
				messageBox.error(browser.i18n.getMessage("settingsServerNameRequired"));
				return;
			}

			if (checkExisting !== false) {
				var data = args.grid.data;
				for (var i = 0; i < data.length; i++) {
					var item = data[i];
					if (name == item.name) {
						args.cancel = true;
						// A Server with the same name already exists!
						messageBox.error(browser.i18n.getMessage("settingsServerNameExists"));
						return;
					}
				}
			}
		},
		initializeServersGrid: function () {

			var protocolSelect = proxyServerProtocols.map(function (item) {
				return { name: item }
			});

			$("#grdServers").jsGrid({
				width: "100%",
				height: "300px",

				inserting: true,
				editing: true,
				sorting: true,
				paging: false,
				noDataContent: browser.i18n.getMessage("settingsServersGridNoDataContent"),
				//data: clients,

				fields: [
					{ name: "name", title: browser.i18n.getMessage("settingsServersGridColName"), type: "text", width: 150, validate: "required" },
					{ name: "protocol", align: "left", title: browser.i18n.getMessage("settingsServersGridColProtocol"), type: "select", items: protocolSelect, valueField: "name", textField: "name", validate: "required" },
					{ name: "host", title: browser.i18n.getMessage("settingsServersGridColServer"), type: "text", width: 200, validate: "required" },
					{ name: "port", title: browser.i18n.getMessage("settingsServersGridColPort"), align: "left", type: "number", width: 100, validate: "required" },
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
				settingsGrid.loadServers(settingsUiData.proxyServers);

		},
		validateRulesSource: function (args, checkExisting) {
			var source = args.item.source;
			if (!source) {
				args.cancel = true;
				// Please specify the source of the rule!
				messageBox.error(browser.i18n.getMessage("settingsRuleSourceRequired"));
				return;
			}

			if (!utils.isValidHost(source)) {
				args.cancel = true;
				// source is invalid, source name should be something like 'google.com'
				messageBox.error(browser.i18n.getMessage("settingsRuleSourceInvalid"));
				return;
			}

			if (utils.isFullUrl(source)) {
				let extractedHost = utils.extractHostFromUrl(source);
				if (extractedHost == null || !utils.isValidHost(extractedHost)) {
					args.cancel = true;

					// `Host name '${extractedHost}' is invalid, host name should be something like 'google.com'`
					messageBox.error(
						browser.i18n.getMessage("settingsRuleHostInvalid")
							.replace("{0}", extractedHost)
					);
					return;
				}
			} else {
				// this extraction is to remove paths from rules, e.g. google.com/test/

				let extractedHost = utils.extractHostFromUrl("http://" + source);
				if (extractedHost == null || !utils.isValidHost(extractedHost)) {
					args.cancel = true;

					// `Host name '${extractedHost}' is invalid, host name should be something like 'google.com'`
					messageBox.error(
						browser.i18n.getMessage("settingsRuleHostInvalid")
							.replace("{0}", extractedHost)
					);
					return;
				}
			}

			// the pattern
			args.item.pattern = utils.hostToMatchPattern(source);

			if (checkExisting !== false) {
				var data = args.grid.data;
				for (var i = 0; i < data.length; i++) {

					// don't check the item itself
					if (i == args.itemIndex)
						continue;

					var item = data[i];
					if (source == item.source) {
						args.cancel = true;
						// A Rule with the same source already exists!
						messageBox.error(browser.i18n.getMessage("settingsRuleSourceAlreadyExists"));
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
				noDataContent: browser.i18n.getMessage("settingsRulesGridNoDataContent"),
				//data: clients,

				fields: [
					{ name: "source", title: browser.i18n.getMessage("settingsRulesGridColSource"), type: "text", width: 250, validate: "required" },
					{ name: "pattern", title: browser.i18n.getMessage("settingsRulesGridColPattern"), type: "disabled", width: 250 },
					{ name: "enabled", title: browser.i18n.getMessage("settingsRulesGridColEnabled"), type: "checkbox", width: 80 },
					{ type: "control" }
				],
				onItemDeleting: function (args) {


				},
				onItemDeleted: function (e) {
					changeTracking.rules = true;
				},
				onItemInserting: function (args) {
					settingsGrid.validateRulesSource(args);
				},
				onItemInserted: function (e) {

					changeTracking.rules = true;
				},
				onItemUpdating: function (args) {

					if (args.item.source != args.previousItem.source) {

						// validate the host
						settingsGrid.validateRulesSource(args);
					}
				},
				onItemUpdated: function (args) {
					// because the changes to host in 'onItemUpdating' is applied we have to do it here, again!
					if (args.item.source != args.previousItem.source) {

						// don't check for existing rule
						settingsGrid.validateRulesSource(args, false);

						// to display the changes this is required
						$("#grdRules").jsGrid("refresh");
					}

					changeTracking.rules = true;

				}
			});

			if (settingsUiData && settingsUiData.proxyRules)
				settingsGrid.loadRules(settingsUiData.proxyRules);
		},
		exportProxyListFormatted: function () {
			var proxyList = settingsGrid.getServers();
			var result = `[SmartProxy Servers]\r\n`;

			for (var i = 0; i < proxyList.length; i++) {
				var proxy = proxyList[i];

				var proxyExport = `${proxy.host}:${proxy.port} [${proxy.protocol}]`;

				if (proxy.username) {
					proxyExport += ` [${proxy.name}] [${proxy.username}] [${proxy.password}]`;
				}
				else if (proxy.name != `${proxy.host}:${proxy.port}`) {
					proxyExport += ` [${proxy.name}]`;
				}

				result += proxyExport + "\r\n";
			}
			return result;
		}
	};

	// ------------------
	// ------------------

	// initialize the settings ui
	initialize();
	$(initializeUi);
	$(settingsGrid.initialize);

	// internationalization
	$(localizeHtmlPage);
})();
