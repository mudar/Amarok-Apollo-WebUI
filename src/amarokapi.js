/*
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

Importer.loadQtBinding("qt.gui");
Importer.include("httpserver.js");
Importer.include("util.js");
Importer.include("fileio.js");


// Amarok.stopScript("amarok-apollo");Amarok.runScript("amarok-apollo");

getServerVersionJSON = function(path){
	response = new HandlerResponse(true);
	response.append('{"status":"OK","serverVersion":'+SERVERVERSION+'}');
	return response;
}

getCollectionInfoJSON = function(path) {
	response = new HandlerResponse(true);
	
	info = '';
	info += '"totalTracks":' +  getTotalTracks();
	info += ',"totalArtists":' +  getTotalArtists();
	info += ',"totalAlbums":' +  getTotalAlbums();
	info += ',"totalGenres":' +  getTotalGenres();
	info += ',"lastUpdateDate":' +  getLastUpdateDate();
	
	response.append('{"status":"OK","results":{'+info+'}}');
	return response;
}

getStateJSON = function(path){
	response = new HandlerResponse(true);
	response.append('{"status":"OK",' + appendPlaybackInfo() + '}');
	return response;
}

getGuestCountdown = function(path){
	interval = readConfigV( 'guestInterval', DEFAULT_GUEST_INTERVAL );
	
	response = new HandlerResponse(true);
	nextSubmitTime = ( interval == 0 ? 0 : getNextSubmitTime() );
	response.append('{"status":"OK","results":{"interval":'+interval+',"nextSubmitTime":'+nextSubmitTime+'}}');
	return response;
}

getCurrentTrackJSON = function(path){
	response = new HandlerResponse(true);
	
	length = Amarok.Engine.currentTrack().length;
	
	// 	var currentTrack = '"id":' + Amarok.Engine.currentTrack().id + ',';
	var currentTrack = '"title":"' + jsonEscape(Amarok.Engine.currentTrack().title) + '",';
	currentTrack += '"artist":"' + jsonEscape(Amarok.Engine.currentTrack().artist) + '",';
	currentTrack += '"album":"' + jsonEscape(Amarok.Engine.currentTrack().album) + '",';
	currentTrack += '"length":' + length + ',';
	currentTrack += '"position":' + Amarok.Engine.trackPositionMs() + ',';
	currentTrack += '"cover":"/getCurrentCover"';
	
	response.append('{"status":"OK","currentTrack":{'+currentTrack+'}}');
	return response;
}

getPlaylistJSON = function(path){
	response = new HandlerResponse(true);
	tracks = "";
	var totalTrackCount = Amarok.Playlist.totalTrackCount();
	for(trackidx=0; trackidx<totalTrackCount; trackidx++){
		t = Amarok.Playlist.trackAt(trackidx);
		if(t.artist=="") tmpArtist = "---";
		else tmpArtist = jsonEscape(t.artist);
		
		if(t.title=="") tmpTitle = "---";
		else tmpTitle = jsonEscape(t.title);
		
		if(t.album=="") tmpAlbum = " ";
		else tmpAlbum = jsonEscape(t.album);
		
		var track = '"order":'+ trackidx + ',';
		track += '"title":"'+ tmpTitle + '",';
		track += '"artist":"'+ tmpArtist + '",';
		track += '"album":"'+ tmpAlbum + '",';
		track += '"cover":"/getPlaylistTrackCover/'+trackidx+'"';
		tracks += '{' + track + '}';	
		if ( trackidx + 1 < totalTrackCount )
			tracks += ',';
	}
	
	response.append('{"status":"OK","count":'+totalTrackCount+',"results":['+tracks+']}');
	return response;
}

cmdRemoveByIndex = function(path){
    var index = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(index) ) { index = 0; }
	
	response = removeByIndex(index);
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"playlist/removeByIndex","args":{"index":'+index+'},"results":{"totalTrackCount":'+Amarok.Playlist.totalTrackCount()+'}}');
	return response;
}

cmdPlaylistClear = function(path){
	response = clearPlaylist();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"playlist/clearPlaylist"}');
	return response;
}

cmdPrev = function(path){
	response = prevTrack();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"prev",' + appendPlaybackInfo() + '}');
	return response;
}



cmdNext = function(path){
	
	response = nextTrack();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"next",' + appendPlaybackInfo() + '}');
	return response;
}

cmdPlay = function(path){
	
	response = play();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"play",' + appendPlaybackInfo() + '}');
	return response;
}

cmdPause = function(path){
	
	response = pause();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"pause",' + appendPlaybackInfo() + '}');
	return response;
}

cmdPlayPause = function(path){
	
	var state = ENGINE_STATE_PLAY;
	if(getEngineState() == ENGINE_STATE_PLAY)
		state = ENGINE_STATE_PAUSE;
	
	response = playPause();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"playPause",' + appendPlaybackInfo() + '}');
	return response;
}

cmdStop = function(path){
	response = stop();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"stop",' + appendPlaybackInfo() + '}');
	return response;
}

cmdVolumeUp = function(path){
	var step = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(step) ) { step = getVolumeStep(); }
	
	response = incVolume(step);
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"increaseVolume","args":{"ticks":'+step+'},' + appendPlaybackInfo() + '}');
	return response;
}

cmdVolumeDown = function(path){
	var step = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(step) ) { step = getVolumeStep(); }
	
	response = decVolume(step);
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"decreaseVolume","args":{"ticks":'+step+'},' + appendPlaybackInfo() + '}');
	return response;
}

cmdVolumeSet = function(path){
	var volume = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(volume) ) { volume = 0; }

	Amarok.Engine.volume = volume;
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"setVolume","args":{"volume":'+volume+'},' + appendPlaybackInfo() + '}');
	return response;
}

cmdMute = function(path){
	response = new mute();
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"mute",' + appendPlaybackInfo() + '}');
	return response;
}

cmdPlayByIndex = function(path){
    var index = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(index) ) { index = 0; }
	
    response = playByIndex(index);
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"playlist/playByIndex","args":{"index":'+index+'},' + appendPlaybackInfo() + '}');
	return response;
}

cmdSetPosition = function(path){
    var position = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(position) ) { position = 0; }
	
	seek(position);
	
	response = response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"seek","args":{"positionMS":'+position+'}}');
	return response;
}

cmdCollectionPlayByTrackId = function(path){
    trackId = parseInt(path.substring(path.lastIndexOf("/")+1));

    trackURL = Amarok.Collection.query('SELECT rpath FROM urls LEFT JOIN tracks ON urls.id = tracks.url WHERE tracks.id = '+trackId+';');
    trackURL2 = Amarok.Collection.query('SELECT lastmountpoint FROM devices LEFT JOIN (urls LEFT JOIN tracks ON urls.id = tracks.url) ON devices.id = urls.deviceid WHERE tracks.id = '+trackId+';');
	
	var media = null;
	if ( trackURL.length > 0 && trackURL2.length > 0 ) {
		media = trackURL2[0] + trackURL[0].substring(1);
		Amarok.Playlist.addMedia(new QUrl('file://'+ media ));
		var timerObject = new QObject();
		timerObject.event = function(qevent) {
			Amarok.Playlist.playByIndex(Amarok.Playlist.totalTrackCount()-1);
			this.killTimer(timerObject.timerID);
		}
		timerObject.timerID = timerObject.startTimer(250);	// 250 milliseconds
		media = jsonEscape(media);
	}

	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"playlist/addPlayMedia","args":{"trackId":'+trackId+'},"results":{"media":'+(media==null?'null':'"'+media+'"')+'},' + appendPlaybackInfo() + '}');
	return response;
}

cmdCollectionEnqueue = function(path) {
	// Check if Guest Countdown has expired
	if ( USER_MODE == USER_MODE_GUEST ) {
		tryLaterResponse = checkGuestCountdown();
		if ( tryLaterResponse != null ) {
			return tryLaterResponse;
		}
	}
	
    req_splitted = path.split("/");
	req_len = req_splitted.length;

	var tracksId = '';
	var medias = '';
    for(i = 4; i < req_len; i++) {
		trackId = req_splitted[i];
		trackURL = Amarok.Collection.query('SELECT rpath FROM urls LEFT JOIN tracks ON urls.id = tracks.url WHERE tracks.id = '+trackId+';');
		trackURL2 = Amarok.Collection.query('SELECT lastmountpoint FROM devices LEFT JOIN (urls LEFT JOIN tracks ON urls.id = tracks.url) ON devices.id = urls.deviceid WHERE tracks.id = '+trackId+';');
		
		if ( trackURL.length > 0 && trackURL2.length > 0 ) {
			media = trackURL2[0] + trackURL[0].substring(1);
			Amarok.Playlist.addMedia(new QUrl('file://'+ media));
			media = jsonEscape(media);
			medias += '"'+media+'"';
		}
		else {
			medias += 'null';
		}
		
		tracksId += trackId;
		if ( i + 1 < req_len ) {
			medias += ',';
			tracksId += ',';
		}
    }
    
    // Reset Guest Countdown
	if ( ( USER_MODE == USER_MODE_GUEST ) || GUEST_RESET_AFTER_DJ ) {
		updateLastSubmitTime();
	}

	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"playlist/addMedia","args":{"tracksId":['+tracksId+']},"results":{"medias":['+medias+']}}');
	return response;
}

checkGuestCountdown = function() {
	if ( getNextSubmitTime() > (new Date()).getTime() ) {
		response = new HandlerResponse(true);
		response.append('{"status":"fail","cmd":"playlist/addMedia","error":{"code":'+ERROR_CODE_GUEST_COUNTDOWN+', "description":"error_guest_countdown"}}');
		return response;
	}
	return null;
}

cmdSetRating = function(path){
    var rating = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(rating) ) { rating = 0; }
	
	Amarok.Engine.currentTrack().rating = rating;
	
	response = new HandlerResponse(true);
	response.append('{"status":"OK","cmd":"setRating","args":{"rating":'+rating+'},"results":{"rating":'+Amarok.Engine.currentTrack().rating+'}}');
	return response;
}

getCollectionAllArtistsJSON = function(path){
    response = new HandlerResponse(true);
    artists = "";
    artistsQuery = Amarok.Collection.query("SELECT name, id FROM artists ORDER BY name;");
    nbArtists = artistsQuery.length;
    for(artistidx=0; artistidx<nbArtists; artistidx++){		 
		artist = artistsQuery[artistidx++];
		artistId = artistsQuery[artistidx];
		if (artist.length>0){
			artists += '{"id":' + artistId + ',"name":"' + jsonEscape(artist) + '"}';
			if (artistidx+1<nbArtists) {
			  artists += ",";
			}
		}
    }
    response.append('{"status":"OK","count":'+(nbArtists / 2 )+',"results":['+artists+']}');
      
    return response;
}

getCollectionAllAlbumsJSON = function(path){
    response = new HandlerResponse(true);
    albums = "";
    albumsQuery = Amarok.Collection.query("SELECT name, id, artist FROM albums ORDER BY name, artist");
    nbAlbums = albumsQuery.length;
	totalAlbums = 0;
    for(albumidx=0; albumidx<nbAlbums; albumidx++){		 
		album = albumsQuery[albumidx++];
		albumId = albumsQuery[albumidx++];
		artistId = albumsQuery[albumidx];
		artistId = ( artistId == '' ? 'null' : artistId );
		if (album.length>0){
			albums += '{"id":' + albumId + ',"name":"' + jsonEscape(album) + '","artistId":' + artistId + '}';
			if (albumidx+1<nbAlbums) {
			  albums += ",";
			}
			totalAlbums++;
		}
    }
    response.append('{"status":"OK","count":'+totalAlbums+',"results":['+albums+']}');
      
    return response;
}

getCollectionAllGenresJSON = function(path){
    response = new HandlerResponse(true);
    genres = "";
    genresQuery = Amarok.Collection.query("SELECT name, id FROM genres ORDER BY name;");
    nbGenres = genresQuery.length;
	totalGenres = 0;
    for(genreidx=0; genreidx<nbGenres; genreidx++){		 
		genre = genresQuery[genreidx++];
		genretId = genresQuery[genreidx];
		if (genre.length>0){
			genres += '{"id":' + genretId + ',"name":"' + jsonEscape(genre) + '"}';
			if (genreidx+1<nbGenres) {
			  genres += ",";
			}
			totalGenres++;
		}
    }
    response.append('{"status":"OK","count":'+totalGenres+',"results":['+genres+']}');
      
    return response;
}


getCollectionTracks = function(artistId, rowCount, offset){
	offset = parseInt( offset );
	rowCount = parseInt( rowCount );
	
	if ( isNaN(offset) ) { offset = 0; }
	if ( isNaN(rowCount) ) { rowCount = 500; }
	
	sqlFilter = '';
	sqlLimit = '';
	responseArgs = '';

	if ( artistId == 'all' ) {
		sqlFilter = '';
	}
	else {
		if ( isNaN(artistId) ) { 
			artistId = 0;
		}
		sqlFilter = ' AND t.artist = '+artistId + ' ';
		responseArgs = '"artistId":'+ artistId;
	} 

	if ( rowCount != -1 ) {
		sqlLimit = ' LIMIT ' + rowCount;
		responseArgs += ( responseArgs == '' ? '' : ',' ) + '"rowCount":'+ rowCount;

		sqlLimit += " OFFSET " + offset;
		responseArgs += ',"offset":' + offset;
	}
	
	if ( responseArgs != '' ) {
		responseArgs = '"args":{'+responseArgs+'},';
	}
	
	columns = 't.id, t.title, y.name AS year, t.length, t.tracknumber, t.createdate, t.modifydate, t.artist AS artistId, t.album AS albumId, t.genre AS genreId';
	nbColums = 10;

	unlimitedCount = '';
	if ( sqlLimit != '' ) {
		trackQuery = Amarok.Collection.query('SELECT t.id FROM tracks AS t LEFT JOIN years AS y ON t.year = y.id WHERE 1 ' + sqlFilter );
		unlimitedCount = '"totalCount":'+trackQuery.length+',';
	}

	trackQuery = Amarok.Collection.query('SELECT ' + columns + ' FROM tracks AS t LEFT JOIN years AS y ON t.year = y.id WHERE 1 ' + sqlFilter + " ORDER BY t.id " + sqlLimit );
    trackCount = trackQuery.length;
    var tracks = '';

    for(trackidx = 0; trackidx < trackCount; trackidx = trackidx+nbColums){
		
		trackId = trackQuery[trackidx];
		trackTitle = trackQuery[trackidx+1];
		year = trackQuery[trackidx+2];
		length = trackQuery[trackidx+3];
		trackNumber = trackQuery[trackidx+4];
		createDate = trackQuery[trackidx+5];
		modifyDate = trackQuery[trackidx+6];
		artistId = trackQuery[trackidx+7];
		albumId = trackQuery[trackidx+8];
		genreId = trackQuery[trackidx+9];

		if ( isNaN( year) ) year = 0;
		if ( isNaN( length ) ) length = 0;
		if ( isNaN(trackNumber) ) trackNumber = 0;

		var track = '"id":' + trackId + ',';
		track += '"title":' + ( trackTitle == "" ? 'null' : '"' +jsonEscape(trackTitle) + '"' ) + ',';
		track += '"artistId":' + ( artistId <= 0 ? 'null' : artistId ) + ',';
		track += '"albumId":' + ( albumId <= 0 ? 'null' : albumId ) + ',';
		track += '"genreId":' + ( genreId <= 0 ? 'null' : genreId ) + ',';
		track += '"year":' + ( year <= 0 ? 'null' : year ) + ',';
		track += '"length":' + ( length <= 0 ? 'null' : length ) + ',';
		track += '"track":' + ( trackNumber <= 0 ? 'null' : trackNumber ) + ',';
		track += '"dateCreated":' + createDate + ',';
		track += '"dateModified":' + modifyDate; // + ',';
// 		track += '"cover":null';

		tracks += '{' + track + '}';	
		if ( trackidx + nbColums < trackCount ) {
			tracks += ',';
		}
    }

    response = new HandlerResponse(true);
	response.append('{"status":"OK","count":'+(trackCount/nbColums)+',' + unlimitedCount + responseArgs + '"results":['+tracks+']}');

    return response
}

getCollectionAllTracksJSON = function(path){
	
	limit = path.substring(path.lastIndexOf("/")+1);

	if ( limit != null && limit.length > 0 ) {
		limit += ',';
		args = limit .split(",");
		return getCollectionTracks( 'all' , args[0], args[1] );
	}
	else {
		return getCollectionTracks( 'all' , 500 , 0 );
	}
}

getCollectionTracksByArtistIdJSON = function(path){
    artistId = parseInt(path.substring(path.lastIndexOf("/")+1));
	if ( isNaN(artistId) ) { artistId = 0; }
	
	return getCollectionTracks( artistId );
}

getCollectionAlbumsByArtistIdJSON = function(path){
    artistId = parseInt(path.substring(path.lastIndexOf("/")+1));
    albumQuery = Amarok.Collection.query('SELECT b.id, b.name AS album, a.name AS artist, COUNT(t.id) AS total_tracks FROM albums AS b JOIN artists AS a ON a.id = b.artist LEFT JOIN tracks as t ON t.album = b.id WHERE a.id = '+artistId+' GROUP BY b.id;');
    albumCount = albumQuery.length;
    var albums = '';
	
    for(albumidx = 0; albumidx < albumCount; albumidx = albumidx+4){
		albumId = albumQuery[albumidx];
		albumName = albumQuery[albumidx+1];
		artistName = albumQuery[albumidx+2];
		albumTracks = albumQuery[albumidx+3];

		if(albumName=="") albumName = "---";
		if(artistName=="") artistName = "---";
		album = '';

		var album = '"id":' + albumId + ',';
		album += '"album":"' + jsonEscape(albumName) + '",';
		album += '"artist":"' + jsonEscape(artistName) + '",';
		album += '"countTracks":' + albumTracks + ',';
		album += '"cover":null';

		albums += '{' + album + '}';	
		if ( albumidx + 4 < albumCount ) {
			albums += ',';
		}
    }
        
    response = new HandlerResponse(true);
	response.append('{"status":"OK","count":'+(albumCount/4)+',"args":{"artistId":'+ artistId +'},"results":['+albums+']}');
	
    return response
}

getCollectionSearchAllJSON = function(path){
	
	queryString = decodeURIComponent(path.substring(path.lastIndexOf("/")+1));
	
    response = new HandlerResponse(true);

	resultArtists = resultAlbums = resultTracks = '';
	countArtists = countAlbums = countTracks = 0;
	
	/**
	 * Search for Artists
	 */
    searchQuery = Amarok.Collection.query(
		'SELECT id, name ' +
		'FROM artists ' +
		'WHERE UPPER(name) LIKE UPPER("%' + queryString + '%") ' + 
		'ORDER BY name '
	);
	
	countArtists = searchQuery.length;
    for (artistIdx = 0; artistIdx < countArtists; artistIdx = artistIdx+2) {
		artistId = searchQuery[artistIdx];
		artistName = searchQuery[artistIdx+1];

		var artist = '"id":' + artistId + ',';
		artist += '"name":"' + jsonEscape(artistName) + '",';
		artist += '"cover":null';

		resultArtists += '{' + artist + '}';	
		if ( artistIdx + 2 < countArtists ) {
			resultArtists += ',';
		}
    }
    countArtists = countArtists/2;
    
	/**
	 * Search for Albums
	 */
    searchQuery = Amarok.Collection.query(
		'SELECT b.id, b.name, a.name AS artist ' +
		'FROM albums AS b  ' +
		'LEFT JOIN artists AS a ON b.artist = a.id ' +
		'WHERE UPPER(b.name) LIKE UPPER("%' + queryString + '%") ' + 
		'ORDER BY b.name , artist '
	);
	
	countAlbums = searchQuery.length;
    for (albumIdx = 0; albumIdx < countAlbums; albumIdx = albumIdx+3) {
		artistId = searchQuery[albumIdx];
		albumName = searchQuery[albumIdx+1];
		artistName = searchQuery[albumIdx+2];
		
		if(artistName=="") artistName = "---";
		
		var album = '"id":' + artistId + ',';
		album += '"name":"' + jsonEscape(albumName) + '",';
		album += '"artist":"' + jsonEscape(artistName) + '",';
		album += '"cover":null';

		resultAlbums += '{' + album + '}';	
		if ( albumIdx + 3 < countAlbums ) {
			resultAlbums += ',';
		}
    }
    countAlbums = countAlbums/3;
	
	/**
	 * Search for Tracks
	 */
	searchQuery = Amarok.Collection.query(
		'SELECT tracks.id, tracks.title, albums.name, artists.name ' +
		'FROM tracks ' +
		'LEFT JOIN artists ON tracks.artist = artists.id ' +
		'LEFT JOIN albums ON tracks.album = albums.id ' +
		'WHERE UPPER(tracks.title) LIKE UPPER("%' + queryString + '%") ' + 
		'ORDER BY tracks.title '
	);
	
	countTracks = searchQuery.length;
    for(trackidx = 0; trackidx < countTracks; trackidx = trackidx+4){
		
		trackId = searchQuery[trackidx];
		trackTitle = searchQuery[trackidx+1];
		artistName = searchQuery[trackidx+2];
		albumName = searchQuery[trackidx+3];
		
		if(trackTitle=="") trackTitle = "---";
		if(artistName=="") artistName = "---";
		if(albumName=="") albumName = "---";

		var track = '"id":' + trackId + ',';
		track += '"title":"' + jsonEscape(trackTitle) + '",';
		track += '"artist":"' + jsonEscape(artistName) + '",';
		track += '"album":"' + jsonEscape(albumName) + '",';
		track += '"cover":null';

		resultTracks += '{' + track + '}';	
		if ( trackidx + 4 < countTracks ) {
			resultTracks += ',';
		}
    }
    countTracks = countTracks/4;
	
	/**
	 * Total results
	 */
    countTotal = countArtists + countAlbums + countTracks;
    
    response.append('{"status":"OK","count":'+countTotal+',"args":{"searchQuery":"'+ jsonEscape(queryString) +'"},"results":{"artists":['+resultArtists+'],"albums":['+resultAlbums+'],"tracks":['+resultTracks+']}}');

    return response
}

appendPlaybackInfo = function() {
	playback = '"playback": {"volume":'+getVolume()+',"engineState":'+Amarok.Engine.engineState()+'}';
	return playback;
}
