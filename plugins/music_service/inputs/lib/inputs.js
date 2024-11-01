"use strict";
var maxvolume, volumesteps, currentvolume, currentdevicevolume, currentmute, stateMute, availableInputs, activeInput, activePreset, lanInputNumber, libQ = require("kew"),
fs = require("fs-extra"),
config = new(require("v-conf")),
exec = require("child_process").exec,
execSync = require("child_process").execSync,
io = require("socket.io-client"),
{
  SerialPort: SerialPort
} = require("serialport"),
port = new SerialPort({
  path: "/dev/ttyS1",
  baudRate: 115200,
  encoding: "utf8",
  autoOpen: !1
}),
maxDeviceVolume = 255,
premutevolume = "";
function deviceVolumeToDb(e) {
  if (void 0 != e) return (e - maxDeviceVolume) / 2
}
var debug = 1,
serialMonitorEnabled = 1;
function inputs(e) {
  this.context = e,
  this.commandRouter = this.context.coreCommand,
  this.logger = this.context.logger,
  this.configManager = this.context.configManager,
  this.obj = {
    status: "play",
    service: "inputs",
    title: "",
    artist: "",
    album: "",
    albumart: "/albumart",
    uri: "",
    trackType: "",
    seek: 0,
    duration: 0,
    samplerate: "",
    bitdepth: "",
    stream: "",
    disableUiControls: !1,
    channels: 2
  }
}
module.exports = inputs,
inputs.prototype.onVolumioStart = function() {
  var e = this.commandRouter.pluginManager.getConfigurationFile(this.context, "config.json");
  return this.config = new(require("v-conf")),
  this.config.loadFile(e),
  libQ.resolve()
},
inputs.prototype.onStart = function() {
  var e = this;
  e.startSerial(),
  setTimeout(() => {
    e.overrideVolumeMethods(),
    e.initializeVolumeSettings()
  },
  3000),
  setTimeout(() => {
    e.getDSP()
  },
  10000);
  var t = libQ.defer();
  return t.resolve(), t.promise
},
inputs.prototype.onStop = function() {
  return libQ.defer().resolve(), libQ.resolve()
},
inputs.prototype.onRestart = function() {},
inputs.prototype.getUIConfig = function() {
  var e = libQ.defer(),
  t = this.commandRouter.sharedVars.get("language_code");
  return this.commandRouter.i18nJson(__dirname + "/i18n/strings_" + t + ".json", __dirname + "/i18n/strings_en.json", __dirname + "/UIConfig.json").then(function(t) {
    e.resolve(t)
  }).fail(function() {
    e.reject(new Error)
  }),
  e.promise
},
inputs.prototype.setUIConfig = function(e) {},
inputs.prototype.getConf = function(e) {},
inputs.prototype.setConf = function(e, t) {},
inputs.prototype.addToBrowseSources = function() {
  this.commandRouter.volumioAddToBrowseSources(data)
},
inputs.prototype.handleBrowseUri = function(e) {},
inputs.prototype.clearAddPlayTrack = function(e) {
  return this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::clearAddPlayTrack"),
  this.commandRouter.logger.info(JSON.stringify(e)),
  this.sendSpopCommand("uplay", [e.uri])
},
inputs.prototype.seek = function(e) {
  return this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::seek to " + e),
  this.sendSpopCommand("seek " + e, [])
},
inputs.prototype.stop = function() {
  var e = libQ.defer();
  return this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::stop"),
  e.resolve(""),
  e.promise
},
inputs.prototype.pause = function() {
  this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::pause")
},
inputs.prototype.getState = function() {
  this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::getState")
},
inputs.prototype.parseState = function(e) {
  this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::parseState")
},
inputs.prototype.pushState = function(e) {
  return this.commandRouter.pushConsoleMessage("[" + Date.now() + "] inputs::pushState"),
  this.commandRouter.servicePushState(e, this.servicename)
},
inputs.prototype.explodeUri = function(e) {
  return libQ.defer().promise
},
inputs.prototype.getAlbumArt = function(e, t) {
  var o, i, r;
  void 0 != e && void 0 != e.path && (t = e.path),
  void 0 != e && void 0 != e.artist && (o = e.artist, i = void 0 != e.album ? e.album: e.artist, r = "?web=" + nodetools.urlEncode(o) + "/" + nodetools.urlEncode(i) + "/large");
  var n = "/albumart";
  return void 0 != r && (n += r),
  void 0 != r && void 0 != t ? n += "&": void 0 != t && (n += "?"),
  void 0 != t && (n = n + "path=" + nodetools.urlEncode(t)),
  n
},
inputs.prototype.search = function(e) {
  return libQ.defer().promise
},
inputs.prototype._searchArtists = function(e) {},
inputs.prototype._searchAlbums = function(e) {},
inputs.prototype._searchPlaylists = function(e) {},
inputs.prototype._searchTracks = function(e) {},
inputs.prototype.startSerial = function() {
  var e = this;
  port.open(function(t) {
    if (t) return console.log("Error opening port: ", t.message);
    e.logger.info("INPUTS: Serial port opened successfully"),
    e.sendStartMessages()
  }),
  port.on("data",
  function(t) {
    try {
      e.parseMessage(t.toString("utf8"))
    } catch(t) {
      e.logger.error("INPUTS: Error in serial, unable to parse message: " + t)
    }
  }),
  port.on("error",
  function(t) {
    e.logger.error("INPUTS: Generic error in serial: " + t)
  })
},
inputs.prototype.sendSerialMessage = function(e) {
  debug && console.log("SENDING SERIAL MESSAGE: " + e),
  serialMonitorEnabled && this.commandRouter.broadcastMessage("pushSerialConsole", "FROM VOLUMIO:  " + e),
  port.write(e)
},
inputs.prototype.sendStartMessages = function() {
  var e = this;
  e.getModel(),
  setTimeout(() => {
    e.getSource()
  },
  1000),
  setTimeout(() => {
    e.getPreset(),
    e.streamerListener()
  },
  1500)
},
inputs.prototype.initializeVolumeSettings = function() {
  var e = this;
  this.commandRouter.executeOnPlugin("audio_interface", "alsa_controller", "setExternalVolume", !0),
  maxvolume = this.commandRouter.executeOnPlugin("audio_interface", "alsa_controller", "getConfigParam", "volumemax"),
  volumesteps = this.commandRouter.executeOnPlugin("audio_interface", "alsa_controller", "getConfigParam", "volumesteps"),
  e.overrideVolumeSettings(),
  setTimeout(() => {
    e.getMute()
  },
  1000),
  setTimeout(() => {
    e.getVolume()
  },
  2000)
},
inputs.prototype.overrideVolumeSettings = function() {
  var e = this;
  this.commandRouter.volumeControl.updateVolumeSettings = function(t) {
    if (maxvolume = t.maxvolume, volumesteps = t.volumesteps, "function" == typeof e.retrievevolume) return e.retrievevolume()
  }
},
inputs.prototype.overrideVolumeMethods = function() {
  this.commandRouter.volumeControl.alsavolume = function(e) {
    var t = libQ.defer(),
    o = {
      vol: currentvolume,
      dbVolume: deviceVolumeToDb(currentdevicevolume),
      mute: currentmute,
      disableVolumeControl: !1
    };
    switch (e) {
    case "mute":
      var i = currentvolume;
      currentdevicevolume = Math.round(currentvolume / 100 * maxDeviceVolume),
      currentmute = !0,
      o.mute = !0,
      premutevolume = i;
      break;
    case "unmute":
      currentdevicevolume = Math.round(currentvolume / 100 * maxDeviceVolume),
      currentmute = !1,
      o.vol = premutevolume,
      o.mute = !1;
      break;
    case "toggle":
      o.mute ? t.resolve(this.alsavolume("unmute")) : t.resolve(this.alsavolume("mute"));
      break;
    case "+":
      i = currentvolume; (e = Number(i) + Number(volumesteps)) > 100 && (e = 100),
      currentvolume = e,
      currentdevicevolume = Math.round(currentvolume / 100 * maxDeviceVolume),
      currentmute = !1,
      o.vol = e,
      o.mute = !1;
      break;
    case "-":
      i = currentvolume; (e = Number(i) - Number(volumesteps)) < 0 && (e = 0),
      e > maxvolume && (e = maxvolume),
      currentvolume = e,
      currentdevicevolume = Math.round(currentvolume / 100 * maxDeviceVolume),
      currentmute = !1,
      o.vol = e,
      o.mute = !1;
      break;
    default:
      e < 0 && (e = 0),
      e > 100 && (e = 100),
      e > maxvolume && (e = maxvolume),
      currentvolume = e,
      currentdevicevolume = Math.round(currentvolume / 100 * maxDeviceVolume),
      currentmute = !1,
      o.vol = e,
      o.mute = !1,
      o.disableVolumeControl = !1
    }
    o = {
      vol: currentvolume,
      dbVolume: deviceVolumeToDb(currentdevicevolume),
      mute: currentmute,
      disableVolumeControl: !1
    };
    return this.commandRouter.executeOnPlugin("music_service", "inputs", "setVolume", {
      volume: currentdevicevolume,
      mute: currentmute
    }),
    t.resolve(o),
    t.promise
  }
},
inputs.prototype.parseMessage = function(e) {
  try {
    e = e.replace(/\r/g, "").replace(/\n/g, " "),
    serialMonitorEnabled && this.commandRouter.broadcastMessage("pushSerialConsole", "FROM MCU:      " + e),
    this.logger.debug(`inputs.parseMessage() : $ {
      e
    }`);
    let t = e.split(" ");
    this.logger.debug(`inputs.parseMessage() : $ {
      t
    }`);
    let o = t.indexOf("PUSH");
    for (; - 1 != o;) {
      let e = t[o + 1].replace("\0\0", ""),
      i = t[o + 2];
      switch (this.logger.debug(`inputs.parseMessage() : COMMAND: ---$ {
        e
      }---`), this.logger.debug(`inputs.parseMessage() : MESSAGE: ---$ {
        i
      }---`), e) {
      case "MVOL":
        this.pushVolume(i);
        break;
      case "SOURCE":
        this.pushSource(i);
        break;
      case "MODEL":
        this.pushModel(i);
        break;
      case "PRESET":
        this.pushPreset(i);
        break;
      case "MUTE":
        this.pushMute(i);
        break;
      case "DSP":
        this.pushDSP(i);
        break;
      case "CMD":
        this.pushCMD(i)
      }
      o = t.indexOf("PUSH", o + 3)
    }
  } catch(e) {
    this.logger.error("INPUTS: parseMessage failed: " + e)
  }
},
inputs.prototype.getVolume = function() {
  return this.sendSerialMessage("\rGET MVOL\r")
},
inputs.prototype.setVolume = function(e) {
  if (e && void 0 !== e.mute && e.mute !== stateMute) {
    if (!0 === e.mute) var t = "TRUE";
    else t = "FALSE";
    this.setMute(t)
  }
  if (e && void 0 !== e.volume) {
    debug && console.log("SET VOLUME: " + e.volume);
    var o = "\rSET MVOL " + e.volume + "\r";
    this.sendSerialMessage(o)
  }
},
inputs.prototype.pushVolume = function(e) {
  debug && console.log("----------------------------------------" + e + "--------------------"),
  currentdevicevolume = parseInt(e);
  var t = {
    vol: currentvolume = Math.round(currentdevicevolume / maxDeviceVolume * 100),
    dbVolume: deviceVolumeToDb(currentdevicevolume),
    mute: currentmute,
    disableVolumeControl: !1
  };
  this.commandRouter.volumioupdatevolume(t),
  this.updateRoonVolume({
    volume: currentdevicevolume,
    mute: currentmute
  })
},
inputs.prototype.getMute = function() {
  return this.sendSerialMessage("\rGET MUTE\r")
},
inputs.prototype.setMute = function(e) {
  debug && console.log("SET MUTE " + e);
  var t = "\rSET MUTE " + e + "\r";
  return this.sendSerialMessage(t)
},
inputs.prototype.pushMute = function(e) {
  if (debug && console.log("MUTE----------------------------------------" + e + "--------------------"), "TRUE" === e ? currentmute = !0 : "FALSE" === e && (currentmute = !1), currentmute !== stateMute) {
    stateMute = currentmute;
    var t = {
      vol: currentvolume,
      dbVolume: deviceVolumeToDb(currentdevicevolume),
      mute: currentmute,
      disableVolumeControl: !1
    };
    this.commandRouter.volumioupdatevolume(t)
  }
},
inputs.prototype.getDSP = function() {
  return this.sendSerialMessage("\rGET DSP\r")
},
inputs.prototype.pushDSP = function(e) {
  var t;
  switch (debug && console.log("DSP----------------------------------------" + e + "--------------------"), e) {
  case "1111111":
    t = {
      quality: "enhanced",
      type: "minidsp",
      sub_type: "dirac"
    };
    break;
  case "0111111":
    t = {};
    break;
  default:
    this.logger.error("INPUTS: Unrecognized DSP Type: " + e),
    t = {}
  }
  this.commandRouter.executeOnPlugin("music_service", "raat", "updateDSP", t)
},
inputs.prototype.getModel = function() {
  return this.sendSerialMessage("\rGET MODEL\r")
},
inputs.prototype.getPreset = function() {
  return this.sendSerialMessage("\rGET PRESET\r")
},
inputs.prototype.pushPreset = function(e) {
  activePreset = e
},
inputs.prototype.pushCMD = function(e) {
  switch (e) {
  case "PLAY":
    // todo
    this.logger.info("INPUTS: PLAY pushed on remote");
    this.commandRouter.executeOnPlugin("music_service", "squeezelite_mc", "play");
    break;
  case "PAUSE":
    this.logger.info("INPUTS: PAUSE pushed on remote");
    this.commandRouter.executeOnPlugin("music_service", "squeezelite_mc", "pause");
    this.commandRouter.volumioToggle();    
    break;
  case "PREVIOUS":
    this.logger.info("INPUTS: PREVIOUS pushed on remote");
    this.commandRouter.executeOnPlugin("music_service", "squeezelite_mc", "previous");
    this.commandRouter.volumioPrevious();
    break;
  case "NEXT":
    this.logger.info("INPUTS: NEXT pushed on remote");
    this.commandRouter.executeOnPlugin("music_service", "squeezelite_mc", "next");
    this.commandRouter.volumioNext();
    break;
  default:
    this.logger.error("INPUTS: Unrecognized Command " + e)
  }
},
inputs.prototype.setPreset = function(e) {
  var t = "\rSET PRESET " + e + "\r";
  return this.sendSerialMessage(t)
},
inputs.prototype.getSource = function() {
  return this.sendSerialMessage("\rGET SOURCE\r")
},
inputs.prototype.pushSource = function(e) {
  activeInput = e,
  this.setActiveInput(e)
},
inputs.prototype.setSource = function(e) {
  var t = "\rSET SOURCE " + e + "\r";
  return this.sendSerialMessage(t)
},
inputs.prototype.pushModel = function(e) {
  "1" === e ? (availableInputs = [{
    id: "1",
    name: "TOSLINK",
    icon: "/albumart?sourceicon=music_service/inputs/opticalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "2",
    name: "SPDIF",
    icon: "/albumart?sourceicon=music_service/inputs/digitalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "3",
    name: "AES-EBU",
    icon: "/albumart?sourceicon=music_service/inputs/xlricon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "4",
    name: "RCA",
    icon: "/albumart?sourceicon=music_service/inputs/digitalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "5",
    name: "XLR",
    icon: "/albumart?sourceicon=music_service/inputs/xlricon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "6",
    name: "USB",
    icon: "/albumart?sourceicon=music_service/inputs/usbicon.png",
    trackType: "input",
    showButton: !0
  }], lanInputNumber = "7", this.commandRouter.sharedVars.addConfigValue("device_vendor_model", "string", "miniDSP SHD"), this.commandRouter.executeOnPlugin("music_service", "raat", "reconfigureAndRestartRaat", "")) : "2" === e ? (availableInputs = [{
    id: "1",
    name: "TOSLINK",
    icon: "/albumart?sourceicon=music_service/inputs/opticalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "2",
    name: "SPDIF",
    icon: "/albumart?sourceicon=music_service/inputs/digitalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "3",
    name: "AES-EBU",
    icon: "/albumart?sourceicon=music_service/inputs/xlricon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "4",
    name: "USB",
    icon: "/albumart?sourceicon=music_service/inputs/usbicon.png",
    trackType: "input",
    showButton: !0
  }], lanInputNumber = "5", this.commandRouter.sharedVars.addConfigValue("device_vendor_model", "string", "miniDSP SHD Studio"), this.commandRouter.executeOnPlugin("music_service", "raat", "reconfigureAndRestartRaat", "")) : "3" === e && (availableInputs = [{
    id: "1",
    name: "TOSLINK",
    icon: "/albumart?sourceicon=music_service/inputs/opticalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "2",
    name: "SPDIF",
    icon: "/albumart?sourceicon=music_service/inputs/digitalicon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "3",
    name: "AES-EBU",
    icon: "/albumart?sourceicon=music_service/inputs/xlricon.png",
    trackType: "input",
    showButton: !0
  },
  {
    id: "4",
    name: "USB",
    icon: "/albumart?sourceicon=music_service/inputs/usbicon.png",
    trackType: "input",
    showButton: !0
  }], lanInputNumber = "5", this.commandRouter.sharedVars.addConfigValue("device_vendor_model", "string", "miniDSP SHD Power"), this.commandRouter.executeOnPlugin("music_service", "raat", "reconfigureAndRestartRaat", "")),
  this.addToBrowseSources()
},
inputs.prototype.addToBrowseSources = function() {
  this.logger.info("INPUTS: Adding MINIDSP Inputs");
  var e = {
    albumart: "/albumart?sourceicon=music_service/inputs/inputsicon.png",
    name: "Inputs",
    uri: "inputs",
    plugin_type: "music_service",
    plugin_name: "inputs"
  };
  this.commandRouter.volumioAddToBrowseSources(e);
  e = {
    albumart: "/albumart?sourceicon=music_service/inputs/presetsicon.png",
    name: "Presets",
    uri: "presets",
    plugin_type: "music_service",
    plugin_name: "inputs"
  };
  this.commandRouter.volumioAddToBrowseSources(e)
},
inputs.prototype.handleBrowseUri = function(e) {
  var t = libQ.defer();
  if ("inputs" === e) {
    var o = this.getInputs();
    t.resolve(o)
  }
  if ("presets" === e) {
    var i = this.listPresets();
    t.resolve(i)
  }
  if (e.indexOf("inputs/id/") >= 0) {
    var r = e.replace("inputs/id/", "");
    activeInput = r,
    this.setSource(r);
    o = this.getInputs();
    t.resolve(o)
  }
  if (e.indexOf("presets/id/") >= 0) {
    r = e.replace("presets/id/", "");
    activePreset = r,
    this.setPreset(r);
    o = this.listPresets();
    t.resolve(o)
  }
  return t.promise
},
inputs.prototype.getInputs = function() {
  for (var e = [], t = availableInputs, o = 0; o < t.length; o++) {
    var i = t[o],
    r = i.id;
    if (r === activeInput) var n = {
      service: "inputs",
      type: "inputs",
      title: i.name,
      albumart: i.icon,
      uri: "inputs/id/" + r,
      active: !0,
      type: "item-no-menu"
    };
    else n = {
      service: "inputs",
      type: "inputs",
      title: i.name,
      albumart: i.icon,
      uri: "inputs/id/" + r,
      active: !1,
      type: "item-no-menu"
    };
    e.push(n)
  }
  return {
    navigation: {
      lists: [{
        availableListViews: ["grid"],
        items: e
      }]
    }
  }
},
inputs.prototype.setActiveInput = function(e) {
  var t = this;
  activeInput = e;
  if (e === lanInputNumber) this.commandRouter.setSourceActive("no-source"),
  this.commandRouter.broadcastMessage("pushActiveDumbInput", "");
  else for (var o = 0; o < availableInputs.length; o++) {
    var i = availableInputs[o];
    if (i.id === activeInput) {
      var r = {
        trackType: i.trackType,
        service: "inputs",
        title: i.name,
        disableUiControls: !0,
        albumart: "/albumart"
      },
      n = t.commandRouter.stateMachine.getState();
      if (void 0 === n || void 0 === n.service || "inputs" === n.service || !t.commandRouter.stateMachine.isVolatile) return this.commandRouter.setSourceActive("no-source"),
      this.commandRouter.broadcastMessage("pushActiveDumbInput", r.title),
      t.notifyActiveInput(r);
      this.commandRouter.setSourceActive("no-source"),
      t.commandRouter.stateMachine.unSetVolatile(),
      setTimeout(() => (this.commandRouter.broadcastMessage("pushActiveDumbInput", r.title), t.notifyActiveInput(r)), 500)
    }
  }
},
inputs.prototype.notifyActiveInput = function(e) {
  var t = this;
  try {
    t.context.coreCommand.volumioStop().then(() => {
      t.context.coreCommand.stateMachine.setConsumeUpdateService(void 0),
      t.context.coreCommand.stateMachine.setVolatile({
        service: "inputs",
        callback: t.clearInputs.bind(t)
      })
    })
  } catch(e) {
    t.logger.error("INPUTS: Cannot set stop: " + e),
    t.context.coreCommand.stateMachine.setConsumeUpdateService(void 0),
    t.context.coreCommand.stateMachine.setVolatile({
      service: "inputs",
      callback: t.clearInputs.bind(t)
    })
  }
  t.logger.info("INPUTS: Notifying Active Input " + JSON.stringify(e)),
  t.obj.status = "play",
  t.obj.trackType = "",
  t.obj.title = "",
  t.obj.albumart = "/albumart",
  t.obj.seek = 0,
  t.obj.duration = 0,
  t.obj.stream = !0,
  void 0 != e.trackType && (t.obj.trackType = e.trackType),
  void 0 != e.title && (t.obj.title = e.title),
  void 0 != e.albumart && (t.obj.albumart = e.albumart),
  void 0 === e.service ? e.service = "artera_inputs": t.obj.service = e.service,
  void 0 !== e.disableUiControl && (t.obj.disableUiControls = e.disableUiControl),
  setTimeout(function() {
    t.pushMeta()
  },
  400)
},
inputs.prototype.pushMeta = function() {
  this.obj.service ? this.context.coreCommand.servicePushState(this.obj, "inputs") : this.context.coreCommand.servicePushState(this.obj, this.obj.service)
},
inputs.prototype.listPresets = function() {
  for (var e = [], t = [{
    id: "1",
    name: "PRESET 1",
    icon: "/albumart?sourceicon=music_service/inputs/presetsicon.png",
    trackType: "opt1",
    showButton: !0
  },
  {
    id: "2",
    name: "PRESET 2",
    icon: "/albumart?sourceicon=music_service/inputs/presetsicon.png",
    trackType: "dig1",
    showButton: !0
  },
  {
    id: "3",
    name: "PRESET 3",
    icon: "/albumart?sourceicon=music_service/inputs/presetsicon.png",
    trackType: "opt2",
    showButton: !0
  },
  {
    id: "4",
    name: "PRESET 4",
    icon: "/albumart?sourceicon=music_service/inputs/presetsicon.png",
    trackType: "opt2",
    showButton: !0
  }], o = 0; o < t.length; o++) {
    var i = t[o],
    r = i.id;
    if (r === activePreset) var n = {
      service: "inputs",
      type: "inputs",
      title: i.name,
      albumart: i.icon,
      uri: "presets/id/" + r,
      active: !0,
      type: "item-no-menu"
    };
    else n = {
      service: "inputs",
      type: "inputs",
      title: i.name,
      albumart: i.icon,
      uri: "presets/id/" + r,
      active: !1,
      type: "item-no-menu"
    };
    e.push(n)
  }
  return {
    navigation: {
      lists: [{
        availableListViews: ["grid"],
        items: e
      }]
    }
  }
},
inputs.prototype.clearInputs = function() {
  var e = libQ.defer();
  return this.setSource(lanInputNumber),
  setTimeout(() => {
    e.resolve()
  },
  250),
  this.obj.trackType = "",
  this.obj.title = "",
  this.obj.albumart = "/albumart",
  this.obj.seek = 0,
  this.obj.duration = 0,
  this.obj.stream = !0,
  this.pushMeta(),
  e.promise
},
inputs.prototype.streamerListener = function() {
  var e = this;
  io.connect("http://localhost:3000").on("pushState",
  function(t) {
    t && t.service && "inputs" !== t.service && "play" === t.status && activeInput !== lanInputNumber && (activeInput = lanInputNumber, e.setSource(lanInputNumber))
  })
},
inputs.prototype.updateRoonVolume = function(e) {
  this.commandRouter.executeOnPlugin("music_service", "raat", "updateRoonVolume", e)
},
inputs.prototype.serialMonitorAction = function(e) {
  var t = e.action;
  "get" === t && this.commandRouter.broadcastMessage("pushSerialConsole", "enabled"),
  "start" !== t || serialMonitorEnabled || (this.logger.info("INPUTS: Starting Serial Monitor Process"), serialMonitorEnabled = !0),
  "stop" === t && serialMonitorEnabled && (this.logger.info("INPUTS: Stopping Serial Monitor Process"), serialMonitorEnabled = !1),
  "sendMessage" === t && e.message && e.message.length && (serialMonitorEnabled || (serialMonitorEnabled = !0), this.logger.info("INPUTS: Sending Message to Serial Monitor Process: " + e.message), this.sendSerialMessage(e.message))
};
