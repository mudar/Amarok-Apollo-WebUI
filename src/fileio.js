/*
 *    Copyright (C) 2009 by Johannes Wolter <jw@inutil.org>
 *                          Ian Monroe <ian@monroe.nu>
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

Importer.include("httpserver.js");

/*
 * Serve a file from the <scriptPath>/www folder.
 * If path is pointing to a parent directory a 403 is sent.
 * For some file types the corresponding mime-type is set.
 */
fileHandler = function(path){
    response = new HandlerResponse();
    if(path === "/" || path === ""){
        return homepageDiv();
    }
    canonicalRootDir = new QFileInfo(Amarok.Info.scriptPath()+"/www").canonicalFilePath();
    pathFileInfo = new QFileInfo(Amarok.Info.scriptPath()+"/www"+path);
    if(pathFileInfo.canonicalFilePath().indexOf(canonicalRootDir) != 0){
        response.append("403 Error: Forbidden!");
        response.setMimeType("text/plain");
        response.setReturnCode(403, "Forbidden");
        return response;
    }
    file = new QFile(pathFileInfo.canonicalFilePath());
    if(file.open(QIODevice.ReadOnly)){
        if( pathFileInfo.completeSuffix() == "css" ){
            response.setMimeType("text/css");
			response.enableCache();
        }else if( pathFileInfo.completeSuffix() == "js" ){
            response.setMimeType("text/javascript");
			response.enableCache();
        }else if( pathFileInfo.completeSuffix() == "jpg" ){
            response.setMimeType("image/jpeg");
			response.enableCache();
        }else if( pathFileInfo.completeSuffix() == "png" ){
            response.setMimeType("image/png");
			response.enableCache();
        }else if( pathFileInfo.completeSuffix() == "gif" ){
            response.setMimeType("image/gif");
			response.enableCache();
        }else if( pathFileInfo.completeSuffix() == "ico" ){
            response.setMimeType("image/x-icon");
			response.enableCache();
        }
        response.append(file.readAll());
        file.close();
        return response;
    }else{
//      Amarok.debug("File not found!");
        response.append("404 Error: File not found!");
        response.setReturnCode(404, "Not Found");
        response.setMimeType("text/plain");
    }
    return response;
}

/*
 * Load a file and return the contents as string.
 */
loadFile = function(path,isText){
	isText = ( typeof isText == 'undefined' ) || isText;
    file = new QFile(Amarok.Info.scriptPath()+path);
    file.open(QIODevice.ReadOnly);
    r = file.readAll();
    file.close();
	if ( isText ) {
		return r.toString();
	}
	else {
		return r;
	}
}

loadHeaderFile = function() {
	r = loadFile('/www/header.html',true);
	role = ( USER_MODE == USER_MODE_DJ ? "role_dj" : "role_guest" );
	return r.replace("###role###",role);
}

loadFooterFile = function() {
	filename = ( USER_MODE == USER_MODE_GUEST ? "footer-guest.html" : "footer.html" );
	r = loadFile('/www/'+filename ,true);
	r = r.replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
	return r;
}
