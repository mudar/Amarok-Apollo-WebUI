/*
 *    Copyright (C) 2009 by Johannes Wolter <jw@inutil.org>
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
			response.setMimeType('image/jpeg');
			response.append(pixmapToJPEG(Amarok.Engine.currentTrack().imagePixmap(),false));
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
	
    trackIdx = parseInt(path.substring(path.lastIndexOf('/')+1, path.indexOf('.jpg')));
	isThumb = (path.indexOf('thumb/') != -1);
	
	if ( Amarok.Playlist.trackAt(trackIdx).imageUrl == '' ) {
		response.setReturnCode(404, "Not Found");
	}
	else {
		response.setMimeType('image/jpeg');
		pixmap = Amarok.Playlist.trackAt(trackIdx).imagePixmap();
		response.append(pixmapToJPEG(pixmap, ( isThumb ? THUMB_SIZE : false)));
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
	
	imagePath = Amarok.Collection.query('SELECT i.path, u.rpath, d.lastmountpoint FROM images AS i LEFT JOIN urls AS u ON i.path = u.uniqueid LEFT JOIN devices AS d ON d.id = u.deviceid WHERE i.id = '+Amarok.Collection.escape(imageId[0]));
	
	if ( imagePath[0].substring( 0, 18) == 'amarok-sqltrackuid' ) {
		/**
		 * For images with path LIKE 'amarok-sqltrackuid%', we need to extract the cover
		 * image from the ID3v2 tag.
		 */
		pixmap = GetID3.getPixmap(imagePath[2] + imagePath[1].substring(1));
		if ( pixmap.isNull() ) {
			pixmap = new QPixmap();
			noCover = loadFile("/www/img/no-cover.png",false);
			if ( !noCover.isEmpty() ) {
				pixmap.loadFromData(noCover);
			}
		}
	}
	else {
		/**
		 * If no image is included in the ID3v2 tag, we get the image directly form its filesystem path.
		 */
		pixmap = new QPixmap(imagePath[0], '', Qt.AutoColor);
	}
	response.setMimeType('image/jpeg');
	response.append(pixmapToJPEG(pixmap, (isThumb ? THUMB_SIZE : false)));
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
		
		var rating = Amarok.Engine.currentTrack().rating;

		if ( rating == 0 ) { rating = '&mdash;'; }
		else if ( rating == 1 ) { rating = '1&nbsp;<span data-amarok-lang="label_rating_star">&nbsp;</span>'; }
		else { rating = rating + '&nbsp;<span data-amarok-lang="label_rating_stars">&nbsp;</span>'; }

		div = div.replace('###rating###', rating );
		div = div.replace('###artist###', Amarok.Engine.currentTrack().artist);
		div = div.replace('###title###', Amarok.Engine.currentTrack().title);
		div = div.replace('###album###', Amarok.Engine.currentTrack().album);
				// convert to seconds
		length = Amarok.Engine.currentTrack().length/1000;
		minutes = Math.floor(length/60);
		seconds = length-(minutes*60);
		if(seconds.toString().length == 1) { seconds = '0'+seconds; }
		div = div.replace('###minutes###', minutes);
		div = div.replace('###seconds###', seconds);
		div = div.replace('###coverimg###',
		Amarok.Engine.currentTrack().imageUrl == '' ? '/img/no-cover.png' :
			'/img/cover/current.jpg?t='+(new Date()).getTime());
		
		/**
		* Get lyrics from Amarok's DB
		*/
		path = Amarok.Engine.currentTrack().path;
		devicesQuery = Amarok.Collection.query('SELECT lastmountpoint FROM devices');
		nbDevices = devicesQuery.length;
		
		var lyricsSql = '';
		
		// From Amarok 2.5 Changelog: Database structure (lyrics table) was updated...
		if ( compareVersions(Amarok.Info.version() , "2.5.0" ) ) {
			lyricsSql = 'SELECT lyrics FROM lyrics AS l JOIN urls AS u ON l.url = u.id WHERE 0 ';
			for(i=0; i<nbDevices; i++){
// TODO: check compatibility with Win-Amarok
				lyricsSql += ' OR u.rpath = "'+Amarok.Collection.escape(path.replace(devicesQuery[i]+'/','./'))+'"';
			}
		}
		else {
			lyricsSql = 'SELECT lyrics FROM lyrics WHERE 0 ';
			for(i=0; i<nbDevices; i++){
// TODO: check compatibility with Win-Amarok
				lyricsSql += ' OR url = "'+Amarok.Collection.escape(path.replace(devicesQuery[i]+'/','./'))+'"';
			}
		}

		lyricsQuery = Amarok.Collection.query(lyricsSql);
		if ( lyricsQuery.length == 1) {
			div = div.replace('<!--###lyrics###-->', lyricsQuery[0].trim() );
		}
	}
	else {
		div += loadFile('/www/emptyTrack.html');
	}
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
	response.append(div);
	return response;
}

ratingDialog = function(path) {
	response = new HandlerResponse();
	div = loadFile('/www/ratingDialog.html');
	
	currentRating = Amarok.Engine.currentTrack().rating;
	ratingButtons = '';
	for(i=1 ; i<=10 ; i++){
		ratingButtons += '<a href="#" data-inline="true" data-role="button" data-rel="back" data-iconpos="right" data-icon="star" data-amarok-rating="'+i+'"';
		ratingButtons += ' class="' + ( currentRating == i ? 'ui-btn-active' : 'rating-button' ) + '"';
		ratingButtons += '>'+i+'</a>';
	}

	div = div.replace('###title###', Amarok.Engine.currentTrack().title);
	div = div.replace('###stars###', ratingButtons);
	
    response.append(div);
    return response;
}

function currentTrack() {
  return Amarok.Engine.currentTrack();
}

/**
 *  Send div for the current playlist.
 */
playlistDiv = function(path){
    response = new HandlerResponse();
	div = loadFile('/www/playlist.html');
	nbTracks = Amarok.Playlist.totalTrackCount();
	if ( nbTracks == 0 ) {
		div = div.replace('###tracks###', '<li class="empty" data-amarok-lang="error_playlist_empty">&nbsp;</li>');
	}
	else {
		current = Amarok.Playlist.activeIndex();
		tracks = '';
		randColor = -1;	// initialize variable. Will be incremented to 0 for the first coverless album
		prevArtist = '';
		for(trackidx=0; trackidx<nbTracks; trackidx=trackidx+1){
			t = Amarok.Playlist.trackAt(trackidx);
			tracks += '<li class="track'+(current == trackidx ? ' ui-btn-active' : '' )+'"><a href="#" data-amarok-track-id="'+trackidx+'"><img ';
			if ( t.imageUrl != '' ) {
				tracks += 'src="/img/cover/playlist/thumb/'+trackidx+'.jpg?t='+(new Date()).getTime() +'"'
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
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
    response.append(div);
    return response;
}



/**
 *  Send div with all Artists in the collection, filtered alphabetically
 */
collectionArtistsDiv = function(path){
	response = new HandlerResponse();

	var queryFilter = '';
	var argIndex = path.lastIndexOf('/');
	var arg = '';
	if ( argIndex > 0 ) {
		arg = path.substring(argIndex+1, argIndex+2);
		if ( arg == '0' ) {
			queryFilter = ' AND name NOT REGEXP "^[[:alpha:]]"';
			arg = '#'
		}
		else if ( arg.length == 1 ) {
			queryFilter = ' AND name LIKE "'+Amarok.Collection.escape(arg)+'%" COLLATE utf8_general_ci ';
			arg = arg.toUpperCase();
		}
		else {
			arg = '@#!';
		}
	}
	
	searchQuery = 'SELECT a.name, a.id, COUNT(t.id) AS total FROM artists AS a JOIN tracks AS t ON a.id = t.artist WHERE 1 '+queryFilter+' GROUP BY a.id ORDER BY a.name COLLATE utf8_general_ci';
	
	div = collectionFilteredDiv(searchQuery, false);
	div = div.replace('<!-- ###title### -->', '<span data-amarok-lang="title_artists">Artists</span> &ndash; '+arg);
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
    response.append(div);
	
    return response;
}

/**
 *  Send div with all Artists in the collection, filtered by Genre
 */
collectionGenresDiv = function(path){
	response = new HandlerResponse();
	
	var queryFilter = '';
	var argIndex = path.lastIndexOf('/');
	var genreId = 0;
	var genreName = 'Unknown';
	if ( ( argIndex > 0 ) && ( argIndex +1 < path.length ) ) {
		genreId = path.substring(argIndex+1);
		queryFilter = ' AND g.id = ' + Amarok.Collection.escape(genreId);
		
		genreQuery = Amarok.Collection.query( 'SELECT name FROM genres WHERE id = ' + Amarok.Collection.escape(genreId) );
		if ( genreQuery.length != 0 ) {
			if ( genreName.length > 0 ) { genreName = genreQuery[0]; }
		}
		else {
			genreName = '@#!';
		}
	}
	
	searchQuery = 'SELECT a.name, a.id, COUNT(t.id) AS total FROM artists AS a JOIN tracks AS t ON a.id = t.artist JOIN genres AS g ON g.id = t.genre WHERE 1 '+queryFilter+' GROUP BY a.id ORDER BY a.name COLLATE utf8_general_ci';
		
	div = collectionFilteredDiv(searchQuery, genreId);
	div = div.replace('<!-- ###title### -->', genreName);
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
    response.append(div);
    return response;
}

/**
 * Get Artists, filtered alphabetically or by genre
 */
collectionFilteredDiv = function(searchQuery, genreId){

    div = loadFile('/www/collection.html');
	if ( searchQuery != '' ) {
		artists = '';
		artistsQuery = Amarok.Collection.query(searchQuery);
		nbArtists = artistsQuery.length;

		if ( nbArtists == 0 ) {
			artists = '<li data-amarok-lang="error_artists_none">&nbsp;</li>';
		}
		else {
			for(artistidx=0; artistidx<nbArtists; artistidx++){		 
				artist = artistsQuery[artistidx++];
				artistId = artistsQuery[artistidx++];
				tracksCount = artistsQuery[artistidx];
				if (artist.length>0){
					artists += '<li><a href="/collection/artist/'+artistId+''+(genreId > 0 ? '/genre/' + genreId : '' )+'">';
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
	div = div.replace('###artists###', artists);

    return div;
}

/**
 * Send div with all albums from one artist.
 */
collectionArtistAlbumsDiv = function(path){
	indexOfGenre = path.indexOf( '/genre/' );
	genreId = 0;
	if ( indexOfGenre != -1 ) {
		genreId = parseInt(path.substring(indexOfGenre+7));
		path = path.substring(0,indexOfGenre);
	}

    artistId = parseInt(path.substring(path.lastIndexOf('/')+1));
	response = new HandlerResponse();
    div = loadFile('/www/collectionArtistAlbums.html');

	artistQuery = Amarok.Collection.query('SELECT a.name, COUNT(t.id) AS total, g.name AS genre FROM artists AS a JOIN tracks AS t ON t.artist = a.id JOIN genres AS g ON t.genre = g.id WHERE a.id = ' + Amarok.Collection.escape(artistId) + (genreId > 0 ? ' AND g.id = ' + Amarok.Collection.escape(genreId): '' ) + ' GROUP BY a.id');
	Amarok.debug('SELECT a.name, COUNT(t.id) AS total, g.name AS genre FROM artists AS a JOIN tracks AS t ON t.artist = a.id JOIN genres AS g ON t.genre = g.id WHERE a.id = ' + Amarok.Collection.escape(artistId) + (genreId > 0 ? ' AND g.id = ' + Amarok.Collection.escape(genreId): '' ) + ' GROUP BY a.id');
	if ( artistQuery.length > 0 ) {
		artist = artistQuery[0];
		tracksCount = artistQuery[1];
		genre = artistQuery[2];
		
		if ( genre.length == '' ) { genre = '<span data-amarok-lang="title_genre_unknown">&nbsp;</span>'; }
		
		albums = '<li><a href="/collection/artist/tracks/' + artistId + (genreId > 0 ? '/genre/'+genreId : '' ) + '">&ndash; <span data-amarok-lang="artist_all_tracks">&nbsp;</span>' + (genreId > 0 ? ' / ' + genre : '' ) + '<span class="ui-li-count">'+tracksCount +'</span></a></li>';
		
		if ( genreId == 0 ) {
			albumsQuery = Amarok.Collection.query('SELECT name, id, image FROM albums WHERE artist = '+artistId+' ORDER BY name COLLATE utf8_general_ci;');
		}
		else {
			albumsQuery = Amarok.Collection.query('SELECT a.name, a.id, a.image FROM albums AS a JOIN tracks AS t ON a.id = t.album WHERE a.artist = '+artistId+' AND t.genre = ' + Amarok.Collection.escape(genreId) + ' GROUP BY a.id ORDER BY a.name COLLATE utf8_general_ci');
		}
		
		nbAlbums = albumsQuery.length;
		for(albumidx = 0; albumidx<nbAlbums ; albumidx++){
			album = albumsQuery[albumidx++];
			albumId = albumsQuery[albumidx++];
			albumCover = albumsQuery[albumidx];
			if (album.length>0){
				albums += '<li><a href="/collection/artist/album/'+albumId+(genreId > 0 ? '/genre/'+genreId : '' )+'">';
				if ( !isNaN( parseInt(albumCover) ) ) {
					albums += '<img src="/img/cover/collection/thumb/'+albumId+'.jpg" alt="" />';
				}
				else {
					albums += '<img src="/img/no-cover.png" alt="" />';
				}
				albums += album+'</a></li>'+ LINE_BREAK;
			}
		}

		div = div.replace('###artist###', artist + (genreId > 0 ? ' &ndash; '+  genre : '' ));
		div = div.replace('###content###', albums);
	}
	else {
		div = div.replace('###artist###', '<span data-amarok-lang="title_artist">Artist</span> &ndash; @#!');
		div = div.replace('###content###', '<li data-amarok-lang="error_artist_not_found">&nbsp;</li>');
	}

	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
    response.append(div);
    return response;
}

/**
 * Send div with options for a specific album. Currently:
 * -Append tracks from the album to the current playlist.
 * -Replace current playlist with tracks from the album. 
 */
collectionAlbumDiv = function(path){
	indexOfGenre = path.indexOf( '/genre/' );
	genreId = 0;
	if ( indexOfGenre != -1 ) {
		genreId = parseInt(path.substring(indexOfGenre+7));
		path = path.substring(0,indexOfGenre);
	}
	genreName = '<span data-amarok-lang="title_genre_unknown">&nbsp;</span>';
	
    albumId = parseInt(path.substring(path.lastIndexOf('/')+1));
	
	albumQuery = Amarok.Collection.query('SELECT name, artist, image FROM albums WHERE id = '+albumId+';');
	albumName = albumQuery[0];
	artistId = albumQuery[1];
	coverId = albumQuery[2];
	
	artistQuery = Amarok.Collection.query('SELECT name FROM artists WHERE id = '+artistId+';');
	artistName = artistQuery[0];
	
	if ( genreId > 0 ) {
		trackQuery = Amarok.Collection.query('SELECT t.id, t.title, g.id AS genreId, g.name AS genre FROM tracks AS t JOIN genres AS g ON g.id = t.genre WHERE album = '+albumId+' ORDER BY tracknumber, createdate;');
	}
	else {
		trackQuery = Amarok.Collection.query('SELECT id, title FROM tracks WHERE album = '+albumId+' ORDER BY tracknumber, createdate;');
	}

	tracksDiv = '';
	nbTracks = trackQuery.length;
	for(trackidx = 0; trackidx < nbTracks; trackidx++){
		trackId = trackQuery[trackidx++];
		trackName = trackQuery[trackidx];
		tracksDiv += '<li class="track"><a class="track-add-play" href="#" data-amarok-track-id="'+trackId+'">';
		if ( genreId > 0 ) {
			trackidx++;
			currentGenreId = trackQuery[trackidx++];
			currentGenre = trackQuery[trackidx];
			if ( currentGenreId != genreId ) {
				tracksDiv += '<h3 class="light-weight">' + trackName + '</h3>';
				tracksDiv += '<p>' + currentGenre + '</p>';
			}
			else {
				tracksDiv += '<h3>' + trackName + '</h3>';
				genreName = currentGenre;
			}
		}
		else {
			tracksDiv += '<h3>' + trackName + '</h3>';
		}
		tracksDiv += '</a><a class="track-add" href="#" data-amarok-track-id="'+trackId+'" data-amarok-lang="btn_add">&nbsp;</a></li>'+ LINE_BREAK;
	}
	
	response = new HandlerResponse();
    div = loadFile('/www/collectionAlbum.html');
	
	div = div.replace('###album###', albumName);
	div = div.replace('###artist###', artistName + ( genreId > 0 ? ' &ndash; ' + genreName : '' ) );
	div = div.replace('###tracks###', tracksDiv);	
	
	div = div.replace('###coverimg###',
		coverId == '' ? '/img/no-cover.png' :
		'/img/cover/collection/'+albumId+'.jpg' );
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
    response.append(div);
    return response;
}

/**
 * Send div with options for all tracks of one artist. For
 * the options see "collectionAlbumDiv"
 */
collectionAllArtistTracksDiv = function(path){
	indexOfGenre = path.indexOf( '/genre/' );
	genreId = 0;
	if ( indexOfGenre != -1 ) {
		genreId = parseInt(path.substring(indexOfGenre+7));
		path = path.substring(0,indexOfGenre);
	}
	
    artistId = parseInt(path.substring(path.lastIndexOf('/')+1));
	artistQuery = Amarok.Collection.query('SELECT name FROM artists WHERE id = '+artistId+';');
	artistName = artistQuery[0];
	trackQuery = Amarok.Collection.query('SELECT t.id, t.title, a.id AS albumId, a.name AS albumName, a.image AS coverId FROM tracks AS t LEFT JOIN albums AS a ON a.id = t.album WHERE t.artist = '+artistId+(genreId > 0 ? ' AND t.genre = ' + Amarok.Collection.escape(genreId) : '')+' ORDER BY name COLLATE utf8_general_ci, a.id , t.tracknumber;');
	
	tracksDiv = '';
	prevAlbum = '';
	nbTracks = trackQuery.length;
	for(trackidx = 0; trackidx < nbTracks; trackidx++){
		trackId = trackQuery[trackidx++];
		trackName = trackQuery[trackidx++];
		albumId = trackQuery[trackidx++];
		albumName = trackQuery[trackidx++];
		coverId = trackQuery[trackidx];
		
		if ( albumName == '' ) { albumName = 'Unknown'; }
		
		if (  albumName != prevAlbum) {
			tracksDiv += '<li data-role="list-divider"><img '+(coverId == '' ? 'src="/img/no-cover.png" class="no-cover"' :
		'src="/img/cover/collection/thumb/'+albumId + '.jpg"')+' alt="" /><h2>'+ ( albumName == 'Unknown' ? '<span data-amarok-lang="artist_album_unknown">&nbsp;</span>' : '' ) +'</h2></li>'+ LINE_BREAK;
			prevAlbum = albumName ;
		}
		
		tracksDiv += '<li class="track" data-filtertext="'+jsonEscape(albumName+ ' ' + trackName)+'"><a class="track-add-play" href="#" data-amarok-track-id="'+trackId+'"><h3>'+trackName+'</h3></a><a class="track-add" href="#" data-amarok-track-id="'+trackId+'" data-amarok-lang="btn_add">&nbsp;</a></li>'+ LINE_BREAK;
	}

	response = new HandlerResponse();
    div = loadFile('/www/collectionAllArtistTracks.html');

	div = div.replace('###artist###', artistName);
	div = div.replace('###tracks###', tracksDiv);	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));

    response.append(div);
    return response;
}

collectionIndex = function(path) {
    response = new HandlerResponse();
	div = loadFile('/www/collectionIndex.html');	
	
	genreDiv = '';
	if ( Amarok.Collection.totalGenres() > 0 ) {
		genresQuery = Amarok.Collection.query('SELECT g.id, g.name FROM genres AS g JOIN tracks AS t ON g.id = t.genre WHERE TRIM(g.name) != "" GROUP BY g.id ORDER BY g.name COLLATE utf8_general_ci');
		nbGenres = genresQuery.length;
		for(genreidx=0; genreidx<nbGenres; genreidx++){
			genreDiv += '<a data-inline="true" data-role="button" href="/collection/genres/'+genresQuery[genreidx++]+'">'+genresQuery[genreidx]+'</a>';
		}
	}
	div = div.replace( '###genres###' , genreDiv);
	
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
	
	response.append(div);
    return response;
}

homepageDiv = function(path) {
    response = new HandlerResponse();
	div = loadFile('/www/index.html');
	div = loadFile('/www/header.html') + div + loadFile('/www/footer.html').replace('###language###',readConfigV('lang',DEFAULT_CONFIG_LANG));
	
	response.append(div);
    return response;
}