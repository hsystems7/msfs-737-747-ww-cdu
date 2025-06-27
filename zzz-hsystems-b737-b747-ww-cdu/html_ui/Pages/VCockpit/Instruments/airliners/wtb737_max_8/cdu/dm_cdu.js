// This code is based on the work of 
// https://github.com/dementedmonkey
// and
// https://github.com/tracernz
// without the contributions of those 2 
// I could not have done this without them
(function() {
    const WAITING_MSG = [
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        //
        [],[],[],[],[],
        ["W", "w", 0],
        ["A", "w", 0],
        ["I", "w", 0],
        ["T", "w", 0],
        [],
        ["F", "w", 0],
        ["O", "w", 0],
        ["R", "w", 0],
        [],
        ["P", "w", 0],
        ["O", "w", 0],
        ["W", "w", 0],
        ["E", "w", 0],
        ["R", "w", 0],
        [],[],[],[],[],
        //
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
        [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
    ];
    const MF_CAPT = "ws://localhost:8320/winwing/cdu-captain";
    const MF_CDU_ROWS = 14;
    const MF_CDU_COLS = 24;
    const MfCharSize = Object.freeze({
        Large: 0,
        Small: 1,
    });
    const MfColour = Object.freeze({
        Amber: "a",
        Brown: "o",
        Cyan: "c",
        Green: "g",
        Grey: "e",
        Khaki: "k",
        Magenta: "m",
        Red: "r",
        White: "w",
        Yellow: "y",
    });
    const colourMap = new Map([
        ["blue", MfColour.Cyan],
        ["green", MfColour.Green],
        ["disabled", MfColour.Grey],
        ["magenta", MfColour.Magenta],
        ["yellow", MfColour.Yellow],
        ["white", MfColour.White],
    ]);
    const charMap = Object.freeze({
        "\xa0": " ",
        "□": "\u2610",
        "⬦": "°",
    });
    const charRegex = new RegExp(`[${Object.keys(charMap).join("")}]`);

    function override(object, methodName, callback) {
        object[methodName] = callback(object[methodName])
    }

    function after(extraBehavior) {
        return function(original) {
            return function() {
                var returnValue = original.apply(this, arguments)
                extraBehavior.apply(this, arguments)
                return returnValue
            }
        }
    }
    class DM_FMC_Hook {
        constructor(cdu) {
            this._model = SimVar.GetSimVarValue("ATC MODEL", "string");
            this._cdu = cdu;
            this.needsUpdate = false;
            this.output = {
                Target: "Display",
                Data: Array.from({
                    length: MF_CDU_ROWS * MF_CDU_COLS
                }, () => []),
            };
            const self = this;
            // We send the data after the render occurs
            override(cdu, 'onAfterRender', after(this.onAfterRender.bind(this)));
            // Hook into the main instrument to get power notifications
            const instrument = document.getElementsByTagName('wtb38m-cdu')[0].fsInstrument;
            this._instrument = instrument;
            override(instrument, 'onPowerOn', after(this.sendData.bind(this)));
            // Connect to the websocket server.
            // Keep retrying every 5 seconds if it fails.
            const port = 8320;
            setInterval(() => {
                if (!this._socket || this._socket.readyState !== 1) {
                    this.connectWebsocket(port);
                }
            }, 5000);
        }
        connectWebsocket(port) {
            if (this._socket) {
                this._socket.close();
                this._socket = undefined;
            }
            this._socket = new WebSocket(MF_CAPT);
            this._socket.onopen = () => {
                console.log("dm21: Connected to websocket");
                this.output.Data = WAITING_MSG;
                this.sendToSocket(JSON.stringify(this.output));
            };
        }
        isConnected() {
            return this._socket && this._socket.readyState;
        }
        rowStyles() {
            // Row styles are defined in the HTML template, pull them out on first use
            if (this._rowStyles) {
                return this._rowStyles;
            }
            let rowElements = this._cdu.fmcScreen.renderer.rowElArr;
            this._rowStyles = rowElements.map(row => row.attributes["class"] ? row.attributes["class"].value : "");
            return this._rowStyles;
        }
        getColour(cellData) {
            for (let k of colourMap.keys()) {
                if (cellData.styles.includes(k)) {
                    return colourMap.get(k);
                }
            }
            return MfColour.White;
        }
        copyBoeingColDataToOutput(rowIndex, colIndex, cellData) {
            const outputIndex = rowIndex * MF_CDU_COLS + colIndex;
            // Ensure the output array has enough elements
            if (!this.output.Data[outputIndex]) {
                this.output.Data[outputIndex] = ["", "", 0];
            }
            // Set content (replace special characters if needed)
            this.output.Data[outputIndex][0] = cellData.content.replace(charRegex, (c) => charMap[c]);
            // Set color
            this.output.Data[outputIndex][1] = this.getColour(cellData);
            // Set size (0 for large, 1 for small based on your logic)
            this.output.Data[outputIndex][2] = (rowIndex % 2 === 1 && rowIndex !== MF_CDU_ROWS - 1) || cellData.styles.includes("s-text") ? 1 // Small (MfCharSize.Small)
                : 0; // Large (MfCharSize.Large)
        }
        sendData() {
            if (!this.isConnected()) {
                return;
            }
            const fmcScreen = this._cdu.fmcScreen;
            if (!fmcScreen) {
                return;
            }
            const renderer = fmcScreen.renderer;
            if (!renderer) {
                return;
            }
            const rowStyles = this.rowStyles();
            // Build lines array more efficiently
            const lines = renderer.columnData.map((cols, row) => ({
                rowStyle: rowStyles.length > row ? rowStyles[row] : "",
                cols: cols
            }));
            const screen = {
                lines: lines,
                exec: fmcScreen.fms.planInMod.value,
                power: this._instrument.isPowered,
            };
            // Initialize your output array if it doesn't exist
            if (!this.output.Data) {
                this.output.Data = new Array(MF_CDU_ROWS * MF_CDU_COLS);
                for (let i = 0; i < this.output.Data.length; i++) {
                    this.output.Data[i] = ["", "", 0];
                }
            }
            // Process the screen data into your websocket format
            const maxRows = Math.min(screen.lines.length, MF_CDU_ROWS);
            const maxCols = MF_CDU_COLS; // Pre-calculate this
            for (let r = 0; r < maxRows; r++) {
                const lineData = screen.lines[r];
                const colsToProcess = Math.min(lineData.cols.length, maxCols);
                for (let c = 0; c < colsToProcess; c++) {
                    this.copyBoeingColDataToOutput(r, c, lineData.cols[c]);
                }
            }
            this.sendToSocket(JSON.stringify(this.output));
        }
        sendToSocket(message) {
            if (this.isConnected()) {
                this._socket.send(message);
            }
        }
        onAfterRender() {
            // The screen render isn't created until after the first render,
            // hook the call at that point
            const renderer = this._cdu.fmcScreen.renderer;
            override(renderer, 'renderToDom', after(this.sendData.bind(this)));
        }
    }
    /*
    The existing CDU code supports a plugin system (to a degree),
    but nothing is actually creating the plugin hook.
    
    Create our own fake version with enough to hook the CDU creation
    */
    class PluginSystem {
        onComponentCreating(type, props) {
            return undefined;
        }
        onComponentRendered(node) {}
        onComponentCreated(instance) {
            let typename = instance.constructor.name;
            console.log(typename);
            if (typename == "B38MCdu") {
                new DM_FMC_Hook(instance);
                console.log("dm21: Attached hook to CDU instance");
            }
        }
        onAfterRender(node) {}
    }
    window._pluginSystem = new PluginSystem();
})();