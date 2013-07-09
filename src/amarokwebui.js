/*
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
 *    along with this program.  If not, see <this.httpserver//www.gnu.org/licenses/>.
 */

Importer.loadQtBinding("qt.core");
Importer.loadQtBinding("qt.network");
Importer.loadQtBinding("qt.gui");
Importer.include("configuration.js");
Importer.include("httpserver.js");
Importer.include("util.js");
Importer.include("fileio.js");
Importer.include("amarokctrl.js");
Importer.include("amarokcontent.js");
Importer.include("amarokapi.js");

/*
 * Setup the Amarok Web UI
 * 
 * This is called when the webui main class is created. This class is the main
 * class of the Web UI. It contains the other relevant objects required to
 * provide the service as class members.
 */
function AmarokWebUI() {
  this.configuration = new Configuration( this );
  this.configuration.restoreSettings();
  Amarok.Window.addSettingsMenu( "configureAmarokWebUi", "Amarok Apollo WebUI…" );
  this.configureAction = Amarok.Window.SettingsMenu.configureAmarokWebUi;
  this.configureAction["triggered(bool)"].connect( this, this.configure );
  this.startService();
}

/*
 * Starts the web service
 * 
 * This starts the built-in webserver.
 */
AmarokWebUI.prototype.startService = function() {
  this.http = new HTTPServer( this );
  this.http.setDefaultHandler(fileHandler);
  
  this.http.registerHandler("/img/cover/current", currentTrackCover);
  this.http.registerHandler("/img/cover/playlist", playlistTrackCover);
  this.http.registerHandler("/img/cover/collection", albumCover);

  this.http.registerHandler("/current-track", currentTrackDiv);
  this.http.registerHandler("/rate-me", ratingDialog);
  this.http.registerHandler("/playlist", playlistDiv);
  this.http.registerHandler("/collection/artists", collectionArtistsDiv);
  this.http.registerHandler("/collection/artist/album", collectionAlbumDiv);
  this.http.registerHandler("/collection/artist/tracks", collectionAllArtistTracksDiv);
  this.http.registerHandler("/collection/artist", collectionArtistAlbumsDiv);
  this.http.registerHandler("/collection", collectionIndex);

  this.http.registerHandler("/api/getServerVersion", getServerVersionJSON);
  this.http.registerHandler("/api/getState", getStateJSON);
  this.http.registerHandler("/api/getCurrentTrack", getCurrentTrackJSON);
  this.http.registerHandler("/api/getPlaylistTrackCover", currentTrackCover);
  this.http.registerHandler("/api/getPlaylist", getPlaylistJSON);
  this.http.registerHandler("/api/cmd/clearPlaylist", cmdPlaylistClear);
  this.http.registerHandler("/api/cmd/prev", cmdPrev);
  this.http.registerHandler("/api/cmd/next", cmdNext);
  this.http.registerHandler("/api/cmd/playPause", cmdPlayPause);
  this.http.registerHandler("/api/cmd/playByIndex", cmdPlayByIndex);
  this.http.registerHandler("/api/cmd/play", cmdPlay);
  this.http.registerHandler("/api/cmd/pause", cmdPause);
  this.http.registerHandler("/api/cmd/stop", cmdStop);
  this.http.registerHandler("/api/cmd/increaseVolume", cmdVolumeUp);
  this.http.registerHandler("/api/cmd/decreaseVolume", cmdVolumeDown);
  this.http.registerHandler("/api/cmd/mute", cmdMute);
  this.http.registerHandler("/api/cmd/seek", cmdSetPosition);
  this.http.registerHandler("/api/cmd/addPlayMedia", cmdCollectionPlayByTrackId);
  this.http.registerHandler("/api/cmd/addMedia", cmdCollectionEnqueue);
  this.http.registerHandler("/api/cmd/setRating", cmdSetRating);
  this.http.registerHandler("/api/getCollectionAllArtists", getCollectionAllArtistsJSON);
  this.http.registerHandler("/api/getCollectionTracksByArtistId", getCollectionTracksByArtistIdJSON);
  this.http.registerHandler("/api/getCollectionAlbumsByArtistId", getCollectionAlbumsByArtistIdJSON);
  this.http.registerHandler("/api/getCollectionSearchAll", getCollectionSearchAllJSON);
}

/*
 * Stops the service
 * 
 * This stops the built-in webserver.
 */
AmarokWebUI.prototype.stopService = function() {
  this.http.close();
  this.http = null;
}

/*
 * Restarts the servive (includes stopService+startService)
 */
AmarokWebUI.prototype.restartService = function() {
  this.stopService();
  this.startService();
}

/*
 * Configures the plugin
 * 
 * This shows the configuration dialog which allows the user to setup the
 * plugin. If settings were changed, this will restart the built-in HTTP 
 * server.
 */
AmarokWebUI.prototype.configure = function() {
  if ( this.configuration.configure() == QDialog.Accepted ) {
    this.restartService();
  }
}
