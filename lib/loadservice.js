/*******************************************************************************
 *  Code contributed to the webinos project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2012 Fraunhofer
 *******************************************************************************/

var logger = require("./logging.js")(__filename);
var path = require("path");
var fs = require("fs");
var webinosJS;

function load(mod, modDesc, registry, rpcHandler) {
    try {
        if (mod.Module) {
            var ApiModule = mod.Module;
            var m = new ApiModule(rpcHandler, modDesc.params);
            if (!m.init) {
                throw new Error("api module has no init function");
            }

            m.init(function register(o) {
                registry.registerObject(o);
            }, function unregister(o) {
                registry.unregisterObject(o);
            });
        } else if (mod.Service) {
            var Service = mod.Service;
            var s = new Service(rpcHandler, modDesc.params);
            registry.registerObject(s);
        } else {
            throw new Error("no Service or Module property");
        }
    } catch (error) {
        logger.error("Could not load module " + modDesc.name + " with message: " + error);
    }
}

exports.checkForNewWebinosModules = function(serviceCache) {
    try {
        // Assumption this function is inside webinos-pzp/node_modules/lib/loadService.js
        var node_moduleDir = path.resolve(__dirname, "../../");
        var fileList = fs.readdirSync(node_moduleDir), stat, config= {params:{}}, i, j, newModules=[];
        for (i = 0; i < fileList.length; i = i + 1) {
            stat = fs.statSync(path.resolve(node_moduleDir,fileList[i]));
            // Gather folders starting with webinos-api.
            // Do not serviceDiscovery as it is preloaded.
            // check it is a a directory
            if(fileList[i].indexOf("webinos-api") !== -1 && fileList[i].indexOf("webinos-api-serviceDiscovery") === -1
                && stat.isDirectory()) {
                // TODO: Simplify serviceCache check
                // check if do not have this module in serviceCache
                var present = false;
                for (j = 0 ; j < serviceCache.length; j = j + 1) {
                    if (serviceCache[j].name === fileList[i]){
                        present = true;
                        break;
                    }
                }
                if (present === false) {
                    try {
                        config = require(path.resolve(node_moduleDir, fileList[i], "config.json"));
                    } catch(err) {// config.json might not be there for each API
                        config= {params:{}}
                    }
                    // if file not found assume params is {}
                    newModules.push({name: fileList[i], params: config.params});
                    logger.log("New module "+fileList[i]+" detected with configuration parameters "+ require("util").inspect(config.params));
                }
            }
        }
        return newModules;
    } catch(e) {
        logger.error(e);
    }
};

exports.loadServiceModules = function(modulesDesc, registry, rpcHandler) {
    var mods = modulesDesc.map(function(m) {
        try {
            return require(m.name);
        } catch(e) {
            logger.error("module require for " + m.name + " failed: " + e);
            return m;
        }
    });
    for (var i=0; i<mods.length; i++) {
        load(mods[i], modulesDesc[i], registry, rpcHandler);
    }
};

exports.loadServiceModule = function(modDesc, registry, rpcHandler) {
    var mod = deps.global.require(deps.global.api[modDesc.name].location);
    require("npm").search(modDesc.name)
    load(mod, modDesc, registry, rpcHandler);
};

exports.createWebinosJS = function() {
    var wrt_Dir, fileList, data, i, j, fileName, webroot_Dir, stat;
    var node_moduleDir = path.resolve(__dirname, "../../");
    webroot_Dir = path.resolve(__dirname, "../../../web_root");
    wrt_Dir = path.resolve(__dirname, "../../../wrt"); // To read webinos.js and webinos.session.js
    fs.writeFileSync(path.join(webroot_Dir, "webinos.js"),""); // Overwrite/create file
    webinosJS = fs.createWriteStream(path.join(webroot_Dir, "webinos.js"), { flags:"a", encoding:"utf8"});
    fileList = fs.readdirSync(wrt_Dir);
    for (i = 0 ; i < fileList.length; i = i + 1) {
        data = fs.readFileSync(path.join(wrt_Dir,fileList[i]));
        webinosJS.write(data.toString());
    }
    // Gather folders starting with webinos-api
    fileList = fs.readdirSync(path.resolve(__dirname, "../../"));
    for (i = 0; i < fileList.length; i = i + 1) {
        if(fileList[i].indexOf("webinos-api") !== -1){
            fileName = fs.readdirSync(path.resolve(node_moduleDir, fileList[i], "wrt"));
            for (j=0; j < fileName.length; j = j + 1) {
                stat = fs.statSync(path.resolve(node_moduleDir, fileList[i], "wrt", fileName[j]));
                if (stat.isFile()) {
                    try {
                        data = fs.readFileSync(path.resolve(node_moduleDir, fileList[i], "wrt", fileName[j]));
                        webinosJS.write(data.toString());
                    } catch(err) {
                       logger.log("Webinos module without client side code. " ,"Using Web RunTime you will not be able to access module "+ fileList[i]);
                    }
                }
            }
        }
    }
};

exports.addWebinosJS = function() {
    var path = require("path");
    var fs = require("fs");
    var wrt_Dir, fileList, data, i, j, node_moduleDir, fileName, webroot_Dir;
    webroot_Dir = path.resolve(__dirname, "../../../web_root");
    webinosJS = fs.createWriteStream(path.join(webroot_Dir, "webinos.js"));
    wrt_Dir = path.resolve(__dirname, "../../../wrt");
    fileList = fs.readdirSync(wrt_Dir);
    for (i = 0 ; i < fileList.length; i = i + 1) {
        data = fs.readFileSync(path.join(wrt_Dir,fileList[i]));
        webinosJS.write(data);
    }
    node_moduleDir=path.resolve(__dirname, "../../");
    // Gather folders starting with webinos-api
    fileList = fs.readdirSync(node_moduleDir);
    for (i = 0; i < fileList.length; i = i + 1) {
        if(fileList[i].indexOf("webinos-api") !== -1){
            fileName = fs.readdirSync(path.resolve(node_moduleDir, fileList[i], "wrt"));
            for (j=0; j < fileName.length; j = j + 1) {
                data = fs.readFileSync(path.resolve(node_moduleDir, fileList[i], "wrt", fileName[i]));
                webinosJS.write(data);
            }
        }
    }
};