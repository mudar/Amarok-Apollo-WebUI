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
