var path = require('path'),
	fs = require('fs'),
	wrench = require('wrench'),
	DOMParser = require("xmldom").DOMParser,
	XMLSerializer = require("xmldom").XMLSerializer,
	_ = require('../lib/alloy/underscore')._,
	U = require('../utils'),
	alloyRoot = path.join(__dirname,'..');

function createPlugin(rootDir) {
	var plugins = path.join(rootDir,"plugins");
	U.ensureDir(plugins);
	
	var alloyPluginDir = path.join(plugins,"ti.alloy");
	U.ensureDir(alloyPluginDir);
	
	var alloyPlugin = path.join(alloyPluginDir,"plugin.py");
	var pi = path.join(alloyRoot,"plugin","plugin.py");
	
	U.copyFileSync(pi,alloyPlugin);
	logger.info('Deployed ti.alloy plugin to '+alloyPlugin);
}

function installPlugin(dir)
{
	createPlugin(dir);

	var tiapp = path.join(dir,'tiapp.xml');
	if (path.existsSync(tiapp))
	{
		var xml = fs.readFileSync(tiapp);
		var doc = new DOMParser().parseFromString(String(xml));
		var plugins = doc.documentElement.getElementsByTagName("plugins");
		var found = false;

		if (plugins.length > 0)
		{
			var items = plugins.item(0).getElementsByTagName('plugin');
			if (items.length > 0)
			{
				for (var c=0;c<items.length;c++)
				{
					var plugin = items.item(c);
					var name = U.XML.getNodeText(plugin);
					if (name == 'ti.alloy')
					{
						found = true;
						break;
					}
				}
			}
		}
		
		if (!found)
		{
			var node = doc.createElement('plugin');
			node.setAttribute('version','1.0');
			var text = doc.createTextNode('ti.alloy');
			node.appendChild(text);
			
			var pna = null;
			
			// install the plugin into tiapp.xml
			if (plugins.length == 0)
			{
				var pn = doc.createElement('plugins');
				doc.documentElement.appendChild(pn);
				doc.documentElement.appendChild(doc.createTextNode("\n"));
				pna = pn;
			}
			else
			{
				pna = plugins.item(0);
			}
			
			pna.appendChild(node);
			pna.appendChild(doc.createTextNode("\n"));
			
			var serializer = new XMLSerializer();
			var newxml = serializer.serializeToString(doc);
			
			fs.writeFileSync(tiapp,newxml);
			logger.info("Installed 'ti.alloy' plugin to "+tiapp);
		}
	}
}

function newproject(args, program) {
	var dirs = ['controllers','styles','views','models','migrations','config','assets','lib','vendor','template'],
		templateDir = path.join(alloyRoot,'template'),
		defaultDir = path.join(templateDir,'default'),
		INDEX_XML  = fs.readFileSync(path.join(defaultDir,'index.xml'),'utf8'),
		INDEX_JSON = fs.readFileSync(path.join(defaultDir,'index.json'),'utf8'),
		INDEX_C    = fs.readFileSync(path.join(defaultDir,'index.js'),'utf8'),
		defaultConfig = {},
		projectPath, appPath, tmpPath, alloyJmkTemplate, cfg;

	// validate args
	if (!_.isArray(args) || args.length === 0) {
		U.die("\"alloy new\" requires an [OUTPUT_DIR]");
	}

	// get app path, create if necessary
	projectPath = args[0];
	appPath = path.join(projectPath,'app');
	if (path.existsSync(appPath)) {
		if (!program.force) {
			U.die("Directory already exists at: " + appPath);
		} else {
			wrench.rmdirSyncRecursive(appPath);
		}
	}
	wrench.mkdirSyncRecursive(appPath, 0777);
	
	// create alloy app directories
	for (var c = 0; c < dirs.length; c++) {
		tmpPath = path.join(appPath, dirs[c]);
		if (!path.existsSync(tmpPath)) {
			fs.mkdirSync(tmpPath);
		}
	}
	
	// create default view, controller, style, and config. 
	fs.writeFileSync(path.join(appPath,'views','index.xml'),INDEX_XML);
	fs.writeFileSync(path.join(appPath,'styles','index.json'),INDEX_JSON);
	fs.writeFileSync(path.join(appPath,'controllers','index.js'),INDEX_C);
	fs.writeFileSync(path.join(appPath,'alloy.json'),U.stringifyJSON(defaultConfig));

	// Copy templates
	U.copyFilesAndDirs(templateDir, path.join(appPath,'template'));

	// write the build file
	alloyJmkTemplate = fs.readFileSync(path.join(templateDir,'alloy.jmk'), 'utf8');
	fs.writeFileSync(path.join(appPath,'alloy.jmk'), alloyJmkTemplate);
		
	// write the project config file
	cfg = {global:{}, "env:development":{}, "env:test":{}, "env:production":{}, "os:ios":{}, "os:android":{}};
	fs.writeFileSync(path.join(appPath,"config","config.json"), U.stringifyJSON(cfg));

	// install the plugin
	installPlugin(projectPath);
	
	logger.info('Generated new project at: ' + appPath);
}

module.exports = newproject;