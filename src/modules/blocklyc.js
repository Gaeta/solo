/*
 *   TERMS OF USE: MIT License
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a
 *   copy of this software and associated documentation files (the "Software"),
 *   to deal in the Software without restriction, including without limitation
 *   the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *   and/or sell copies of the Software, and to permit persons to whom the
 *   Software is furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFINGEMENT. IN NO EVENT SHALL
 *   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *   DEALINGS IN THE SOFTWARE.
 */

import Blockly from 'blockly/core';
import * as Chartist from 'chartist';
import * as JSZip from 'jszip';
import {saveAs} from 'file-saver';

import {clientService, serviceConnectionTypes} from './client_service';
import {loadToolbox, getWorkspaceSvg} from './editor';
import {CodeEditor, getXmlCode} from './code_editor';
import {propToolbarButtonController} from './toolbar_controller';
import {getPropTerminal} from './prop_term';
import {getProjectInitialState} from './project';
import {isExperimental} from './url_parameters';
import {getSourceEditor} from './code_editor';
import {logConsoleMessage, getURLParameter, utils} from './utility';


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {string | null}
 */
// let codeXml = null;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {null}
 */
let graph = null;


/**
 * Terminal baudrate setting
 *
 * @type {number}
 */
const baudrate = 115200;


/**
 * Graph temporary storage array
 *
 * @type {any[]}
 */
// eslint-disable-next-line camelcase
const graph_temp_data = [];


/**
 * Flag that indicates if the graph system is ready
 *
 * @type {boolean}
 */
// eslint-disable-next-line camelcase
let graph_data_ready = false;


/**
 * Graph data series start timestamp
 *
 * @type {null}
 */
// eslint-disable-next-line camelcase
let graph_timestamp_start = null;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {number}
 */
// eslint-disable-next-line camelcase
let graph_timestamp_restart = 0;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {boolean}
 */
// eslint-disable-next-line camelcase
let graph_paused = false;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {boolean}
 */
// eslint-disable-next-line camelcase
let graph_start_playing = false;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {String}
 */
// eslint-disable-next-line camelcase
let graphTempString = '';


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {number}
 */
// eslint-disable-next-line camelcase
let graph_time_multiplier = 0;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {null}
 */
// eslint-disable-next-line camelcase
let graph_interval_id = null;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {number}
 */
const fullCycleTime = 4294967296 / 80000000;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {null}
 */
// eslint-disable-next-line camelcase
let graph_labels = null;


/**
 * TODO: Identify the purpose of this variable
 *
 * @type {Array}
 */
// eslint-disable-next-line camelcase
const graph_csv_data = [];


/**
 * Graph system settings
 *
 * @type {{
 *  graph_type: string,
 *  fullWidth: boolean,
 *  showPoint: boolean,
 *  refreshRate: number,
 *  axisX: {onlyInteger: boolean, type: *},
 *  sampleTotal: number
 * }}
 */
// eslint-disable-next-line camelcase
const graph_options = {
  showPoint: false,
  fullWidth: true,
  axisX: {
    type: Chartist.AutoScaleAxis,
    onlyInteger: true,
  },
  refreshRate: 250,
  sampleTotal: 40,
  graph_type: 'S',
};


/**
 * Array to store source data for the graph system
 *
 * @type {{series: *[]}}
 */
// eslint-disable-next-line camelcase
const graph_data = {
  series: [
    // add more here for more possible lines...
    [], [], [], [], [], [], [], [], [], [],
  ],
};


/**
 * Switch the visible pane when a tab is clicked.
 *
 * @param {string} id ID of tab clicked.
 */
function renderContent(id) {
  // Get the initial project state
  const project = getProjectInitialState();
  const codePropC = getSourceEditor();
  const codeXml = getXmlCode();

  // Select the active tab.
  const selectedTab = id.replace('tab_', '');

  // Is this project a C source code only project?
  const isPropcOnlyProject = (project.boardType.name === 'propcfile');

  // Read the URL for experimental parameters to turn on XML editing
  const allowXmlEditing = isExperimental.indexOf('xedit') > -1;

  if (isPropcOnlyProject) {
    // Show PropC editing UI elements
    $('.propc-only').removeClass('hidden');
  }

  switch (selectedTab) {
    case 'blocks':
      logConsoleMessage('Displaying project blocks');
      $('.blocklyToolboxDiv').css('display', 'block');

      $('#content_xml').css('display', 'none');
      $('#content_propc').css('display', 'none');
      $('#content_blocks').css('display', 'block');

      $('#btn-view-xml').css('display', 'none');
      $('#btn-view-propc').css('display', 'inline-block');
      $('#btn-view-blocks').css('display', 'none');

      if (allowXmlEditing) {
        if (Blockly && codeXml && codeXml.getValue().length > 40) {
          Blockly.Xml.clearWorkspaceAndLoadFromXml(
              Blockly.Xml.textToDom(codeXml.getValue()),
              Blockly.mainWorkspace);
        }
      }
      Blockly.svgResize(getWorkspaceSvg());
      getWorkspaceSvg().render();
      break;
    case 'propc':
      logConsoleMessage('Displaying project C source code');

      $('.blocklyToolboxDiv').css('display', 'none');

      $('#content_xml').css('display', 'none');
      $('#content_propc').css('display', 'block');
      $('#content_blocks').css('display', 'none');

      $('#btn-view-xml').css('display', allowXmlEditing ? 'inline-block' : 'none');
      $('#btn-view-blocks').css('display',
          (isPropcOnlyProject || allowXmlEditing) ? 'none' : 'inline-block');

      $('#btn-view-propc').css('display', 'none');

      if (!isPropcOnlyProject) {
        // Load C code for Ace editor
        const rawC = prettyCode(Blockly.propc.workspaceToCode(Blockly.mainWorkspace));
        const codePropC = getSourceEditor();
        codePropC.setValue(rawC);
        codePropC.gotoLine(0);
      } else {
        if (!codePropC || codePropC.getValue() === '') {
          codePropC.setValue(atob((project.code.match(/<field name="CODE">(.*)<\/field>/) || ['', ''])[1] || ''));
          codePropC.gotoLine(0);
        }
        if (codePropC.getValue() === '') {
          let blankProjectCode = '// ------ Libraries and Definitions ------\n';
          blankProjectCode += '#include "simpletools.h"\n\n\n';
          blankProjectCode += '// ------ Global Variables and Objects ------\n\n\n';
          blankProjectCode += '// ------ Main Program ------\n';
          blankProjectCode += 'int main() {\n\n\nwhile (1) {\n\n\n}}';

          const rawC = prettyCode(blankProjectCode);
          codePropC.setValue(rawC);
          codePropC.gotoLine(0);
        }
      }
      break;
    case 'xml':
      $('.blocklyToolboxDiv').css('display', 'none');

      $('#content_xml').css('display', 'block');
      $('#content_propc').css('display', 'none');
      $('#content_blocks').css('display', 'none');

      $('#btn-view-xml').css('display', 'none');
      $('#btn-view-propc').css('display', 'none');
      $('#btn-view-blocks').css('display', 'inline-block');

      // Load project code
      codeXml.setValue(Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace)) || '');
      codeXml.getSession().setUseWrapMode(true);
      codeXml.gotoLine(0);
      break;
  }
}

/**
 * Formats code in editor and sets cursor to the line is was on
 * Used by the code formatter button in the editor UI
 */
const formatWizard = function() {
  const codePropC = getSourceEditor();
  const currentLine = codePropC.getCursorPosition()['row'] + 1;
  codePropC.setValue(prettyCode(codePropC.getValue()));
  codePropC.focus();
  codePropC.gotoLine(currentLine);
};

/**
 * Pretty formatter for C code
 *
 * @param {string} rawCode
 * @return {string}
 */
const prettyCode = function(rawCode) {
  // Prevent JS beautify from improperly formatting reference, dereference, and arrow operators
  // rawCode = rawCode
  //     .replace(/\*([_a-zA-Z()])/g, '___REFERENCE_OPERATOR___$1')
  //     .replace(/([_a-zA-Z()])\*/g, '$1___REFERENCE_OPERATOR___')
  //     .replace(/&([_a-zA-Z()])/g, '___DEREFERENCE_OPERATOR___$1')
  //     .replace(/->/g, '___ARROW_OPERATOR___');

  // TODO: The jsBeautifer package is NOT targeted to C source code. Replace
  //  this functionality with something that understands C source code.
  // run the beautifier
  // rawCode = jsBeautify(rawCode, {
  //   'brace_style': 'expand',
  //   'indent_size': 2,
  //   'preserve_newlines': true,
  // });

  // restore the reference, dereference, and arrow operators
  // rawCode = rawCode.replace(/,\n[\s\xA0]+/g, ', ')
  //     .replace(/___REFERENCE_OPERATOR___/g, '*')
  //     .replace(/___DEREFERENCE_OPERATOR___/g, '&')
  //     .replace(/___ARROW_OPERATOR___/g, '->')

  // improve the way functions and arrays are rendered
  rawCode = rawCode.replace(/\)\s*[\n\r]\s*{/g, ') {')
      .replace(/\[([0-9]*)\]\s*=\s*{\s*([0-9xXbBA-F,\s]*)\s*};/g,
          function(str, m1, m2) {
            m2 = m2.replace(/\s/g, '').replace(/,/g, ', ');
            return '[' + m1 + '] = {' + m2 + '};';
          });

  return rawCode;
};

/**
 * Submit a project's source code to the cloud compiler
 *
 * @param {string} text
 * @param {string} action
 * @param {function} successHandler Define a callback to be executed upon
 *  sucessful compilation
 */
function cloudCompile(text, action, successHandler) {
  const codePropC = getSourceEditor();
  const project = getProjectInitialState();
  // if PropC is in edit mode, get it from the editor, otherwise render it from the blocks.
  let propcCode = '';

  if (codePropC.getReadOnly()) {
    propcCode = prettyCode(Blockly.propc.workspaceToCode(Blockly.mainWorkspace));
  } else {
    propcCode = codePropC.getValue();
  }

  if (propcCode.indexOf('EMPTY_PROJECT') > -1) {
    utils.showMessage(Blockly.Msg.DIALOG_EMPTY_PROJECT,
        Blockly.Msg.DIALOG_CANNOT_COMPILE_EMPTY_PROJECT);
  } else {
    $('#compile-dialog-title').text(text);
    $('#compile-console').val('Compile... ');
    $('#compile-dialog').modal('show');

    let terminalNeeded = null;

    // TODO: propc editor needs UI for settings for terminal and graphing
    if (project.boardType.name !== 'propcfile') {
      const consoleBlockList = [
        'console_print', 'console_print_variables', 'console_print_multiple',
        'console_scan_text', 'console_scan_number', 'console_newline',
        'console_clear', 'console_move_to_position', 'oled_font_loader',
        'activitybot_display_calibration', 'scribbler_serial_send_text',
        'scribbler_serial_send_char', 'scribbler_serial_send_decimal',
        'scribbler_serial_send_decimal', 'scribbler_serial_send_ctrl',
        'scribbler_serial_cursor_xy',
      ];

      let consoleBlockCount = 0;
      for (let i = 0; i < consoleBlockList.length; i++) {
        consoleBlockCount += Blockly.getMainWorkspace()
            .getBlocksByType(consoleBlockList[i], false).length;
      }

      if (consoleBlockCount > 0) {
        terminalNeeded = 'term';
      } else if (Blockly.getMainWorkspace()
          .getBlocksByType('graph_settings', false).length > 0) {
        terminalNeeded = 'graph';
      }
    }

    // ------------------------------------------------------------------------
    // Contact the container running cloud compiler. If the browser is
    // connected via https, direct the compile request to the same port and let
    // the load balancer direct the request to the compiler.
    // When operating from localhost, expect to find the compiler container on
    // localhost as well. There is no override for this at the moment.
    // ------------------------------------------------------------------------
    let postUrl = `https://${window.location.hostname}:443/single/prop-c/${action}`;
    if (window.location.protocol === 'http:') {
      postUrl = `http://${window.location.hostname}:5001/single/prop-c/${action}`;
    }

    // Post the code to the compiler API and await the results
    logConsoleMessage(`Requesting compiler service`);
    $.ajax({
      'method': 'POST',
      'url': postUrl,
      'data': {'code': propcCode},
    }).done(function(data) {
      logConsoleMessage(`Receiving compiler service results`);
      // The compiler will return one of three payloads:
      // Compile-only
      // data = {
      //     "success": success,
      //     "compiler-output": out,
      //     "compiler-error": err.decode()
      // }
      //
      // Load to RAM/EEPROM
      // data = {
      //     "success": success,
      //     "compiler-output": out,
      //     "compiler-error": err.decode()
      //     "binary": base64binary.decode('utf-8')
      //     "extension": = extension
      // }
      //
      // General error message
      // data = {
      //    "success": False,
      //    "message": "unknown-action",
      //    "data": action
      // }
      // {success: true, compiler-output: "Succeeded.", compiler-error: ""}

      // Check for an error response from the compiler
      if (!data || data['compiler-error'] != '') {
        // Get message as a string, or blank if undefined
        const message = (typeof data['compiler-error'] === 'string') ? data['compiler-error'] : '';
        appendCompileConsoleMessage(
            data['compiler-output'] + data['compiler-error'] + message);
      } else {
        const loadWaitMsg = (action !== 'compile') ? '\nDownload...' : '';
        appendCompileConsoleMessage(
            data['compiler-output'] + data['compiler-error'] + loadWaitMsg);

        if (data.success && successHandler) {
          successHandler(data, terminalNeeded);
        }
        compileConsoleScrollToBottom();
      }
    }).fail(function(data) {
      // Something unexpected has happened while calling the compile service
      if (data) {
        const state = data.state();
        let message = 'Unable to compile the project.\n';
        logConsoleMessage(`Compiler service request failed: ${data.state()}`);
        if (state === 'rejected') {
          message += '\nThe compiler service is temporarily unavailable or unreachable.';
          message += '\nPlease try again in a few moments.';
        } else {
          message += 'Error "' + data.status + '" has been detected.';
        }
        appendCompileConsoleMessage(message);
      }
    });
  }
}

/**
 * Stub function to the cloudCompile function
 */
function compile() {
  cloudCompile('Compile', 'compile', null);
}

/**
 * Begins loading process
 *
 * @param {string} modalMessage message shown at the top of the compile/load modal.
 * @param {string} compileCommand for the cloud compiler (bin/eeprom).
 * @param {string} loadOption command for the loader (CODE/VERBOSE/CODE_VERBOSE).
 * @param {string} loadAction command for the loader (RAM/EEPROM).
 *
 * USED by the COMPILE, LOAD TO RAM, and LOAD TO EEPROM UI buttons directly (blocklyc.jsp/blocklyc.html)
 */
export function loadInto(modalMessage, compileCommand, loadOption, loadAction) {
  logConsoleMessage(`Loading program to ${loadAction}.`);
  logConsoleMessage(`Load connection is ${clientService.activeConnection ? 'active' : 'inactive'}`);
  if (clientService.portsAvailable) {
    cloudCompile(modalMessage, compileCommand, function(data, terminalNeeded) {
      if (clientService.type === serviceConnectionTypes.WS) {
        // Send the compile submission via a web socket
        clientService.resultLog = '';
        clientService.loadBinary = false;

        const programToSend = {
          type: 'load-prop',
          action: loadAction,
          payload: data.binary,
          debug: (terminalNeeded) ? terminalNeeded : 'none',
          extension: data.extension,
          portPath: getComPort(),
        };
        clientService.activeConnection.send(JSON.stringify(programToSend));
      } else {
        // Send the compile submission via an HTTP post
        logConsoleMessage('Sending program binary to the BlocklyProp Client');
        // BlocklyProp Client
        if (clientService.version.isCoded) {
          // Request load with options from BlocklyProp Client
          $.post(clientService.url('load.action'), {
            'option': loadOption,
            'action': loadAction,
            'binary': data.binary,
            'extension': data.extension,
            'comport': getComPort(),
          }, function(loadData) {
            logConsoleMessage(`Processing results from server: ${loadData.message}`);
            // Replace response message's consecutive white space with a new-line, then split at new lines
            const message = loadData.message.replace(/\s{2,}/g, '\n').split('\n');
            // If responses have codes, check for all success codes (< 100)
            let success = true;
            const coded = (loadOption === 'CODE' || loadOption === 'CODE_VERBOSE');
            if (coded) {
              message.forEach(function(x) {
                success = success && x.substr(0, 3) < 100;
              });
            }
            // Display results
            let result = '';
            if (success && coded) {
              // Success! Keep it simple
              result = ' Succeeded.';
            } else {
              // Failed (or not coded); Show the details
              const error = [];
              message.forEach(function(x) {
                error.push(x.substr((coded) ? 4 : 0));
              });
              result = ((coded) ? ' Failed!' : '') + '\n\n-------- loader messages --------\n' + error.join('\n');
            }

            $('#compile-console').val($('#compile-console').val() + result);

            // Scroll automatically to the bottom after new data is added
            document.getElementById('compile-console').scrollTop =
                document.getElementById('compile-console').scrollHeight;
            if (terminalNeeded === 'term' && loadData.success) {
              serialConsole();
            } else if (terminalNeeded === 'graph' && loadData.success) {
              graphingConsole();
            }
          });// end of .post()
        } else {
          // TODO: Remove this once client_min_version is >= minCodedVer
          // Request load without options from old BlocklyProp Client
          $.post(clientService.url('load.action'), {
            'action': loadAction,
            'binary': data.binary,
            'extension': data.extension,
            'comport': getComPort(),
          }, function(loadData) {
            $('#compile-console').val($('#compile-console').val() + loadData.message);

            // Scroll automatically to the bottom after new data is added
            document.getElementById('compile-console').scrollTop =
                document.getElementById('compile-console').scrollHeight;
            if (terminalNeeded === 'term' && loadData.success) {
              serialConsole();
            } else if (terminalNeeded === 'graph' && loadData.success) {
              graphingConsole();
            }
          });
        }
      }
    });
  } else if (clientService.available) {
    utils.showMessage(Blockly.Msg.DIALOG_NO_DEVICE, Blockly.Msg.DIALOG_NO_DEVICE_TEXT);
  } else {
    utils.showMessage(Blockly.Msg.DIALOG_DEVICE_COMM_ERROR, Blockly.Msg.DIALOG_DEVICE_COMM_ERROR_TEXT);
  }
}

/**
 * Serial console support
 */
// eslint-disable-next-line camelcase,require-jsdoc
function serialConsole() {
  clientService.sendCharacterStreamTo = 'term';

  // HTTP client
  // TODO: Linter claims that this expression is always false
  if (clientService.type !== serviceConnectionTypes.WS) {
    if (clientService.portsAvailable) {
      // Container and flag needed to receive and parse initial connection
      // string before serial data begins streaming in.
      let connString = '';
      let connStrYet = false;

      // open a websocket to the BPC for just the serial communications
      const connection = new WebSocket(clientService.url('serial.connect', 'ws'));

      // When the connection is open, open com port
      connection.onopen = function() {
        connString = '';
        connStrYet = false;
        connection.send('+++ open port ' + getComPort() + (baudrate ? ' ' + baudrate : ''));
        clientService.activeConnection = connection;
      };

      // Log errors
      connection.onerror = function(error) {
        logConsoleMessage('WebSocket Error');
        logConsoleMessage(error.message);
      };

      // Receive characters
      connection.onmessage = function(e) {
        const pTerm = getPropTerminal();
        // incoming data is base64 encoded
        const charBuffer = atob(e.data);
        if (connStrYet) {
          pTerm.display(charBuffer);
        } else {
          connString += charBuffer;
          if (connString.indexOf(baudrate.toString(10)) > -1) {
            connStrYet = true;
            displayTerminalConnectionStatus(connString.trim());
          } else {
            pTerm.display(e.data);
          }
        }
        pTerm.focus();
      };

      // When the user closed the console, close the serial comms connection
      $('#console-dialog').on('hidden.bs.modal', function() {
        clientService.sendCharacterStreamTo = null;
        logConsoleMessage(`Closing serial console WS connection`);
        clientService.activeConnection = null;
        connString = '';
        connStrYet = false;
        connection.close();
        displayTerminalConnectionStatus(null);
        getPropTerminal().display(null);
      });
    } else {
      // Remove any previous connection
      logConsoleMessage(`No ports available so closing the WS connection.`);
      clientService.activeConnection = null;

      // Display a "No connected devices" message in the terminal
      displayTerminalConnectionStatus(Blockly.Msg.DIALOG_TERMINAL_NO_DEVICES_TO_CONNECT);
      getPropTerminal().display(Blockly.Msg.DIALOG_TERMINAL_NO_DEVICES + '\n');

      // Clear the terminal if the user closes it.
      $('#console-dialog').on('hidden.bs.modal', function() {
        clientService.sendCharacterStreamTo = null;
        displayTerminalConnectionStatus(null);
        getPropTerminal().display(null);
      });
    }
  } else if (clientService.type === serviceConnectionTypes.WS) {
    // using Websocket-only client

    const messageToSend = {
      type: 'serial-terminal',
      outTo: 'terminal',
      portPath: getComPort(),
      baudrate: baudrate.toString(10),
      msg: 'none',
      action: 'open',
    };

    if (messageToSend.portPath !== 'none') {
      displayTerminalConnectionStatus([
        Blockly.Msg.DIALOG_TERMINAL_CONNECTION_ESTABLISHED,
        messageToSend.portPath,
        Blockly.Msg.DIALOG_TERMINAL_AT_BAUDRATE,
        messageToSend.baudrate,
      ].join[' ']);
    } else {
      displayTerminalConnectionStatus(Blockly.Msg.DIALOG_TERMINAL_NO_DEVICES_TO_CONNECT);
      getPropTerminal().display(Blockly.Msg.DIALOG_TERMINAL_NO_DEVICES + '\n');
    }

    clientService.activeConnection.send(JSON.stringify(messageToSend));

    $('#console-dialog').on('hidden.bs.modal', function() {
      clientService.sendCharacterStreamTo = null;
      if (messageToSend.action !== 'close') { // because this is getting called multiple times...?
        messageToSend.action = 'close';
        displayTerminalConnectionStatus(null);
        clientService.activeConnection.send(JSON.stringify(messageToSend));
      }
      getPropTerminal().display(null);
    });
  }

  $('#console-dialog').modal('show');
}

/**
 * Display information about the serial connection to the device
 * @param {string | null} connectionInfo text to display above the console or graph
 */
function displayTerminalConnectionStatus(connectionInfo) {
  $('.connection-string').html(connectionInfo ? connectionInfo : '');
}

/**
 * Graphing console
 */
// eslint-disable-next-line camelcase,require-jsdoc
function graphingConsole() {
  clientService.sendCharacterStreamTo = 'graph';

  if (getGraphSettingsFromBlocks()) {
    if (graph === null) {
      graph_reset();
      graphTempString = '';
      graph = new Chartist.Line('#serial_graphing', graph_data, graph_options);
      if (getURLParameter('debug')) {
        logConsoleMessage(graph_options.toString());
      }
    } else {
      graph.update(graph_data, graph_options);
    }

    // TODO: Condition is always null warning
    if (clientService.type === serviceConnectionTypes.HTTP &&
        clientService.portsAvailable) {
      // Container and flag needed to receive and parse initial connection
      // string before serial data begins streaming in.
      let connString = '';
      let connStrYet = false;
      const connection = new WebSocket(clientService.url('serial.connect', 'ws'));

      // When the connection is open, open com port
      connection.onopen = function() {
        connection.send('+++ open port ' + getComPort() + (baudrate ? ' ' + baudrate : ''));
        graphStartStop('start');
      };

      // Log errors
      connection.onerror = function(error) {
        logConsoleMessage('WebSocket Error');
        logConsoleMessage(error.message);
      };

      connection.onmessage = function(e) {
        const charBuffer = atob(e.data);
        if (connStrYet) {
          graph_new_data(charBuffer);
        } else {
          connString += charBuffer;
          if (connString.indexOf(baudrate.toString(10)) > -1) {
            connStrYet = true;
            displayTerminalConnectionStatus(connString.trim());
          } else {
            graph_new_data(charBuffer);
          }
        }
      };

      $('#graphing-dialog').on('hidden.bs.modal', function() {
        clientService.sendCharacterStreamTo = null;
        connection.close();
        graphStartStop('stop');
        connString = '';
        connStrYet = false;
        displayTerminalConnectionStatus(null);
      });
    } else if (clientService.type === serviceConnectionTypes.WS &&
        clientService.portsAvailable) {
      const messageToSend = {
        type: 'serial-terminal',
        outTo: 'graph',
        portPath: getComPort(),
        baudrate: baudrate.toString(10),
        msg: 'none',
        action: 'open',
      };

      if (messageToSend.portPath !== 'none') {
        displayTerminalConnectionStatus([
          Blockly.Msg.DIALOG_TERMINAL_CONNECTION_ESTABLISHED,
          messageToSend.portPath,
          Blockly.Msg.DIALOG_TERMINAL_AT_BAUDRATE,
          messageToSend.baudrate,
        ].join(' '));
      } else {
        displayTerminalConnectionStatus(Blockly.Msg.DIALOG_GRAPH_NO_DEVICES_TO_CONNECT);
      }

      clientService.activeConnection.send(JSON.stringify(messageToSend));

      // eslint-disable-next-line camelcase
      if (!graph_interval_id) {
        graphStartStop('start');
      }

      $('#graphing-dialog').on('hidden.bs.modal', function() {
        clientService.sendCharacterStreamTo = null;
        graphStartStop('stop');
        if (messageToSend.action !== 'close') { // because this is getting called multiple times.... ?
          messageToSend.action = 'close';
          displayTerminalConnectionStatus(null);
          clientService.activeConnection.send(JSON.stringify(messageToSend));
        }
      });
    } else {
      // create simulated graph?
      displayTerminalConnectionStatus(Blockly.Msg.DIALOG_GRAPH_NO_DEVICES_TO_CONNECT);
    }

    $('#graphing-dialog').modal('show');
    if (document.getElementById('btn-graph-play')) {
      document.getElementById('btn-graph-play').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="15"><path d="M5.5,2 L4,2 4,11 5.5,11 Z M8.5,2 L10,2 10,11 8.5,11 Z" style="stroke:#fff;stroke-width:1;fill:#fff;"/></svg>';
    }
  } else {
    utils.showMessage(Blockly.Msg.DIALOG_MISSING_BLOCKS, Blockly.Msg.DIALOG_MISSING_BLOCKS_GRAPHING);
  }
}

/**
 * getGraphSettingsFromBlocks
 * @description sets the graphing engine's settings and graph labels
 * based on values in the graph setup and output blocks
 * @return {boolean} true if the appropriate graphing blocks are present and false if they are not
 */
function getGraphSettingsFromBlocks() {
  const project = getProjectInitialState();
  // TODO: propc editor needs UI for settings for terminal and graphing
  if (project.boardType.name === 'propcfile') {
    return false;
  }
  const graphSettingsBlocks = Blockly.getMainWorkspace().getBlocksByType('graph_settings');

  if (graphSettingsBlocks.length > 0) {
    logConsoleMessage('found settings');
    const graphOutputBlocks = Blockly.getMainWorkspace().getBlocksByType('graph_output');
    // eslint-disable-next-line camelcase
    graph_labels = [];
    if (graphOutputBlocks.length > 0) {
      logConsoleMessage('found block');
      let i = 0;
      while (graphOutputBlocks[0].getField('GRAPH_LABEL' + i)) {
        graph_labels.push(graphOutputBlocks[0].getFieldValue('GRAPH_LABEL' + i));
        i++;
      }
    } else {
      return false;
    }

    graph_options.refreshRate = 100; // Number(graph_settings_str[0]);

    graph_options.graph_type = {
      'AUTO': 'S',
      'FIXED': 'S',
      'AUTOXY': 'X',
      'FIXEDXY': 'X',
      'AUTOSC': 'O',
      'FIXEDSC': 'O',
    }[graphSettingsBlocks[0].getFieldValue('YSETTING')];


    if (graphSettingsBlocks[0].getFieldValue('YMIN') || graphSettingsBlocks[0].getFieldValue('YMAX')) {
      graph_options.axisY = {
        type: Chartist.AutoScaleAxis,
        low: Number(graphSettingsBlocks[0].getFieldValue('YMIN') || '0'),
        high: Number(graphSettingsBlocks[0].getFieldValue('YMAX') || '100'),
        onlyInteger: true,
      };
    } else {
      graph_options.axisY = {
        type: Chartist.AutoScaleAxis,
        onlyInteger: true,
      };
    }
    $('#graph_x-axis_label').css('display', 'block');
    graph_options.showPoint = false;
    graph_options.showLine = true;
    if (graph_options.graph_type === 'X') {
      $('#graph_x-axis_label').css('display', 'none');
      if (graphSettingsBlocks[0].getFieldValue('XMIN') || graphSettingsBlocks[0].getFieldValue('XMAX')) {
        graph_options.axisX = {
          type: Chartist.AutoScaleAxis,
          low: Number(graphSettingsBlocks[0].getFieldValue('XMIN') || '0'),
          high: Number(graphSettingsBlocks[0].getFieldValue('XMAX') || '100'),
          onlyInteger: true,
        };
      } else {
        graph_options.axisX = {
          type: Chartist.AutoScaleAxis,
          onlyInteger: true,
        };
      }
      graph_options.showPoint = true;
      graph_options.showLine = false;
    }

    if (graph_options.graph_type === 'S' || graph_options.graph_type === 'X') {
      graph_options.sampleTotal = Number(graphSettingsBlocks[0].getFieldValue('XAXIS') || '10');
    }
    return true;
  } else {
    return false;
  }
}

/**
 * Graphing system control
 *
 * @param {string} action
 * Supported actions:
 *     start
 *     play
 *     stop
 *     pause
 *     clear
 */
export const graphStartStop = function(action) {
  if (action === 'start' || action === 'play') {
    graph_new_labels();
    // eslint-disable-next-line camelcase
    if (graph_interval_id) {
      clearInterval(graph_interval_id);
    }
    // eslint-disable-next-line camelcase
    graph_interval_id = setInterval(function() {
      graph.update(graph_data);
      graph_update_labels();
    }, graph_options.refreshRate);
  } else if (action === 'stop' || action === 'pause') {
    clearInterval(graph_interval_id);
    // eslint-disable-next-line camelcase
    graph_interval_id = null;
  }
  if (action === 'stop') {
    // eslint-disable-next-line camelcase
    graph_paused = false;
    graph_reset();
    graphPlay('play');
  }
  if (action === 'clear') {
    graph_reset();
  }
  if (action === 'play') {
    if (graph_data.series[0].length === 0) {
      graph_reset();
    }
    // eslint-disable-next-line camelcase
    graph_paused = false;
    // eslint-disable-next-line camelcase
    graph_start_playing = true;
  }
  if (action === 'pause' && graph_temp_data.slice(-1)[0]) {
    // eslint-disable-next-line camelcase
    graph_paused = true;
    graphTempString = '';
    // eslint-disable-next-line camelcase
    graph_timestamp_start = 0;
    // eslint-disable-next-line camelcase
    graph_time_multiplier = 0;
    // eslint-disable-next-line camelcase
    graph_timestamp_restart = graph_temp_data.slice(-1)[0][0];
  }
};

/**
 * Update the list of serial ports available on the host machine
 * NOTE: This function is used by the BP-Client only.
 */
const checkForComPorts = function() {
  try {
    if (clientService.type === serviceConnectionTypes.HTTP) {
      $.get(clientService.url('ports.json'), function(data) {
        logConsoleMessage('Getting a port list');
        setPortListUI(data);
      }).fail(function() {
        setPortListUI(null);
      }).always(function(data) {
        logConsoleMessage(`The data is: ${data}`);
      });
    }
  } catch (e) {
    logConsoleMessage('Unable to get port list. ' + e.message);
    setPortListUI(null);
  }
};

/**
 * Return the selected com port name
 *
 * @return {string}
 */
export const getComPort = function() {
  const commPortSelection = $('#comPort').val();
  if (commPortSelection === Blockly.Msg.DIALOG_PORT_SEARCHING || commPortSelection === Blockly.Msg.DIALOG_NO_DEVICE) {
    return 'none';
  } else {
    return commPortSelection;
  }
};

/**
 * Save a project to the local file system
 */
function downloadPropC() {
  const project = getProjectInitialState();
  const propcCode = Blockly.propc.workspaceToCode(Blockly.mainWorkspace);
  const isEmptyProject = propcCode.indexOf('EMPTY_PROJECT') > -1;
  if (isEmptyProject) {
    // The project is empty, so warn and exit.
    utils.showMessage(Blockly.Msg.DIALOG_EMPTY_PROJECT, Blockly.Msg.DIALOG_CANNOT_SAVE_EMPTY_PROJECT);
  } else {
    // Make sure the filename doesn't have any illegal characters
    const value = sanitizeFilename(project.boardType.name);

    let sideFileContent = '.c\n>compiler=C\n>memtype=cmm main ram compact\n';
    sideFileContent += '>optimize=-Os\n>-m32bit-doubles\n>-fno-exceptions\n>defs::-std=c99\n';
    sideFileContent += '>-lm\n>BOARD::ACTIVITYBOARD';

    const fileCblob = new Blob([propcCode], {type: 'text/plain'});
    const fileSIDEblob = new Blob([value + sideFileContent], {type: 'text/plain'});

    const zip = new JSZip();
    const sideFolder = zip.folder(value);
    sideFolder.file(value + '.c', fileCblob);
    sideFolder.file(value + '.side', fileSIDEblob);

    sideFolder.generateAsync({type: 'blob'}).then(function(blob) { // 1) generate the zip file
      saveAs(blob, value + '.zip');                                 // 2) trigger the download
    }, function(err) {
      utils.showMessage(Blockly.Msg.DIALOG_ERROR, Blockly.Msg.DIALOG_SIDE_FILES_ERROR + err);
    });
  }
}

/**
 * Sanitize a string into an OS-safe filename
 *
 * @param {string} input string representing a potential filename
 * @return {string}
 */
function sanitizeFilename(input) {
  // if the input is not a string, or is an empty string, return a
  // generic filename
  if (typeof input !== 'string' || input.length < 1) {
    return 'my_project';
  }

  // replace OS-illegal characters or phrases
  input = input.replace(/[/?<>\\:*|"]/g, '_')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x80-\x9f]/g, '_')
      .replace(/^\.+$/, '_')
      .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, '_')
      .replace(/[. ]+$/, '_');

  // if the filename is too long, truncate it
  if (input.length > 31) {
    return input.substring(0, 30);
  }

  return input;
}

/**
 * Graph the data represented in the stream parameter
 *
 * @param {string} stream
 */
// eslint-disable-next-line camelcase,require-jsdoc
function graph_new_data(stream) {
  // Check for a failed connection:
  if (stream.indexOf('ailed') > -1) {
    displayTerminalConnectionStatus(stream);
  } else {
    let row;
    let ts = 0;

    for (let k = 0; k < stream.length; k++) {
      if (stream[k] === '\n') {
        stream[k] = '\r';
      }
      // eslint-disable-next-line camelcase
      if (stream[k] === '\r' && graph_data_ready) {
        // eslint-disable-next-line camelcase
        if (!graph_paused) {
          graph_temp_data.push(graphTempString.split(','));
          row = graph_temp_data.length - 1;
          ts = Number(graph_temp_data[row][0]) || 0;

          // convert to seconds:
          // Uses Propeller system clock (CNT) left shifted by 16.
          // Assumes 80MHz clock frequency.
          ts = ts / 1220.703125;
        }
        // eslint-disable-next-line camelcase
        if (!graph_timestamp_start || graph_timestamp_start === 0) {
          // eslint-disable-next-line camelcase
          graph_timestamp_start = ts;
          // eslint-disable-next-line camelcase
          if (graph_start_playing) {
            // eslint-disable-next-line camelcase
            graph_timestamp_start -= graph_timestamp_restart;
            // eslint-disable-next-line camelcase
            graph_timestamp_restart = 0;
          }
        }
        // eslint-disable-next-line camelcase
        if (row > 0 && !graph_start_playing) {
          if (parseFloat(graph_temp_data[row][0]) < parseFloat(graph_temp_data[row - 1][1])) {
            // eslint-disable-next-line camelcase
            graph_time_multiplier += fullCycleTime;
          }
        }
        // eslint-disable-next-line camelcase
        graph_start_playing = false;
        // eslint-disable-next-line camelcase
        if (!graph_paused) {
          // eslint-disable-next-line camelcase
          graph_temp_data[row].unshift(ts + graph_time_multiplier -
              // eslint-disable-next-line camelcase
              graph_timestamp_start);
          // eslint-disable-next-line camelcase
          let graph_csv_temp = (Math.round(graph_temp_data[row][0] * 10000) / 10000) + ',';

          if (graph_options.graph_type === 'X') {   // xy scatter plot
            let jk = 0;
            for (let j = 2; j < graph_temp_data[row].length; j = j + 2) {
              // eslint-disable-next-line camelcase
              graph_csv_temp += graph_temp_data[row][j] + ',' + graph_temp_data[row][j + 1] + ',';
              graph_data.series[jk].push({
                x: graph_temp_data[row][j] || null,
                y: graph_temp_data[row][j + 1] || null,
              });
              if (graph_temp_data[row][0] > graph_options.sampleTotal) {
                graph_data.series[jk].shift();
              }
              jk++;
            }
          } else {    // Time series graph
            for (let j = 2; j < graph_temp_data[row].length; j++) {
              // eslint-disable-next-line camelcase
              graph_csv_temp += graph_temp_data[row][j] + ',';
              graph_data.series[j - 2].push({
                x: graph_temp_data[row][0],
                y: graph_temp_data[row][j] || null,
              });
              $('.ct_line').css('stroke-width', '2.5px');  // TODO: if this slows performance too much - explore changing the stylesheet (https://stackoverflow.com/questions/50036922/change-a-css-stylesheets-selectors-properties/50036923#50036923)
              if (graph_temp_data[row][0] > graph_options.sampleTotal) {
                graph_data.series[j - 2].shift();
              }
            }
          }

          graph_csv_data.push(graph_csv_temp.slice(0, -1).split(','));

          // limits total number of data points collected to prevent memory issues
          if (graph_csv_data.length > 15000) {
            graph_csv_data.shift();
          }
        }

        graphTempString = '';
      } else {
        // eslint-disable-next-line camelcase
        if (!graph_data_ready) {            // wait for a full set of data to
          if (stream[k] === '\r') {       // come in before graphing, ends up
            // eslint-disable-next-line camelcase
            graph_data_ready = true;    // tossing the first point but prevents
          }                               // garbage from mucking up the graph.
        } else {
          // make sure it's a number, comma, CR, or LF
          if ('-0123456789.,\r\n'.indexOf(stream[k]) > -1) {
            graphTempString += stream[k];
          }
        }
      }
    }
  }
}

/**
 * Reset the graphing system
 */
// eslint-disable-next-line camelcase,require-jsdoc
function graph_reset() {
  graph_temp_data.length = 0;
  graph_csv_data.length = 0;
  for (let k = 0; k < 10; k++) {
    graph_data.series[k] = [];
  }
  if (graph) {
    graph.update(graph_data, graph_options, true);
  }
  graphTempString = '';
  // eslint-disable-next-line camelcase
  graph_timestamp_start = 0;
  // eslint-disable-next-line camelcase
  graph_time_multiplier = 0;
  // eslint-disable-next-line camelcase
  graph_timestamp_restart = 0;
  // eslint-disable-next-line camelcase
  graph_data_ready = false;
}

/**
 * Draw graph
 *
 * @param {string} setTo
 */
export function graphPlay(setTo) {
  if (document.getElementById('btn-graph-play')) {
    // eslint-disable-next-line camelcase
    const play_state = document.getElementById('btn-graph-play').innerHTML;
    if (setTo !== 'play' && (play_state.indexOf('pause') > -1 || play_state.indexOf('<!--p') === -1)) {
      document.getElementById('btn-graph-play').innerHTML = '<!--play--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="15"><path d="M4,3 L4,11 10,7 Z" style="stroke:#fff;stroke-width:1;fill:#fff;"/></svg>';
      if (!setTo) {
        graphStartStop('pause');
      }
    } else {
      document.getElementById('btn-graph-play').innerHTML = '<!--pause--><svg xmlns="http://www.w3.org/2000/svg" width="14" height="15"><path d="M5.5,2 L4,2 4,11 5.5,11 Z M8.5,2 L10,2 10,11 8.5,11 Z" style="stroke:#fff;stroke-width:1;fill:#fff;"/></svg>';
      // eslint-disable-next-line camelcase
      if (!graph_interval_id && !setTo) {
        graphStartStop('play');
      }
    }
  }
}

/**
 * Save a graph to the local file system
 */
export function downloadGraph() {
  utils.prompt(Blockly.Msg.DIALOG_DOWNLOAD_GRAPH_DIALOG, 'BlocklyProp_Graph', function(value) {
    if (value) {
      // Make sure filename is safe
      value = sanitizeFilename(value);

      const svgGraph = document.getElementById('serial_graphing');
      const pattern = new RegExp('xmlns="http://www.w3.org/2000/xmlns/"', 'g');
      const findY = 'class="ct-label ct-horizontal ct-end"';
      const chartStyle = '<style>.ct-grid-background,.ct-line{fill:none}.ct-point{stroke-width:10px;stroke-linecap:round}.ct-grid{stroke:rgba(0,0,0,.2);stroke-width:1px;stroke-dasharray:2px}.ct-area{stroke:none;fill-opacity:.1}.ct-line{stroke-width:1px}.ct-point{stroke-width:5px}.ct-series-a{stroke:#00f}.ct-series-b{stroke:#0bb}.ct-series-c{stroke:#0d0}.ct-series-d{stroke:#dd0}.ct-series-e{stroke:#f90}.ct-series-f{stroke:red}.ct-series-g{stroke:#d09}.ct-series-h{stroke:#90d}.ct-series-i{stroke:#777}.ct-series-j{stroke:#000}text{font-family:sans-serif;fill:rgba(0,0,0,.4);color:rgba(0,0,0,.4);font-size:.75rem;line-height:1;overflow:visible}</style>';
      let svgxml = new XMLSerializer().serializeToString(svgGraph);

      svgxml = svgxml.replace(pattern, '');
      svgxml = svgxml.replace(/foreignObject/g, 'text');
      svgxml = svgxml.replace(/([<|</])a[0-9]+:/g, '$1');
      svgxml = svgxml.replace(/xmlns: /g, '');
      svgxml = svgxml.replace(/x="10" /g, 'x="40" ');

      svgxml = svgxml.substring(svgxml.indexOf('<svg'), svgxml.length - 6);
      const foundY = svgxml.indexOf(findY);
      const theY = parseFloat(svgxml.substring(svgxml.indexOf(' y="', foundY + 20) + 4, svgxml.indexOf('"', svgxml.indexOf(' y="', foundY + 20) + 4)));
      const regY = new RegExp('y="' + theY + '"', 'g');
      svgxml = svgxml.replace(regY, 'y="' + (theY + 12) + '"');
      const breakpoint = svgxml.indexOf('>') + 1;
      svgxml = svgxml.substring(0, breakpoint) + chartStyle + svgxml.substring(breakpoint, svgxml.length);
      svgxml = svgxml.replace(/<text style="overflow: visible;" ([xy])="([0-9.-]+)" ([xy])="([0-9.-]+)" [a-z]+="[0-9.]+" [a-z]+="[0-9.]+"><span[0-9a-zA-Z =.":;/-]+>([0-9.-]+)<\/span>/g, '<text $1="$2" $3="$4">$5');

      const blob = new Blob([svgxml], {type: 'image/svg+xml'});
      saveAs(blob, value + '.svg');
    }
  });
}

/**
 * Download the graph as a csv file to the local file system
 */
function downloadCSV() {
  utils.prompt(Blockly.Msg.DIALOG_DOWNLOAD_DATA_DIALOG, 'BlocklyProp_Data', function(value) {
    if (value) {
      // Make sure filename is safe
      value = sanitizeFilename(value);

      // eslint-disable-next-line camelcase
      const graph_csv_temp = graph_csv_data.join('\n');
      const idx1 = graph_csv_temp.indexOf('\n') + 1;
      const idx2 = graph_csv_temp.indexOf('\n', idx1 + 1);
      const blob = new Blob([graph_csv_temp.substring(0, idx1) + graph_csv_temp.substring(idx2 + 1, graph_csv_temp.length - 1)], {type: 'text/csv'});
      saveAs(blob, value + '.csv');
    }
  });
}

/**
 * Graph new lables
 */
// eslint-disable-next-line camelcase,require-jsdoc
function graph_new_labels() {
  // eslint-disable-next-line camelcase
  let graph_csv_temp = '';
  let labelsvg = '<svg width="60" height="300">';
  // eslint-disable-next-line camelcase
  graph_csv_temp += '"time",';
  let labelClass = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  let labelPre = ['', '', '', '', '', '', '', '', '', '', '', '', '', ''];
  if (graph_options.graph_type === 'X') {
    labelClass = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
    labelPre = ['x: ', 'y: ', 'x: ', 'y: ', 'x: ', 'y: ', 'x: ', 'y: ', 'x: ', 'y: ', 'x: ', 'y: ', 'x: ', 'y: '];
  }
  for (let t = 0; t < graph_labels.length; t++) {
    labelsvg += '<g id="labelgroup' + (t + 1) + '" transform="translate(0,' + (t * 30 + 25) + ')">';
    labelsvg += '<rect x="0" y = "0" width="60" height="26" rx="3" ry="3" id="label' + (t + 1) + '" ';
    labelsvg += 'style="stroke:1px;stroke-color:blue;" class="ct-marker-' + labelClass[t] + '"/><rect x="3" y="12"';
    labelsvg += 'width="54" height="11" rx="3" ry="3" id="value' + (t + 1) + 'bkg" style="fill:rgba';
    labelsvg += '(255,255,255,.7);stroke:none;"/><text id="label' + (t + 1) + 'text" x="3" ';
    labelsvg += 'y="9" style="font-family:Arial;font-size: 9px;fill:#fff;font-weight:bold;">' + labelPre[t];
    labelsvg += graph_labels[t] + '</text><text id="gValue' + (t + 1) + '" x="5" y="21" style="align:right;';
    labelsvg += 'font-family:Arial;font-size: 10px;fill:#000;"></text></g>';
    // eslint-disable-next-line camelcase
    graph_csv_temp += '"' + graph_labels[t].replace(/"/g, '_') + '",';
  }
  labelsvg += '</svg>';
  graph_csv_data.push(graph_csv_temp.slice(0, -1));
  $('#serial_graphing_labels').html(labelsvg);
}

/**
 * Update the labels on the graph
 */
// eslint-disable-next-line camelcase,require-jsdoc
function graph_update_labels() {
  const row = graph_temp_data.length - 1;
  if (graph_temp_data[row]) {
    const col = graph_temp_data[row].length;
    for (let w = 2; w < col; w++) {
      const theLabel = document.getElementById('gValue' + (w - 1).toString(10));
      if (theLabel) {
        theLabel.textContent = graph_temp_data[row][w];
      }
    }
  }
}

/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */
/* ------------------------------------------------------------------------- */


/**
 * Blockly initialization
 * @param {!Blockly} data is the global blockly object
 */
function initializeBlockly(data) {
  const project = getProjectInitialState();
  if (project) {
    if (project.boardType.name !== 'propcfile') {
      new CodeEditor(project.boardType.name);
      loadToolbox(project.code);
    }
  }
}

/**
 *  Connect to the BP-Launcher or BlocklyProp Client
 */
const findClient = function() {
  if (clientService.activeConnection) {
    return;
  }

  // Try to connect to the BP-Launcher (websocket) first
  // TODO: evaluation is always true, probably not what we want here.
  logConsoleMessage(`Finding a client`);
  if (!clientService.available &&
      clientService.type !== serviceConnectionTypes.HTTP) {
    logConsoleMessage('Connecting to Launcher client');
    establishBPLauncherConnection();
  }

  // Check how much time has passed since the port list was received from the BP-Launcher
  if (clientService.type === serviceConnectionTypes.WS) {
    clientService.portListReceiveCountUp++;
    // Is the BP-Launcher taking to long to respond?  If so, close the connection
    if (clientService.isPortListTimeOut()) {
      logConsoleMessage('Timeout waiting for client port list!');
      clientService.closeConnection();
      // Update the toolbar
      propToolbarButtonController();

      // TODO: check to see if this is really necessary - it get's called by the WS onclose handler
      lostWSConnection();
    }
  }

  // BP-Launcher not found? Try connecting to the BP-Client
  setTimeout(function() {
    if (clientService.type !== serviceConnectionTypes.WS) {
      logConsoleMessage('Trying to connect to the BP Client.');
      establishBPClientConnection();
    }
  }, 1000);

  // If connected to the BP-Client, poll for an updated port list
  if (clientService.type === serviceConnectionTypes.HTTP) {
    logConsoleMessage('From findClient(): looking for com ports');
    checkForComPorts();
  }
};

/**
 * checkClientVersionModal
 * Displays a modal with information about the client version if the one
 * being used is outdated. If the version is below the recommended version,
 * the user is warned, and versions below the minimum are alerted.
 * @param {string} rawVersion A string representing the client version in
 *  '0.0.0' format (Semantic versioning)
 */
function checkClientVersionModal(rawVersion) {
  // Record the version reported by the client
  if (rawVersion) {
    clientService.version.set(rawVersion);
  }
  if (!clientService.version.isRecommended) {
    $('.bpc-version').addClass('hidden');

    if (clientService.version.currentAsNumber === 0) {
      $('#client-unknown-span').removeClass('hidden');
    } else if (clientService.version.isValid) {
      $('#client-warning-span').removeClass('hidden');
    } else {
      $('#client-danger-span').removeClass('hidden');
    }

    $('.client-required-version').html(clientService.version.RECOMMENDED);
    if (clientService.version.currentAsNumber === 0) {
      $('.client-your-version').html('<b>UNKNOWN</b>');
    } else {
      $('.client-your-version').html(clientService.version.current);
    }
    $('#client-version-modal').modal('show');
  }
}

/**
 * @typedef {Object} BPClientDataBlock
 * @property {number} version
 * @property {string} version_str
 * @property {string} server
 */
/**
 * Establish a connection to the BlocklyProp-Client (BPC) application
 * Retrieves the BPC's version
 * Sets parameters in the clientService object
 * Calls UI configuration functions
 */
const establishBPClientConnection = function() {
  logConsoleMessage('establishBPConnection: entry');
  // Load data from the server using a HTTP GET request.
  $.get(clientService.url(), function(/* @type BPClientDataBlock */ data) {
    // {version: 0.7, version_str: "0.7.5", server: "BlocklyPropHTTP"}
    logConsoleMessage(`Connected to client?: ${data.version_str}`);
    if (!clientService.available) {
      let clientVersionString = (typeof data.version_str !== 'undefined') ? data.version_str : data.version;
      logConsoleMessage(`Client version is: ${clientVersionString}`);

      if (!data.server || data.server !== 'BlocklyPropHTTP') {
        clientVersionString = '0.0.0';
      }
      checkClientVersionModal(clientVersionString);
      clientService.type = serviceConnectionTypes.HTTP;
      clientService.available = true;         // Connected to the Launcher/Client
    }
  }).fail(function() {
    logConsoleMessage('Failed to open client connection');
    clientService.type = serviceConnectionTypes.NONE;
    clientService.available = false;            // Not connected to the Launcher/Client
    clientService.portsAvailable = false;
  }).always( function() {
    // Update the toolbar no mater what happens
    logConsoleMessage('Updating toolbar');
    propToolbarButtonController();
  });
};


/**
 * Create a modal that allows the user to set a different port or path
 * to the BlocklyProp-Client or -Launcher
 */
// eslint-disable-next-line no-unused-vars
const configureConnectionPaths = function() {
  // All of this code is building the UI for the Configure
  // BlocklyProp Client dialog.
  const pathPortInput = $('<form/>', {
    class: 'form-inline',
  });

  // This is hard-coding the HTTP protocol for the BlocklyProp Client
  $('<span/>', {
    class: 'space_right',
  }).text('http://').appendTo(pathPortInput);

  // Add the form group to the DOM for the input field defined next
  const domainNameGroup = $('<div/>', {
    class: 'form-group',
  }).appendTo(pathPortInput);

  // Default the domain input box
  $('<input/>', {
    id: 'domain_name',
    type: 'text',
    class: 'form-control',
    value: clientService.path,
  }).appendTo(domainNameGroup);

  // Hard code the ':' between the domain name and port input fields
  $('<span/>', {
    class: 'space_left space_right',
  }).text(':').appendTo(pathPortInput);

  // Add the form group to the DOM for the next input field
  const domainPortGroup = $('<div/>', {
    class: 'form-group',
  }).appendTo(pathPortInput);

  // Get the port number
  $('<input/>', {
    id: 'port_number',
    type: 'number',
    class: 'form-control',
    value: clientService.port,
  }).appendTo(domainPortGroup);

  // Show the modal dialog
  utils.confirm(
      Blockly.Msg.DIALOG_BLOCKLYPROP_LAUNCHER_CONFIGURE_TITLE,
      pathPortInput, function(action) {
        if (action) {
          clientService.path = $('#domain_name').val();
          clientService.port = $('#port_number').val();
        }
      }, Blockly.Msg.DIALOG_SAVE_TITLE);
};

/**
 * Data returned from the web socket for type 'port-list'
 * @typedef WebSocketMessagePortList
 * @type {string} type
 * @type {Array} ports
 */

/**
 * @typedef WebSocketHelloMessage
 * @type {string} type contains the message text
 * @type {number} baud contains the default baud rate
 * @description This is the format of the object passed into a newly opened
 * WebSocket connection.
 */

/**
 * Constant used in connection init sequence in BP Launcher
 * @type {string}
 */
const WS_TYPE_HELLO_MESSAGE           = 'hello-client';
const WS_TYPE_LIST_PORT_MESSAGE       = 'port-list';
const WS_TYPE_SERIAL_TERMINAL_MESSAGE = 'serial-terminal';
const WS_TYPE_UI_COMMAND              = 'ui-command';

const WS_ACTION_ALERT                 = 'alert';
const WS_ACTION_OPEN_TERMINAL         = 'open-terminal';
const WS_ACTION_CLOSE_TERMINAL        = 'close-terminal';
const WS_ACTION_OPEN_GRAPH            = 'open-graph';
const WS_ACTION_CLOSE_GRAPH           = 'close-graph';
const WS_ACTION_CLEAR_COMPILE         = 'clear-compile';
const WS_ACTION_MESSAGE_COMPILE       = 'message-compile';
const WS_ACTION_CLOSE_COMPILE         = 'close-compile';
const WS_ACTION_CONSOLE_LOG           = 'console-log';
const WS_ACTION_CLOSE_WEBSOCKET       = 'websocket-close';

/**
 * Checks for and, if found, uses a newer WebSockets-only client
 *
 * TODO: Refactor this function to use switch statements and sub-functions
 *  to make clear what this function is really doing.
 */
function establishBPLauncherConnection() {
  logConsoleMessage(`In BPLauncherConnection`);
  if (!clientService.available) {
    let connection;

    // Clear the port list
    clientService.portList = [];

    try {
      connection = new WebSocket(clientService.url('', 'ws'));
    } catch (e) {
      logConsoleMessage(`Unable to connect to the launcher: ${e.message}`);
      return;
    }

    // Callback executed when the connection is opened
    connection.onopen = function(event) {
      logConsoleMessage(`Socket connection opened. Connection state: ${connection.readyState.toString()}`);
      if (! clientService.activeConnection) {
        logConsoleMessage('WS connection onOpen but there is no activeConnection object');
        clientService.closeConnection();
      }
      /**
       * Web Socket greeting message object
       * @type WebSocketHelloMessage
       */
      const wsMessage = {
        type: 'hello-browser',
        baud: baudrate,
      };
      clientService.activeConnection = connection;
      connection.send(JSON.stringify(wsMessage));
    };

    // Log errors
    connection.onerror = function(error) {
      // Only display a message on the first attempt
      if (clientService.type !== serviceConnectionTypes.NONE) {
        logConsoleMessage('Unable to find websocket client');
        connection.close();
      } else {
        logConsoleMessage('Websocket Communication Error');
        logConsoleMessage(error.message);
      }
    };

    // handle messages from the client
    connection.onmessage = function(e) {
      const wsMessage = JSON.parse(e.data);

      if (wsMessage.type === WS_TYPE_HELLO_MESSAGE) {
        // --- hello handshake - establish new connection
        // type: 'hello-client',
        // version: [String version (semantic versioning)]
        // rxBase64: [boolean, accepts base64-encoded serial streams (all versions transmit base64)]
        checkClientVersionModal(wsMessage.version);
        logConsoleMessage('Websocket client/launcher found - version ' + wsMessage.version);
        clientService.rxBase64 = wsMessage.rxBase64 || false;
        clientService.type = serviceConnectionTypes.WS;
        clientService.available = true;
        // Request a port list from the server
        connection.send(JSON.stringify({
          type: 'port-list-request',
          msg: 'port-list-request',
        }));
        propToolbarButtonController();
      } else if (wsMessage.type === WS_TYPE_LIST_PORT_MESSAGE) {
        wsProcessPortListMessage(wsMessage);
      } else if (wsMessage.type === WS_TYPE_SERIAL_TERMINAL_MESSAGE &&
          (typeof wsMessage.msg === 'string' || wsMessage.msg instanceof String)) {
        // --- serial terminal/graph
        // sometimes some weird stuff comes through...
        // type: 'serial-terminal'
        // msg: [String Base64-encoded message]

        let messageText;
        try {
          messageText = atob(wsMessage.msg);
        } catch (error) {
          // only show the error if it's something other than base-64 encoding
          if (error.toString().indexOf('\'atob\'') < 0) {
            console.error(error);
          }
          messageText = wsMessage.msg;
        }

        if (clientService.sendCharacterStreamTo && messageText !== '' && wsMessage.packetID) {
          // is the terminal open?
          if (clientService.sendCharacterStreamTo === 'term') {
            const pTerm = getPropTerminal();
            pTerm.display(messageText);
            pTerm.focus();
          } else {    // is the graph open?
            graph_new_data(messageText);
          }
        }

        // --- UI Commands coming from the client
      } else if (wsMessage.type === WS_TYPE_UI_COMMAND) {
        wsProcessUiCommand(wsMessage);

        // --- older client - disconnect it?
      } else {
        logConsoleMessage('Unknown WS msg: ' + JSON.stringify(wsMessage));
      }
    };

    connection.onclose = function(event) {
      logConsoleMessage(`Closing WS: ${event.code}, ${event.message}`);
      lostWSConnection();
    };
  }
}


/**
 * Process a websocket Port List message
 * @param {object} message
 * @description
 *    wsMessage.ports
 *      {
 *        "type":"port-list",
 *        "ports":[
 *          "cu.usbserial-DN0286UD"
 *        ]
 *      }
 *  wsMessage.ports is a array of available ports
 */
function wsProcessPortListMessage(message) {
  clientService.portList = [];
  if (message.ports.length > 0) {
    logConsoleMessage(`Number of ports reported: ${message.ports.length}`);
    message.ports.forEach(function(port) {
      logConsoleMessage(`Port: "${port}"`);
      clientService.portList.push(port);
    });
  }
  logConsoleMessage(`Port list: ${message.ports}`);
  setPortListUI();
  clientService.portListReceiveCountUp = 0;
}

/**
 * Process a websocket UI command
 * @param {object} message
 *
 * @description
 * The command object format:
 *    type: 'ui-command',
 *    action: [
 *      'open-terminal', 'open-graph', 'close-terminal', 'close-graph',
 *      'close-compile', 'clear-compile', 'message-compile', 'alert'
 *    ],
 *    msg: [String message]
 */
function wsProcessUiCommand(message) {
  switch (message.action) {
    case WS_ACTION_OPEN_TERMINAL:
      serialConsole();
      break;

    case WS_ACTION_OPEN_GRAPH:
      graphingConsole();
      break;

    case WS_ACTION_CLOSE_TERMINAL:
      $('#console-dialog').modal('hide');
      clientService.sendCharacterStreamTo = null;
      getPropTerminal().display(null);
      break;

    case WS_ACTION_CLOSE_GRAPH:
      $('#graphing-dialog').modal('hide');
      clientService.sendCharacterStreamTo = null;
      graph_reset();
      break;

    case WS_ACTION_CLEAR_COMPILE:
      $('#compile-console').val('');
      break;

    case WS_ACTION_MESSAGE_COMPILE:
      wsCompileMessageProcessor(message);
      break;

    case WS_ACTION_CLOSE_COMPILE:
      $('#compile-dialog').modal('hide');
      $('#compile-console').val('');
      break;

    case WS_ACTION_CONSOLE_LOG:
      logConsoleMessage(message.msg);
      break;

    case WS_ACTION_CLOSE_WEBSOCKET:
      logConsoleMessage('Received a WS Close connection from server');
      clientService.closeConnection();
      propToolbarButtonController();
      break;

    case WS_ACTION_ALERT:
      utils.showMessage(Blockly.Msg.DIALOG_BLOCKLYPROP_LAUNCHER, message.msg);
      break;

    default:
      logConsoleMessage(`Unknown message received: ${message.msg}`);
  }
}

// Status Notice IDs
const NS_DOWNLOADING          = 2;
const NS_DOWNLOAD_SUCCESSFUL  = 5;

// Error Notice IDs
const NE_DOWNLOAD_FAILED      = 102;

/**
 * Process a loader message
 * @param {object} message
 */
function wsCompileMessageProcessor(message) {
  const [command, text] = parseCompileMessage(message.msg);
  if (command === NS_DOWNLOAD_SUCCESSFUL) {
    appendCompileConsoleMessage('Succeeded');
  } else {
    // If the download is still happening and the stream is not binary,
    // append the received text to the result log
    if (!clientService.loadBinary) {
      clientService.resultLog = clientService.resultLog + text + '\n';
      clientService.loadBinary = command !== NS_DOWNLOADING;
    }
  }
  if (command === NE_DOWNLOAD_FAILED) {
    appendCompileConsoleMessage(
        ` Failed!\n\n-------- loader messages --------\n${clientService.resultLog}`);
  } else {
    appendCompileConsoleMessage('.');
  }
  compileConsoleScrollToBottom();
}

/**
 * Split the compiler message into it's component parts
 * @param {string} message
 * @return {Array}
 * @description The message is formatted as 'nnn-ttttttt...'. Where n is a
 * three digit message mumber and t is the texts of the message. For example:
 * // 000-Scanning port cu.usbserial-DN0286UD
 */
function parseCompileMessage(message) {
  const result = [];
  result.push(parseInt(message.substring(0, 4)));
  result.push(message.substr(5));
  return result;
}


/**
 * Append text to the compiler progress dialog window
 * @param {string} message
 */
function appendCompileConsoleMessage(message) {
  $('#compile-console').val($('#compile-console').val() + message);
}

/**
 * Scroll to the bottom of the compiler output dialog
 * @description UI code to scroll the text area to the bottom line
 */
function compileConsoleScrollToBottom() {
  const compileConsoleObj = document.getElementById('compile-console');
  compileConsoleObj.scrollTop = compileConsoleObj.scrollHeight;
}

/**
 * Lost websocket connection, clean up and restart findClient processing
 */
function lostWSConnection() {
  logConsoleMessage(`Lost WS connection`);
  if (clientService.type !== serviceConnectionTypes.HTTP) {
    if (clientService.activeConnection) {
      logConsoleMessage(`Closing socket: ReadyState is:
     ${clientService.activeConnection.readyState}`);
    }
    logConsoleMessage(`Null-ing the active connection`);
    clientService.activeConnection = null;
    clientService.type = serviceConnectionTypes.NONE;
    clientService.available = false;
  }
  // Clear ports list
  clientService.portList = [];
  setPortListUI();
  propToolbarButtonController();
}

/**
 * Set communication port list. Leave data unspecified when searching
 *
 * @param {Array | null} data
 */
const setPortListUI = function(data = null) {
  if (! data) {
    data = clientService.portList;
  }

  const selectedPort = clearComPortUI();

  // We must have a non-empty array to work from
  // Solo-#438 - handle 'blank' port name
  // The Launcher now sends an empty string as a port name under certain
  // circumstances. If the 'blank' port is the only item in the list,
  // treat the clientServices.portsAvailable as if there are still no ports.
  if (typeof (data) === 'object' && data.length > 0) {
    let blankPort = false;
    data.forEach(function(port) {
      if (port.length === 0) {
        blankPort = true;
      }
      addComPortDeviceOption(port);
    });
    if ((data.length === 1 && !blankPort) || data.length > 1) {
      clientService.portsAvailable = true;
    }
  } else {
    // port list is empty, populate it
    addComPortDeviceOption(clientService.available ?
        Blockly.Msg.DIALOG_PORT_SEARCHING : Blockly.Msg.DIALOG_NO_DEVICE);
    clientService.portsAvailable = false;
  }
  selectComPort(selectedPort);
  propToolbarButtonController();
};

/**
 *  Clear the com port drop-down
 *
 * @return {string | jQuery} the currently selected value in the drop-down
 * before the element is cleared.
 */
function clearComPortUI() {
  const portUI = $('#comPort');
  if (portUI) {
    try {
      const port = portUI.val();
      portUI.empty();
      return port;
    } catch (e) {
      if (e) {
        logConsoleMessage('Error: ' + e.message);
      }
    }
  }

  portUI.empty();
  return null;
}

/**
 * Set the selected element in the com port dropdown list
 * @param {string | null} comPort
 */
// eslint-disable-next-line no-unused-vars,require-jsdoc
function selectComPort(comPort) {
  const uiComPort = $('#comPort');
  // A valid com port has been selected
  if (comPort !== null) {
    uiComPort.val(comPort);
    return;
  }

  // Com port is null. Select first com port as a default
  if (uiComPort.val() === null) {
    const options = $('#comPort option');
    if (options.length > 0) {
      uiComPort.val($('#comPort option:first').text());
    }
  }
}

/**
 *  Add a device port to the Com Port drop-down list
 *
 * @param {string }port
 */
function addComPortDeviceOption(port) {
  if (typeof(port) === 'string') {
    $('#comPort').append($('<option>', {text: port}));
  }
}


// -------------------------------

export {
  compile, renderContent, downloadCSV, initializeBlockly,
  sanitizeFilename, findClient, formatWizard, serialConsole,
  graphingConsole, configureConnectionPaths, downloadPropC,
};

