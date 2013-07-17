/*
 *    Copyright (C) 2009 by Johannes Wolter <jw@inutil.org>
 *                          Ian Monroe <ian@monroe.nu>
 *    Copyright (C) 2012 by Martin Hoeher <martin@rpdev.net>
 *    Copyright (C) 2013 by Mudar Noufal <mn@mudar.ca>
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

/**
 * Convenience function
 */
QByteArray.prototype.toString = function(){
    ts = new QTextStream( this, QIODevice.ReadOnly );
    return ts.readAll();
}

/**
 * 
 * @param {QPixmap} pixmap
 * @param {int} dimension
 */
pixmapToPNG = function(pixmap, dimension){
    data = new QByteArray();
    buffer = new QBuffer(data);
    buffer.open(QIODevice.WriteOnly);
	if ( dimension != false ) {
		pixmap.scaled(dimension, dimension, Qt.IgnoreAspectRatio, Qt.SmoothTransformation).save(buffer, "PNG");
	}
	else {
		pixmap.save(buffer, "PNG");
	}
	buffer.close();
    return data;
}

/*
 * Shorthand: Select variant readConfig of Script class
 * 
 * this convenience function selects the variant overload of the readConfig
 * method provided by the Amarok.Script interface. (Otherwise, when just
 * using readConfig, the script terminates with an ambiguous overload
 * exception).
 */
readConfigV = function(key, defValue) {
  return Amarok.Script["readConfig(QString,QVariant)"]( key, defValue );
}

/*
 * Same as above, but for writeConfig.
 */
writeConfigV = function( key, value ) {
  Amarok.Script["writeConfig(QString,QVariant)"]( key, value );
}

jsonEscape = function(str) {
	return str.replace("\\", "\\\\").replace(/["]/g, '\\"');
}

getIpAddress = function() {
	allInterfaces = new QNetworkInterface.allInterfaces();
	nbInterfaces = allInterfaces.length;
// 	Amarok.debug("========================== QNetworkInterface::IsRunning = " + QNetworkInterface.IsRunning );
	for ( i = 0 ; i < nbInterfaces ; i++ ) {
		interface = allInterfaces[i];
		if ( interface.hardwareAddress().toString() != '00:00:00:00:00:00' ) {
			addressEntries = interface.addressEntries();
			nbAddresses = addressEntries.length;
			for ( j = 0 ; j < nbAddresses ; j++ ) {
				ipAddress = addressEntries[j].ip().toString();
				if ( ipAddress.indexOf("::") == -1 ) {
					return ipAddress;
// 					Amarok.debug("========================== hardwareAddress = " + interface.hardwareAddress() );
// 					Amarok.debug("========================== IP Address # = " + ipAddress);
				}
			}
		}
	}
	return false;
}

/**
 * Compare software versions
 * Returns true if 'installed' (considered as a JRE version string) is
 * greater than or equal to 'required' (again, a JRE version string).
 * 
 * http://stackoverflow.com/a/6832670/535915
* Taken from http://java.com/js/deployJava.js:
 */
compareVersions = function (installed, required) {

	var a = installed.split('.');
	var b = required.split('.');

	for (var i = 0; i < a.length; ++i) {
		a[i] = Number(a[i]);
	}
	for (var i = 0; i < b.length; ++i) {
		b[i] = Number(b[i]);
	}
	if (a.length == 2) {
		a[2] = 0;
	}

	if (a[0] > b[0]) return true;
	if (a[0] < b[0]) return false;

	if (a[1] > b[1]) return true;
	if (a[1] < b[1]) return false;

	if (a[2] > b[2]) return true;
	if (a[2] < b[2]) return false;

	return true;
}
