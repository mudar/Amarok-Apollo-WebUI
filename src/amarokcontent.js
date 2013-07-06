/*
 *    Copyright (C) 2009 by Johannes Wolter <jw@inutil.org>    
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

Importer.loadQtBinding('qt.gui');
Importer.include('httpserver.js');
Importer.include('util.js');
Importer.include('fileio.js');

/**
 * Send the cover image of the track currently playing or paused.
 * Returns 404 if music is stopped.
 */
currentTrackCover = function(path){
    response = new HandlerResponse();
	
    engineState = Amarok.Engine.engineState();
    if(engineState == ENGINE_STATE_PAUSE || engineState == ENGINE_STATE_PLAY){
		if ( Amarok.Engine.currentTrack().imageUrl != '' ) {
			response.setMimeType('image/png');
			response.append(pixmapToPNG(Amarok.Engine.currentTrack().imagePixmap(),false));
		}
		else {
			response.setReturnCode(404, "Not Found");
		}
	}
	else {
		response.setReturnCode(404, "Not Found");
	}
    return response;
}

/**
 * Returns the cover image from a playlist track. The track index is
 * specified in the path between the last '/' and the '?'.
 * 
 * Resized thumbnails are returned if path contains 'thumb'
 */
playlistTrackCover = function(path){
	response = new HandlerResponse();
	
    trackIdx = parseInt(path.substring(path.lastIndexOf('/')+1, path.indexOf('.png')));
	isThumb = (path.indexOf('thumb/') != -1);
	
	if ( Amarok.Playlist.trackAt(trackIdx).imageUrl == '' ) {
		response.setReturnCode(404, "Not Found");
	}
	else {
		response.setMimeType('image/png');
		pixmap = Amarok.Playlist.trackAt(trackIdx).imagePixmap();
		response.append(pixmapToPNG(pixmap, ( isThumb ? THUMB_SIZE : false)));
	}
    return response;
}

/**
 * Return cover image for the specified album.
 */
albumCover = function(path){
	response = new HandlerResponse();
	
	albumId = parseInt(path.substring(path.lastIndexOf('/')+1));
	isThumb = (path.indexOf('thumb/') != -1);
	
	if ( isNaN(albumId )) { response.setReturnCode(404, "Not Found"); return response; }
	
	imageId = Amarok.Collection.query('SELECT image FROM albums WHERE id = '+Amarok.Collection.escape(albumId)+' AND image IS NOT NULL;');
	if ( imageId.length == 0 ) { response.setReturnCode(404, "Not Found"); return response; }
	
	imagePath = Amarok.Collection.query('SELECT path, rpath FROM images LEFT JOIN urls ON images.path = urls.uniqueid WHERE images.id = '+Amarok.Collection.escape(imageId[0]));
	/**
	 * TWEAK: for images with path LIKE 'amarok-sqltrackuid%', the track is added temporarily to the playlist,
	 * then we get the playlist's last item cover before removing the temp item!
	 * Amarok doesn't provide acces to imageUrl except for currentTrack and Playlist tracks...
	 */
	if ( imagePath[0].substring( 0, 18) == 'amarok-sqltrackuid' ) {
		Amarok.Playlist.addMedia(new QUrl('file://'+ '/home' + imagePath[1].substring(1)));
		response =  playlistTrackCover( '/img/cover/playlist/' + (isThumb ? 'thumb/' : '') + (Amarok.Playlist.totalTrackCount() -1)+'.png?t='+(new Date()).getTime());
		Amarok.Playlist.removeByIndex(Amarok.Playlist.totalTrackCount() - 1);
	}
	else {
		response.setMimeType('image/png');
		pixmap = new QPixmap(imagePath[0], '', Qt.AutoColor);
		response.append(pixmapToPNG(pixmap, (isThumb ? THUMB_SIZE : false)));
	}

	response.enableCache();

    return response;
}

/**
 *  Send div with info about the track currently playing.
 */
currentTrackDiv = function(path){
    response = new HandlerResponse();    
    div = '';

	engineState = Amarok.Engine.engineState();
    if(engineState == ENGINE_STATE_PAUSE || engineState == ENGINE_STATE_PLAY){
		div += loadFile('/www/currentTrack.html');
		
//        div = div.replace('###rating###', getRatingHtml());
        div = div.replace('###artist###', Amarok.Engine.currentTrack().artist);
        div = div.replace('###title###', Amarok.Engine.currentTrack().title);
        div = div.replace('###album###', Amarok.Engine.currentTrack().album);
				// convert to seconds
        length = Amarok.Engine.currentTrack().length/1000;
        minutes = Math.floor(length/60);
        seconds = length-(minutes*60);
        if(seconds.toString().length == 1)
            seconds = '0'+seconds
        div = div.replace('###minutes###', minutes);
        div = div.replace('###seconds###', seconds);
        div = div.replace('###coverimg###',
		Amarok.Engine.currentTrack().imageUrl == '' ? '/img/no-cover.png' :
			'/img/cover/current.png?t='+(new Date()).getTime());
		
		/**
		 * Get lyrics from Amarok's DB
		 */
		path = Amarok.Engine.currentTrack().path;
		devicesQuery = Amarok.Collection.query('SELECT lastmountpoint FROM devices');
		nbDevices = devicesQuery.length;
		lyricsSql = 'SELECT lyrics FROM lyrics WHERE 0 ';
		for(i=0; i<nbDevices; i++){
// TODO: check compatibility with Win-Amarok
			lyricsSql += ' OR url = "'+Amarok.Collection.escape(path.replace(devicesQuery[i]+'/','./'))+'"';
		}
		lyricsQuery = Amarok.Collection.query(lyricsSql);
		if ( lyricsQuery.length == 1) {
			div = div.replace('<!--###lyrics###-->', lyricsQuery[0].trim() );
		}
    }
    else {
		div += loadFile('/www/emptyTrack.html');
    }
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html');
    response.append(div);
    return response;
}

/*
function getRatingHtml() {
  var rating = currentTrack().rating, result = '<div>'
  for (var i=1; i <= 10; i++) {
    var star = rating >= i ? 'star' : 'star_3'
    // The Dolphin browser for android won't trigger an onclick event on an image
//     result += '<img src="/' + star + '.png" onclick="setRating(' + i + ')" />';
    result += '<span onclick="setRating(' + i + '); return false;">' +
              '<img src="/' + star + '.png" /></span>'
    if (i == 5) result += '</div><div>';
  }
  return result + '</div>'
}
*/

function currentTrack() {
  return Amarok.Engine.currentTrack()
}

/**
 *  Send div with info about the track currently playing.
 */
/*
function ratingDiv(path){
    var track = currentTrack(),
        newRating = parseInt(path.substring(path.lastIndexOf('/')+1));
    if (track.rating == newRating) newRating = 0
    track.rating = newRating
    response = new HandlerResponse();    
    response.append(getRatingHtml());
    return response;
}
*/

/**
 *  Send div for the current playlist.
 */
playlistDiv = function(path){
    response = new HandlerResponse();
	div = loadFile('/www/playlist.html');
	nbTracks = Amarok.Playlist.totalTrackCount();
	if ( nbTracks == 0 ) {
		div = div.replace('###tracks###', '<li class="empty">Playlist is empty&hellip;</li>');
	}
	else {
		current = Amarok.Playlist.activeIndex();
		tracks = '';
		randColor = -1;	// initialize variable. Will be incremented to 0 for the first coverless album
		prevArtist = '';
		for(trackidx=0; trackidx<Amarok.Playlist.totalTrackCount(); trackidx=trackidx+1){
			t = Amarok.Playlist.trackAt(trackidx);
			tracks += '<li class="track'+(current == trackidx ? ' ui-btn-active' : '' )+'"><a href="#" data-amarok-track-id="'+trackidx+'"><img ';
			if ( t.imageUrl != '' ) {
				tracks += 'src="/img/cover/playlist/thumb/'+trackidx+'.png?t='+(new Date()).getTime() +'"'
			}
			else {
				if ( prevArtist != t.artist ) {
					// Change color when different artist
					prevArtist = t.artist;
					randColor++;
				}
				tracks += 'src="/img/no-cover.png" class="color' + randColor +'"';
			}
			tracks += ' alt="" /><p>'+t.artist+'</p>'+t.title+'</a></li>' + LINE_BREAK;
			if ( randColor > 8 ) randColor = 0;
		}
		div = div.replace('###tracks###', tracks);
	}
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html');
    response.append(div);
    return response;
}

/**
 *  Send div with all artists in the collection.
 */
collectionArtistsDiv = function(path){
	var searchQuery = '';
	var argIndex = path.lastIndexOf('/');
	var arg = '';
	if ( argIndex > 0 ) {
		arg = path.substring(argIndex+1, argIndex+2);
		if ( arg == '0' ) {
			searchQuery = ' AND name NOT REGEXP "^[[:alpha:]]"';
			arg = '#'
		}
		else if ( arg.length == 1 ) {
			searchQuery = ' AND name LIKE "'+Amarok.Collection.escape(arg)+'%"';
			arg = arg.toUpperCase();
		}
		else {
			arg = '@#!';
		}
	}

    response = new HandlerResponse();
    div = loadFile('/www/collection.html');
	if ( searchQuery != '' ) {
		artists = '';
		artistsQuery = Amarok.Collection.query('SELECT a.name, a.id, COUNT(t.id) AS total FROM artists AS a LEFT JOIN tracks AS t ON a.id = t.artist WHERE 1 '+searchQuery+' GROUP BY a.id ORDER BY a.name');
		nbArtists = artistsQuery.length;

		if ( nbArtists == 0 ) {
			artists = '<li>No artists found&hellip;</li>';
		}
		else {
			for(artistidx=0; artistidx<nbArtists; artistidx++){		 
				artist = artistsQuery[artistidx++];
				artistId = artistsQuery[artistidx++];
				tracksCount = artistsQuery[artistidx];
				if (artist.length>0){
					artists += '<li><a href="/collection/artist/'+artistId+'">';
					artists += artist;
					if ( tracksCount >= 10 ) {
						artists += '<span class="ui-li-count">'+tracksCount +'</span>';
					}
					artists += '</a></li>'+ LINE_BREAK;
				} 
			}
		}
	}
	else {
		artists = '<li>Collection index error!</li>';
	}
	div = div.replace('<!-- ###query###-->', ' &ndash; '+arg);
	div = div.replace('###artists###', artists);
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html');
    response.append(div);
    return response;
}

/**
 * Send div with all albums from one artist.
 */
collectionArtistAlbumsDiv = function(path){
    artistId = parseInt(path.substring(path.lastIndexOf('/')+1));
	response = new HandlerResponse();
    div = loadFile('/www/collectionArtistAlbums.html');

	artistQuery = Amarok.Collection.query('SELECT a.name, COUNT(t.id) AS total FROM artists AS a LEFT JOIN tracks AS t ON t.artist = a.id WHERE a.id = '+artistId+';')
	if ( artistQuery.length == 2 ) {
		artist = artistQuery[0];
		tracksCount = artistQuery[1];
		
		albums = '<li><a href="/collection/artist/tracks/'+artistId+'">&ndash; All Tracks<span class="ui-li-count">'+tracksCount +'</span></a></li>';
		
		albumsQuery = Amarok.Collection.query('SELECT name, id, image FROM albums WHERE artist = '+artistId+' ORDER BY name;')
		nbAlbums = albumsQuery.length;
		for(albumidx = 0; albumidx<nbAlbums ; albumidx++){
			album = albumsQuery[albumidx++];
			albumId = albumsQuery[albumidx++];
			albumCover = albumsQuery[albumidx];
			if (album.length>0){
				albums += '<li><a href="/collection/artist/album/'+albumId+'">';
				if ( !isNaN( parseInt(albumCover) ) ) {
					albums += '<img src="/img/cover/collection/thumb/'+albumId+'.png" alt="" />';
				}
				else {
					albums += '<img src="/img/no-cover.png" alt="" />';
				}
				albums += album+'</a></li>'+ LINE_BREAK;
			}
		}

		div = div.replace('###artist###', artist);
		div = div.replace('###content###', albums);
	}
	else {
		div = div.replace('###artist###', 'Artist &ndash; @#!');
		div = div.replace('###content###', '<li>Artist not found!</li>');
	}

	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html');
    response.append(div);
    return response;
}

/**
 * Send div with options for a specific album. Currently:
 * -Append tracks from the album to the current playlist.
 * -Replace current playlist with tracks from the album. 
 */
collectionAlbumDiv = function(path){
    albumId = parseInt(path.substring(path.lastIndexOf('/')+1));
	
	albumQuery = Amarok.Collection.query('SELECT name, artist, image FROM albums WHERE id = '+albumId+';');
	albumName = albumQuery[0];
	artistId = albumQuery[1];
	coverId = albumQuery[2];
	
	artistQuery = Amarok.Collection.query('SELECT name FROM artists WHERE id = '+artistId+';');
	artistName = artistQuery[0];
	
	trackQuery = Amarok.Collection.query('SELECT id , title FROM tracks WHERE album = '+albumId+' ORDER BY tracknumber , createdate;');
	tracksDiv = '';
	nbTracks = trackQuery.length;
	for(trackidx = 0; trackidx < nbTracks; trackidx++){
		trackId = trackQuery[trackidx++];
		trackName = trackQuery[trackidx];
		tracksDiv += '<li class="track"><a class="track-add-play" href="#" data-amarok-track-id="'+trackId+'">'+trackName+'</a><a class="track-add" href="#" data-amarok-track-id="'+trackId+'">Play</a></li>'+ LINE_BREAK;
	}
	
	response = new HandlerResponse();
    div = loadFile('/www/collectionAlbum.html');
	
	div = div.replace('Album<!-- ###album###-->', albumName);
	div = div.replace('###artist###', artistName);
	div = div.replace('###tracks###', tracksDiv);	
	
	div = div.replace('###coverimg###',
		coverId == '' ? '/img/no-cover.png' :
		'/img/cover/collection/'+albumId+'.png' );
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html');
    response.append(div);
    return response;
}

/**
 * Send div with options for all tracks of one artist. For
 * the options see "collectionAlbumDiv"
 */
collectionAllArtistTracksDiv = function(path){
    artistId = parseInt(path.substring(path.lastIndexOf('/')+1));
	artistQuery = Amarok.Collection.query('SELECT name FROM artists WHERE id = '+artistId+';');
	artistName = artistQuery[0];
	trackQuery = Amarok.Collection.query('SELECT t.id, t.title, a.id AS albumId, a.name AS albumName, a.image AS coverId FROM tracks AS t LEFT JOIN albums AS a ON a.id = t.album WHERE t.artist = '+artistId+' ORDER BY a.id , t.tracknumber;');
	
	tracksDiv = '';
	prevAlbum = '';
	nbTracks = trackQuery.length;
	for(trackidx = 0; trackidx < nbTracks; trackidx++){
		trackId = trackQuery[trackidx++];
		trackName = trackQuery[trackidx++];
		albumId = trackQuery[trackidx++];
		albumName = trackQuery[trackidx++];
		coverId = trackQuery[trackidx];
		
		if ( albumName == '' ) { albumName = 'Unknown Album'; }
		
		if (  albumName != prevAlbum) {
			tracksDiv += '<li data-role="list-divider"><img '+(coverId == '' ? 'src="/img/no-cover.png" class="no-cover"' :
		'src="/img/cover/collection/thumb/'+albumId + '.png"')+' alt="" /><h2>'+albumName+'</h2></li>'+ LINE_BREAK;
			prevAlbum = albumName ;
		}
		
		tracksDiv += '<li class="track" data-filtertext="'+jsonEscape(albumName+ ' ' + trackName)+'"><a class="track-add-play" href="#" data-amarok-track-id="'+trackId+'">'+trackName+'</a><a class="track-add" href="#" data-amarok-track-id="'+trackId+'">Play</a></li>'+ LINE_BREAK;
	}

	response = new HandlerResponse();
    div = loadFile('/www/collectionAllArtistTracks.html');

	div = div.replace('###artist###', artistName);
	div = div.replace('###tracks###', tracksDiv);	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html');

    response.append(div);
    return response;
}

collectionIndex = function(path) {
    response = new HandlerResponse();
	div = loadFile('/www/header.html') + loadFile('/www/collectionIndex.html') + loadFile('/www/footer.html');	
	response.append(div);
    return response;
}
