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
pixmapToJPEG = function(pixmap, dimension){
    data = new QByteArray();
	if ( pixmap.isNull() ) { return data; }
	
    buffer = new QBuffer(data);
    buffer.open(QIODevice.WriteOnly);
	if ( dimension != false ) {
		pixmap.scaledToWidth(dimension, Qt.SmoothTransformation).save(buffer, "JPEG");
	}
	else {
		pixmap.save(buffer, "JPEG");
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
	for ( i = 0 ; i < nbInterfaces ; i++ ) {
		interface = allInterfaces[i];
		if ( interface.hardwareAddress().toString() != '00:00:00:00:00:00' ) {
			addressEntries = interface.addressEntries();
			nbAddresses = addressEntries.length;
			for ( j = 0 ; j < nbAddresses ; j++ ) {
				ipAddress = addressEntries[j].ip().toString();
				if ( ipAddress.indexOf("::") == -1 ) {
					return ipAddress;
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




////////////////////////////////////////////////////////////////
/// getID3() by James Heinrich <info@getid3.org>               //
//  available at http://getid3.sourceforge.net                 //
//            or http://www.getid3.org                         //
/////////////////////////////////////////////////////////////////

/*
   getID3() is released under multiple licenses. You may choose
   from the following licenses, and use getID3 according to the
   terms of the license most suitable to your project.
   
    GNU GPL: https://gnu.org/licenses/gpl.html                   (v3)
             https://gnu.org/licenses/old-licenses/gpl-2.0.html  (v2)
             https://gnu.org/licenses/old-licenses/gpl-1.0.html  (v1)

    GNU LGPL: https://gnu.org/licenses/lgpl.html                 (v3)

    Mozilla MPL: http://www.mozilla.org/MPL/2.0/                 (v2)

    getID3 Commercial License: http://getid3.org/#gCL (payment required)
*/


/**
 * Module for extracting album image from ID3v2 tags.
 * 
 * Based on getID3() by James Heinrich, this is a JavaScript port of 
 * the PHP library.
 * 
 * Beside the language syntax changes, the original library was simplified 
 * to extract the cover image only.
 * 
 * Amarok Apollo WebUI use the GPLv3 licence of getID3().
 */
GetID3 = new function() {

	/**
	 * Analyze the ID3v2 and return a QPixmap of the cover image.
	 * 
	 * @param string filename
	 * @return QPixmap() The cover image. Empty QPixmap on error or if non found.
	 * 
	 * @function Analyze() 
	 * @file getid3/module.tag.id3v2.php
	 * @line 22
	 */
	this.getPixmap = function(fileName) {
		
		var imageFrameDataTotalOffset = 0;
			
		file = new QFile(fileName);
		file.open(QIODevice.ReadOnly);

		startingOffset = 0;
		file.seek(startingOffset);
		header = file.read(10).toString();
		if (header.substring(0, 3) == 'ID3' && header.length == 10) {
			id3v2MajorVersion = header.charCodeAt(3);
			id3v2MinorVersion = header.charCodeAt(4);
		}
		else {
			return false;
		}

		id3Flags = header.charCodeAt(5);
		
		id3v2FlagsUnsynch     = false;
		id3v2FlagsCompression = false;
		id3v2FlagsExthead     = false;
		id3v2FlagsExperim     = false;
		id3v2FlagsIsFooter    = false;
		switch (id3v2MajorVersion) {
			case 2:
				// %ab000000 in v2.2
				id3v2FlagsUnsynch     = Boolean(id3Flags & 0x80); // a - Unsynchronisation
				id3v2FlagsCompression = Boolean(id3Flags & 0x40); // b - Compression
				break;
			case 3:
				// %abc00000 in v2.3
				id3v2FlagsUnsynch     = Boolean(id3Flags & 0x80); // a - Unsynchronisation
				id3v2FlagsExthead     = Boolean(id3Flags & 0x40); // b - Extended header
				id3v2FlagsExperim     = Boolean(id3Flags & 0x20); // c - Experimental indicator
				break;
			case 4:
				// %abcd0000 in v2.4
				id3v2FlagsUnsynch     = Boolean(id3Flags & 0x80); // a - Unsynchronisation
				id3v2FlagsExthead     = Boolean(id3Flags & 0x40); // b - Extended header
				id3v2FlagsExperim     = Boolean(id3Flags & 0x20); // c - Experimental indicator
				id3v2FlagsIsFooter    = Boolean(id3Flags & 0x10); // d - Footer present
				break;
		}
		
		headerLength = this.BigEndian2Int(header.substring(6,10),1) + 10; // length of ID3v2 tag in 10-byte header doesn't include 10-byte header length
		tagOffsetStart = startingOffset;
		tagOffsetEnd = tagOffsetStart + headerLength;
		
		sizeOfFrames = headerLength - 10; // not including 10-byte initial header
		if (id3v2FlagsIsFooter) {
			sizeOfFrames -= 10; // footer takes last 10 bytes of ID3v2 header, after frame data, before audio
		}
		

		if (sizeOfFrames > 0) {
			frameDataOrig = file.readAll(); // read all frames from file into frameData variable
			file.close();
			frameData = frameDataOrig.toString().substring(0,sizeOfFrames); // read all frames from file into frameData variable
			frameDataOrig.truncate(sizeOfFrames);
			if (!id3v2FlagsUnsynch && (id3v2MajorVersion <= 3)) {
				frameData = this.DeUnsynchronise(frameData);
			}

			frameDataOffset = 10; // how many bytes into the stream - start from after the 10-byte header
			//    Extended Header
	// 		if (!empty($thisfile_id3v2_flags['exthead'])) {
	// 			...
	// 		}
		
			while( frameData.length > 0) {
				
	// 			if (strlen(frameData) <= $this->ID3v2HeaderLength(id3v2MajorVersion)) {....}
				if (id3v2MajorVersion == 2) {
					// Frame ID  $xx xx xx (three characters)
					// Size      $xx xx xx (24-bit integer)
					// Flags     $xx xx

					frameHeader = frameData.substring(0, 6); // take next 6 bytes for header
					frameData   = frameData.substring(6);    // and leave the rest in frameData
					imageFrameDataTotalOffset += 6;
					frameName   = frameHeader.substring(0, 3);
					frameSize   = this.BigEndian2Int(frameHeader.substring(3, 6), 0);
					frameFlags  = 0; // not used for anything in ID3v2.2, just set to avoid E_NOTICEs

				} else if (id3v2MajorVersion > 2) {
					// Frame ID  $xx xx xx xx (four characters)
					// Size      $xx xx xx xx (32-bit integer in v2.3, 28-bit synchsafe in v2.4+)
					// Flags     $xx xx
					frameHeader = frameData.substring(0, 10); // take next 10 bytes for header
					frameData    = frameData.substring(10);    // and leave the rest in frameData
					imageFrameDataTotalOffset += 10;
					frameName = frameHeader.substring(0, 4);
					if (id3v2MajorVersion == 3) {
						frameSize = this.BigEndian2Int(frameHeader.substring(4, 8), 0); // 32-bit integer
					} else { // ID3v2.4+
						frameSize = this.BigEndian2Int(frameHeader.substring( 4, 8), 1); // 32-bit synchsafe integer (28-bit value)
					}

					if (frameSize < (frameData.length + 4)) {
						nextFrameID = frameData.substring(frameSize, frameSize+4);
						if (this.IsValidID3v2FrameName(nextFrameID, id3v2MajorVersion)) {
							// next frame is OK
						} else if ((frameName == "\x00"+'MP3') || (frameName == "\x00\x00"+'MP') || (frameName == ' MP3') || (frameName == 'MP3e')) {
							// MP3ext known broken frames - "ok" for the purposes of this test
						} 
						else if (id3v2MajorVersion == 4) {
							var ofst = this.BigEndian2Int(frameHeader.substring(4, 8), 0);
							if (this.IsValidID3v2FrameName(frameData.substring(ofst, ofst+4), 3)) {
	// 							$info['warning'][] = 'ID3v2 tag written as ID3v2.4, but with non-synchsafe integers (ID3v2.3 style). Older versions of (Helium2; iTunes) are known culprits of this. Tag has been parsed as ID3v2.3';
								id3v2MajorVersion = 3;
								frameSize = this.BigEndian2Int(frameHeader.substring(4, 8), 0); // 32-bit integer
							}
						}

					}

					frameFlags = this.BigEndian2Int(frameHeader.substring( 8, 10),0);
				}

				if (((id3v2MajorVersion == 2) && (frameName == "\x00\x00\x00")) || (frameName == "\x00\x00\x00\x00")) {
					// padding encountered

					id3v2PaddingStart  = frameDataOffset;
					id3v2PaddingLength = frameHeader.length + frameData.length;
					id3v2PaddingValid  = true;

					len = frameData.length;
					for (i = 0; i < len; i++) {
						if (frameData[i] != "\x00") {
							id3v2PaddingValid = false;
							id3v2PaddingErrorpos = id3v2PaddingStart + i;
	// 						$info['warning'] = 'Invalid ID3v2 padding found at offset '.id3v2Padding['errorpos'].' (the remaining '.(id3v2Padding['length'] - $i).' bytes are considered invalid)';
							break;
						}
					}
					break; // skip rest of ID3v2 header
				}

				if (frameName == 'COM ') {
					frameName = 'COMM';
				}

				if ((frameSize <= frameData.length) && (this.IsValidID3v2FrameName(frameName, id3v2MajorVersion))) {
					parsedFrameFrameName     = frameName;
					parsedFrameFrameFlagsRaw = frameFlags;
					parsedFrameData          = frameData.substring(0, frameSize);
					parsedFrameDataLength    = parseInt(frameSize);
					parsedFrameDataOffset    = frameDataOffset;

					frameDataStart = this.ParseID3v2Frame(id3v2MajorVersion, parsedFrameFrameName, parsedFrameFrameFlagsRaw, parsedFrameData, parsedFrameDataLength, parsedFrameDataOffset);
					if ( frameDataStart != 0 ) {
						break;
					}
	// 				$thisfile_id3v2[frameName][] = $parsedFrame;

					frameData = frameData.substring(frameSize);
					imageFrameDataTotalOffset += frameSize;
				}
			}
		}
		
		
		pixmap = new QPixmap();
		
		if ( frameDataStart != 0 ) {
			rawData = frameDataOrig.mid(imageFrameDataTotalOffset+frameDataStart);
			pixmap.loadFromData(rawData);
		}
		return pixmap;
	}

	/**
	 * ID3v2 frame data parsing.
	 * Simplified function to return the offset of the binary data.
	 * 
	 * @function ParseID3v2Frame() 
	 * @file getid3/module.tag.id3v2.php
	 * @line 532 
	 */
	this.ParseID3v2Frame = function(id3v2MajorVersion, frameName, frameFlagsRaw, data, dataLength, dataOffset) {

			if (((id3v2MajorVersion >= 3) && (frameName == 'APIC')) || // 4.14  APIC Attached picture
					((id3v2MajorVersion == 2) && (frameName == 'PIC'))) {     // 4.15  PIC  Attached picture
				//   There may be several pictures attached to one file,
				//   each in their individual 'APIC' frame, but only one
				//   with the same content descriptor
				// <Header for 'Attached picture', ID: 'APIC'>
				// Text encoding      $xx
				// ID3v2.3+ => MIME type          <text string> $00
				// ID3v2.2  => Image format       $xx xx xx
				// Picture type       $xx
				// Description        <text string according to encoding> $00 (00)
				// Picture data       <binary data>

				frameOffset = 0;
				frameTextEncoding = data.substring(frameOffset, 1 + frameOffset++).charCodeAt(0);
				
	// 			if (((id3v2MajorVersion <= 3) && (frameTextEncoding > 1)) || ((id3v2MajorVersion == 4) && (frameTextEncoding > 3))) {
	// 				$info['warning'][] = 'Invalid text encoding byte ('.frameTextEncoding.') in frame "'.frameName.'" - defaulting to ISO-8859-1 encoding';
	// 			}

				if (id3v2MajorVersion == 2 && data.length > frameOffset) {
					frameImageType = data.substring(frameOffset, frameOffset+3);
					if (strtolower(frameImageType) == 'ima') {
						// complete hack for mp3Rage (www.chaoticsoftware.com) that puts ID3v2.3-formatted
						// MIME type instead of 3-char ID3v2.2-format image type  (thanks xbhoffØpacbell*net)
						frameTerminatorPos = data.indexOf("\x00", frameOffset);
						
						frameMimetype = data.substring(frameOffset, frameTerminatorPos);
						if (frameMimetype.charCodeAt(0) === 0) {
							frameMimetype = '';
						}
						frameImageType = strtoupper(str_replace('image/', '', strtolower(frameMimetype)));
						if (frameImageType == 'JPEG') {
							frameImageType = 'JPG';
						}
						frameOffset = frameTerminatorPos + "\x00".length;
					} else {
						frameOffset += 3;
					}
				}
				if (id3v2MajorVersion > 2 && data.length > frameOffset) {
					frameTerminatorPos = data.indexOf("\x00", frameOffset);
					frameMimetype = data.substring(frameOffset, frameTerminatorPos);
					if (frameMimetype.charCodeAt(0) === 0) {
						frameMimetype = '';
					}
					frameOffset = frameTerminatorPos + "\x00".length;
				}

				framePictureType = data.substring(frameOffset++, 1+frameOffset++).charCodeAt(0);

				if (frameOffset >= parsedFrameDataLength) {
	// 				$info['warning'][] = 'data portion of APIC frame is missing at offset '.($parsedFrame['dataoffset'] + 8 + frameOffset);
				} else {
					textEncodingTerminator = this.TextEncodingTerminatorLookup(frameTextEncoding);
					frameTerminatorPos = data.indexOf(textEncodingTerminator, frameOffset);
					if (data.substring(frameTerminatorPos + textEncodingTerminator.length,frameTerminatorPos + textEncodingTerminator.length+1).charCodeAt(0)=== 0) {
						frameTerminatorPos++; // strpos() fooled because 2nd byte of Unicode chars are often 0x00
					}
	// 				... Other unused meta parsing

					return (frameTerminatorPos + textEncodingTerminator.length);
				}

			}
			return 0;
	}

	/**
	 * Remove Unsynchronisation.
	 * 
	 * Unsynchronisation, in ID3v2.4.0, [S:6.1] is done on frame level, instead
	 * of on tag level, making it easier to skip frames, increasing the streamability
	 * of the tag. The unsynchronisation flag in the header [S:3.1] indicates that
	 * there exists an unsynchronised frame, while the new unsynchronisation flag in
	 * the frame header [S:4.1.2] indicates unsynchronisation.
	 * 
	 * @function DeUnsynchronise() 
	 * @file getid3/module.tag.id3v2.php
	 * @line 1954
	 */
	this.DeUnsynchronise = function($data) {
		var find = "\xFF\x00";
		var reg = new RegExp(find, 'g');

		return $data.replace(reg, "\xFF");
	}
	
	/**
	 * Text Encoding Terminator Lookup.
	 * 
	 * @function TextEncodingTerminatorLookup() 
	 * @file getid3/module.tag.id3v2.php
	 * @line 3343
	 */
	this.TextEncodingTerminatorLookup = function($encoding) {
		// http://www.id3.org/id3v2.4.0-structure.txt
		// Frames that allow different types of text encoding contains a text encoding description byte. Possible encodings:
		$TextEncodingTerminatorLookup = new Array();
		$TextEncodingTerminatorLookup[0]   = "\x00";     // $00  ISO-8859-1. Terminated with $00.
		$TextEncodingTerminatorLookup[1]   = "\x00\x00"; // $01  UTF-16 encoded Unicode with BOM. All strings in the same frame SHALL have the same byteorder. Terminated with $00 00.
		$TextEncodingTerminatorLookup[2]   = "\x00\x00"; // $02  UTF-16BE encoded Unicode without BOM. Terminated with $00 00.
		$TextEncodingTerminatorLookup[3]   = "\x00";     // $03  UTF-8 encoded Unicode. Terminated with $00.
		$TextEncodingTerminatorLookup[255] = "\x00\x00";
		
		return ( typeof $TextEncodingTerminatorLookup[$encoding] != 'undefined' ? $TextEncodingTerminatorLookup[$encoding] : '');
	}

	/**
	 * Validate Frame Name.
	 * 
	 * @function IsValidID3v2FrameName() 
	 * @file getid3/module.tag.id3v2.php
	 * @line 3369
	 */
	this.IsValidID3v2FrameName = function($framename, $id3v2majorversion) {
		switch ($id3v2majorversion) {
			case 2:
				return $framename.match(/[A-Z][A-Z0-9]{2}/);
				break;

			case 3:
			case 4:
				return $framename.match(/[A-Z][A-Z0-9]{3}/);
				break;
		}
		return false;
	}
	
	/**
	 * Convert Big Endian to Integer.
	 * 
	 * @function BigEndian2Int() 
	 * @file getid3/getid3.lib.php
	 * @line 262
	 */
	this.BigEndian2Int = function ($byteword,$synchsafe) {
		$intvalue = 0;
		$bytewordlen = $byteword.length;
		if ($bytewordlen == 0) {
			return false;
		}

		for ($i = 0; $i < $bytewordlen; $i++) {
			// disregard MSB, effectively 7-bit bytes
			$intvalue += ($byteword.charCodeAt($i) & 0x7F) * Math.pow(2, ($bytewordlen - 1 - $i) * 7);
		}

		return parseInt($intvalue);
	}
}

hasAccess = function(handler) {
	switch(handler) {
		case "/img/cover/current":
		case "/img/cover/playlist":
		case "/img/cover/collection":
		case "/current-track":
		case "/playlist":
		case "/collection/artists":
		case "/collection/genres":
		case "/collection/artist/album":
		case "/collection/artist/tracks":
		case "/collection/artist":
		case "/collection":
		case "/index.html":
		case "/api/auth/loginGuest":
		case "/api/auth/loginDj":
		case "/api/getState":
		case "/api/getCurrentTrack":
		case "/api/getPlaylistTrackCover":
		case "/api/getPlaylist":
		case "/api/cmd/addMedia":
		case "/api/getCollectionAllArtists":
		case "/api/getCollectionTracksByArtistId":
		case "/api/getCollectionAlbumsByArtistId":
		case "/api/getCollectionSearchAll":
			return true;
			break;
	}
	return (USER_MODE == USER_MODE_DJ);
}
